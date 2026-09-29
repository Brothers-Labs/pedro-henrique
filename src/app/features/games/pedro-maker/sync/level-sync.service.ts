import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { SYNC_CODE_PATTERN, SYNC_DEBOUNCE_MS } from '../config/sync.config';
import { CustomLevelService } from '../services/custom-level.service';
import { LEVEL_SYNC_GATEWAY } from './rest-level-sync-gateway';
import { SyncOutbox } from './sync-outbox';
import { type LevelSyncGateway, SyncError, type SyncStatus } from './sync.model';

const STORAGE_KEY = 'pedro-henrique:pedro-maker:sync:v1';

interface SyncPreferences {
  /** Código que liga os aparelhos da família à mesma coleção de fases. */
  readonly code: string | null;
  /** Relógio do servidor na última busca; `null` quando nunca buscou com este código. */
  readonly lastPulledAt: string | null;
  readonly lastSyncedAt: string | null;
}

const EMPTY_PREFERENCES: SyncPreferences = { code: null, lastPulledAt: null, lastSyncedAt: null };

/**
 * Sincronização das fases criadas no editor.
 *
 * Uma rodada tem sempre a mesma ordem: primeiro esvazia a caixa de saída
 * (envia o que mudou aqui), depois busca o que mudou no servidor desde a
 * última vez. Conflito se resolve pela data de edição — a versão mais nova
 * vence, venha de onde vier — e o servidor tem a palavra final no envio.
 *
 * Sem servidor configurado, ou sem código, nada disso roda e o editor segue
 * funcionando só no aparelho. Uma falha nunca apaga nada: a fila fica como
 * está e a próxima rodada tenta de novo.
 */
@Injectable({ providedIn: 'root' })
export class LevelSyncService {
  private readonly gateway = inject(LEVEL_SYNC_GATEWAY);
  private readonly levels = inject(CustomLevelService);
  private readonly outbox = inject(SyncOutbox);

  private readonly preferences = signal<SyncPreferences>(readPreferences());
  private readonly isRunning = signal(false);
  private readonly failure = signal<string | null>(null);
  private readonly wasOffline = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private isRerunRequested = false;

  readonly isConfigured = this.gateway !== null;
  readonly code = computed(() => this.preferences().code);
  readonly lastSyncedAt = computed(() => this.preferences().lastSyncedAt);
  readonly pendingCount = this.outbox.size;
  readonly errorMessage = this.failure.asReadonly();

  readonly status = computed<SyncStatus>(() => {
    if (!this.isConfigured) {
      return 'desligada';
    }

    if (!this.preferences().code) {
      return 'sem-codigo';
    }

    if (this.isRunning()) {
      return 'sincronizando';
    }

    if (this.failure()) {
      return this.wasOffline() ? 'offline' : 'erro';
    }

    return 'pronta';
  });

  constructor() {
    // Toda mudança na fila agenda uma rodada, juntando edições seguidas num envio.
    effect(() => {
      this.outbox.operations();
      untracked(() => this.schedule());
    });

    const onOnline = (): void => void this.syncNow();

    window.addEventListener('online', onOnline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', onOnline);
      this.cancelSchedule();
    });
  }

  /** Liga este aparelho a um código. Devolve falso se o código não tem o formato certo. */
  connect(code: string): boolean {
    const trimmed = code.trim();

    if (!SYNC_CODE_PATTERN.test(trimmed)) {
      return false;
    }

    // Código novo, conversa nova: tudo é enviado e tudo é buscado de novo.
    this.save({ code: trimmed, lastPulledAt: null, lastSyncedAt: null });
    this.failure.set(null);
    void this.syncNow();

    return true;
  }

  /** Código novo e difícil de adivinhar, para o primeiro aparelho da família. */
  generateCode(): string {
    return crypto.randomUUID();
  }

  disconnect(): void {
    this.cancelSchedule();
    this.save(EMPTY_PREFERENCES);
    this.failure.set(null);
  }

  /**
   * Sincroniza agora e resolve quando terminar.
   *
   * Chamado durante uma rodada, devolve a rodada em andamento e pede mais uma
   * logo depois — o que mudou no meio do caminho não fica para trás.
   */
  syncNow(): Promise<void> {
    if (!this.gateway || !this.preferences().code) {
      return Promise.resolve();
    }

    if (this.inFlight) {
      this.isRerunRequested = true;
      return this.inFlight;
    }

    this.cancelSchedule();
    this.inFlight = this.runRounds().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async runRounds(): Promise<void> {
    do {
      this.isRerunRequested = false;
      await this.round();
    } while (this.isRerunRequested && this.failure() === null);
  }

  /** Uma rodada completa: envia a fila e depois busca as novidades do servidor. */
  private async round(): Promise<void> {
    const gateway = this.gateway;
    const code = this.preferences().code;

    if (!gateway || !code) {
      return;
    }

    this.isRunning.set(true);
    this.failure.set(null);

    try {
      if (this.preferences().lastPulledAt === null) {
        await this.queueEverything();
      }

      await this.push(gateway, code);
      await this.pull(gateway, code);
      this.save({ ...this.preferences(), lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      console.warn('Pedro Maker: a sincronização das fases falhou.', error);
      this.wasOffline.set(typeof navigator !== 'undefined' && navigator.onLine === false);
      this.failure.set(error instanceof SyncError ? error.message : 'Não foi possível sincronizar agora.');
    } finally {
      this.isRunning.set(false);
    }
  }

  /** Primeira rodada com um código: todas as fases do aparelho entram na fila. */
  private async queueEverything(): Promise<void> {
    await this.levels.load();

    const pendingDeletes = new Set(
      this.outbox.operations().filter((operation) => operation.kind === 'delete').map((operation) => operation.id),
    );

    for (const level of this.levels.levels()) {
      if (!pendingDeletes.has(level.id)) {
        this.outbox.enqueue({ kind: 'upsert', id: level.id, at: level.updatedAt });
      }
    }
  }

  private async push(gateway: LevelSyncGateway, code: string): Promise<void> {
    for (const operation of [...this.outbox.operations()]) {
      if (operation.kind === 'delete') {
        await gateway.remove(code, operation.id, operation.at);
        this.outbox.acknowledge(operation);
        continue;
      }

      const level = await this.levels.find(operation.id);

      if (level) {
        const result = await gateway.upload(code, level);

        if (result.status === 'conflito') {
          await this.levels.applyRemote(result.level);
        }
      }

      this.outbox.acknowledge(operation);
    }
  }

  private async pull(gateway: LevelSyncGateway, code: string): Promise<void> {
    const changes = await gateway.fetchChanges(code, this.preferences().lastPulledAt);
    // O que mudou aqui durante a rodada ainda vai subir: não pode ser sobrescrito agora.
    const pendingIds = new Set(this.outbox.operations().map((operation) => operation.id));

    for (const level of changes.levels) {
      if (!pendingIds.has(level.id)) {
        await this.levels.applyRemote(level);
      }
    }

    for (const deletion of changes.deleted) {
      if (!pendingIds.has(deletion.id)) {
        await this.levels.applyRemoteDeletion(deletion.id, deletion.deletedAt);
      }
    }

    this.save({ ...this.preferences(), lastPulledAt: changes.serverTime });
  }

  private schedule(): void {
    if (!this.isConfigured || !this.preferences().code) {
      return;
    }

    this.cancelSchedule();
    this.timer = setTimeout(() => void this.syncNow(), SYNC_DEBOUNCE_MS);
  }

  private cancelSchedule(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private save(preferences: SyncPreferences): void {
    this.preferences.set(preferences);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Pedro Maker: as preferências de sincronização não puderam ser gravadas.', error);
    }
  }
}

function readPreferences(): SyncPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SyncPreferences> | null;

    if (!parsed || typeof parsed !== 'object') {
      return EMPTY_PREFERENCES;
    }

    const code = typeof parsed.code === 'string' && SYNC_CODE_PATTERN.test(parsed.code) ? parsed.code : null;

    return {
      code,
      lastPulledAt: code && typeof parsed.lastPulledAt === 'string' ? parsed.lastPulledAt : null,
      lastSyncedAt: code && typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    // Preferência ilegível: o aparelho volta a funcionar só localmente até ganhar um código.
    return EMPTY_PREFERENCES;
  }
}
