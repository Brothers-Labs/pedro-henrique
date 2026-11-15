import { computed, inject, Injectable, signal } from '@angular/core';

import { IndexedDbService, MAKER_LEVEL_STORE } from '../../../../core/services/indexed-db.service';
import { createId } from '../../../../core/utils/format';
import { EDITOR_THEMES } from '../config/object-catalog';
import { isScreenMode, type ScreenMode } from '../config/screen.config';
import { LEVEL_LIMITS, sanitizeLevelObject } from '../levels/level-validation';
import type { CustomLevel, LevelBlueprint, LevelObject } from '../models/level.model';
import { SyncOutbox } from '../sync/sync-outbox';

export type CustomLevelStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Rascunho vindo do editor: o serviço completa datas e id. */
export interface CustomLevelDraft {
  readonly id: string | null;
  readonly name: string;
  readonly theme: CustomLevel['theme'];
  readonly width: number;
  readonly height: number;
  readonly objects: readonly LevelObject[];
  /** Tela da aba Telas; sem ela, a fase usa a tela dos ajustes de quem joga. */
  readonly screen?: ScreenMode;
}

const MAX_NAME_LENGTH = 40;

/**
 * As fases que o Pedro cria no editor.
 *
 * Vivem no IndexedDB do aparelho, como os desenhos. Toda mudança feita aqui
 * também entra na caixa de saída da sincronização; quando há um servidor
 * configurado, o `LevelSyncService` leva a fila até ele. As mudanças que
 * chegam do servidor entram por `applyRemote`, que não volta para a fila.
 */
@Injectable({ providedIn: 'root' })
export class CustomLevelService {
  private readonly database = inject(IndexedDbService);
  private readonly outbox = inject(SyncOutbox);

  private readonly levelsState = signal<readonly CustomLevel[]>([]);
  private readonly statusState = signal<CustomLevelStatus>('idle');
  private loading: Promise<void> | null = null;

  readonly levels = this.levelsState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly isEmpty = computed(() => this.statusState() === 'ready' && this.levelsState().length === 0);

  /** Carrega uma vez só; chamadas seguintes esperam a mesma leitura. */
  load(): Promise<void> {
    this.loading ??= this.readAll();

    return this.loading;
  }

  async find(id: string): Promise<CustomLevel | null> {
    await this.load();

    return this.levelsState().find((level) => level.id === id) ?? null;
  }

  async save(draft: CustomLevelDraft): Promise<CustomLevel> {
    await this.load();

    const now = new Date().toISOString();
    const existing = draft.id ? this.levelsState().find((level) => level.id === draft.id) : undefined;
    const level: CustomLevel = {
      id: existing?.id ?? createId('fase'),
      name: cleanName(draft.name, this.levelsState().length + 1),
      theme: draft.theme,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      width: draft.width,
      height: draft.height,
      objects: draft.objects,
      ...(draft.screen ? { screen: draft.screen } : {}),
      // Mudar a fase exige vencê-la de novo para valer como concluída.
      completed: false,
      bestStars: 0,
      // Editar uma fase secreta já achada não a tranca de novo.
      secretUnlocked: existing?.secretUnlocked ?? false,
    };

    await this.database.put(MAKER_LEVEL_STORE, level);
    this.upsert(level);
    this.outbox.enqueue({ kind: 'upsert', id: level.id, at: level.updatedAt });

    return level;
  }

  async duplicate(id: string): Promise<CustomLevel | null> {
    const original = await this.find(id);

    if (!original) {
      return null;
    }

    return this.save({ ...original, id: null, name: `${original.name} (cópia)`.slice(0, MAX_NAME_LENGTH) });
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(MAKER_LEVEL_STORE, id);
    this.levelsState.update((levels) => levels.filter((level) => level.id !== id));
    this.outbox.enqueue({ kind: 'delete', id, at: new Date().toISOString() });
  }

  /** Marca a fase como vencida, guardando a melhor quantidade de estrelas. */
  async recordCompletion(id: string, stars: number): Promise<void> {
    const level = await this.find(id);

    if (!level) {
      return;
    }

    // A data muda junto: é ela que decide qual versão vence entre dois aparelhos.
    const updated: CustomLevel = {
      ...level,
      completed: true,
      bestStars: Math.max(level.bestStars, stars),
      updatedAt: new Date().toISOString(),
    };

    await this.database.put(MAKER_LEVEL_STORE, updated);
    this.upsert(updated);
    this.outbox.enqueue({ kind: 'upsert', id, at: updated.updatedAt });
  }

  /**
   * Destranca a fase secreta: a porta dourada de outra fase levou até ela.
   * Devolve `true` só na primeira vez, para a tela comemorar uma vez.
   */
  async unlockSecret(id: string): Promise<boolean> {
    const level = await this.find(id);

    if (!level || level.secretUnlocked) {
      return false;
    }

    const updated: CustomLevel = { ...level, secretUnlocked: true, updatedAt: new Date().toISOString() };

    await this.database.put(MAKER_LEVEL_STORE, updated);
    this.upsert(updated);
    this.outbox.enqueue({ kind: 'upsert', id, at: updated.updatedAt });

    return true;
  }

  /**
   * Grava uma fase que veio do servidor.
   *
   * Só substitui a local se a do servidor for mais nova; nunca entra na caixa
   * de saída, senão a fase voltaria para o servidor de onde acabou de sair.
   */
  async applyRemote(level: CustomLevel): Promise<boolean> {
    const local = await this.find(level.id);

    if (local && timeOf(local.updatedAt) >= timeOf(level.updatedAt)) {
      return false;
    }

    await this.database.put(MAKER_LEVEL_STORE, level);
    this.upsert(level);

    return true;
  }

  /** Apaga uma fase excluída em outro aparelho, a menos que ela tenha sido editada aqui depois. */
  async applyRemoteDeletion(id: string, deletedAt: string): Promise<boolean> {
    const local = await this.find(id);

    if (!local || timeOf(local.updatedAt) > timeOf(deletedAt)) {
      return false;
    }

    await this.database.delete(MAKER_LEVEL_STORE, id);
    this.levelsState.update((levels) => levels.filter((level) => level.id !== id));

    return true;
  }

  private async readAll(): Promise<void> {
    this.statusState.set('loading');

    try {
      const stored = await this.database.getAll<unknown>(MAKER_LEVEL_STORE);
      const levels = stored
        .map(sanitizeCustomLevel)
        .filter((level): level is CustomLevel => level !== null)
        .sort(byNewestFirst);

      this.levelsState.set(levels);
      this.statusState.set('ready');
    } catch (error) {
      console.error('Pedro Maker: não foi possível abrir as fases salvas.', error);
      this.statusState.set('error');
      // Uma próxima tentativa volta a ler, em vez de reaproveitar a falha.
      this.loading = null;
    }
  }

  private upsert(level: CustomLevel): void {
    this.levelsState.update((levels) =>
      [level, ...levels.filter((candidate) => candidate.id !== level.id)].sort(byNewestFirst),
    );
  }
}

/** Planta jogável de uma fase criada, no mesmo formato da campanha. */
export function customLevelBlueprint(level: CustomLevel): LevelBlueprint {
  return {
    id: level.id,
    name: level.name,
    theme: level.theme,
    width: level.width,
    height: level.height,
    objects: level.objects,
    targetTimeSeconds: Math.round(level.width * 0.6),
    ...(level.screen ? { screen: level.screen } : {}),
  };
}

/**
 * Fases secretas ainda trancadas: as escolhidas pela porta dourada de outra
 * fase e que o Pedro ainda não destrancou passando por ela.
 */
export function lockedSecretLevelIds(levels: readonly CustomLevel[]): ReadonlySet<string> {
  const targets = new Set(
    levels.flatMap((level) =>
      level.objects
        .filter((object) => object.type === 'golden-door' && object.properties?.secretLevel !== undefined)
        .map((object) => object.properties?.secretLevel)
        .filter((target): target is string => target !== undefined && target !== level.id),
    ),
  );

  return new Set(levels.filter((level) => targets.has(level.id) && !level.secretUnlocked).map((level) => level.id));
}

/**
 * Normaliza uma fase vinda do banco.
 *
 * Fase com tamanho impossível é descartada inteira; objeto estranho some sem
 * levar o resto da fase junto.
 */
export function sanitizeCustomLevel(value: unknown): CustomLevel | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const stored = value as Partial<CustomLevel>;
  const width = stored.width;
  const height = stored.height;

  if (
    typeof stored.id !== 'string' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < LEVEL_LIMITS.minWidth ||
    width > LEVEL_LIMITS.maxWidth ||
    height < LEVEL_LIMITS.minHeight ||
    height > LEVEL_LIMITS.maxHeight
  ) {
    return null;
  }

  const objects = Array.isArray(stored.objects)
    ? stored.objects
        .slice(0, LEVEL_LIMITS.maxObjects)
        .map((object: unknown) => sanitizeLevelObject(object, width, height))
        .filter((object): object is LevelObject => object !== null)
    : [];

  return {
    id: stored.id,
    name: cleanName(typeof stored.name === 'string' ? stored.name : '', 1),
    theme: EDITOR_THEMES.find((theme) => theme === stored.theme) ?? 'vale',
    createdAt: typeof stored.createdAt === 'string' ? stored.createdAt : new Date(0).toISOString(),
    updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : new Date(0).toISOString(),
    width,
    height,
    objects,
    // Tela desconhecida (de uma versão futura, por exemplo) vira "a dos ajustes", sem perder a fase.
    ...(isScreenMode(stored.screen) ? { screen: stored.screen } : {}),
    completed: stored.completed === true,
    bestStars:
      typeof stored.bestStars === 'number' ? Math.min(3, Math.max(0, Math.trunc(stored.bestStars))) : 0,
    secretUnlocked: stored.secretUnlocked === true,
  };
}

function cleanName(name: string, position: number): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);

  return trimmed || `Fase do Pedro #${position}`;
}

/** Momento de uma data ISO; data ilegível conta como a mais antiga possível. */
function timeOf(iso: string): number {
  const time = Date.parse(iso);

  return Number.isNaN(time) ? 0 : time;
}

function byNewestFirst(first: CustomLevel, second: CustomLevel): number {
  return second.updatedAt.localeCompare(first.updatedAt);
}
