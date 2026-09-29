import { computed, inject, Injectable, signal } from '@angular/core';

import { IndexedDbService, MAKER_LEVEL_STORE } from '../../../../core/services/indexed-db.service';
import { createId } from '../../../../core/utils/format';
import { EDITOR_THEMES } from '../config/object-catalog';
import { LEVEL_LIMITS, sanitizeLevelObject } from '../levels/level-validation';
import type { CustomLevel, LevelBlueprint, LevelObject } from '../models/level.model';

export type CustomLevelStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Rascunho vindo do editor: o serviço completa datas e id. */
export interface CustomLevelDraft {
  readonly id: string | null;
  readonly name: string;
  readonly theme: CustomLevel['theme'];
  readonly width: number;
  readonly height: number;
  readonly objects: readonly LevelObject[];
}

const MAX_NAME_LENGTH = 40;

/**
 * As fases que o Pedro cria no editor.
 *
 * Vivem no IndexedDB do aparelho, como os desenhos: o site não tem backend e
 * nada sai daqui. O formato já é o mesmo que um backend receberia, para que
 * sincronizar no futuro seja trocar a gravação, e não o modelo.
 */
@Injectable({ providedIn: 'root' })
export class CustomLevelService {
  private readonly database = inject(IndexedDbService);

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
      // Mudar a fase exige vencê-la de novo para valer como concluída.
      completed: false,
      bestStars: 0,
    };

    await this.database.put(MAKER_LEVEL_STORE, level);
    this.upsert(level);

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
  }

  /** Marca a fase como vencida, guardando a melhor quantidade de estrelas. */
  async recordCompletion(id: string, stars: number): Promise<void> {
    const level = await this.find(id);

    if (!level) {
      return;
    }

    const updated: CustomLevel = { ...level, completed: true, bestStars: Math.max(level.bestStars, stars) };

    await this.database.put(MAKER_LEVEL_STORE, updated);
    this.upsert(updated);
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
  };
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
    completed: stored.completed === true,
    bestStars:
      typeof stored.bestStars === 'number' ? Math.min(3, Math.max(0, Math.trunc(stored.bestStars))) : 0,
  };
}

function cleanName(name: string, position: number): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);

  return trimmed || `Fase do Pedro #${position}`;
}

function byNewestFirst(first: CustomLevel, second: CustomLevel): number {
  return second.updatedAt.localeCompare(first.updatedAt);
}
