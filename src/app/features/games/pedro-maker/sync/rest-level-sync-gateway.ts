import { inject, InjectionToken } from '@angular/core';

import { MAKER_SYNC_ENDPOINT, SYNC_TIMEOUT_MS } from '../config/sync.config';
import type { CustomLevel } from '../models/level.model';
import { sanitizeCustomLevel } from '../services/custom-level.service';
import { type LevelSyncGateway, type RemoteChanges, type RemoteDeletion, SyncError, type UploadResult } from './sync.model';

/** Porta de saída em uso; `null` quando não há servidor configurado. */
export const LEVEL_SYNC_GATEWAY = new InjectionToken<LevelSyncGateway | null>('LEVEL_SYNC_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const endpoint = inject(MAKER_SYNC_ENDPOINT);

    return endpoint ? new RestLevelSyncGateway(endpoint) : null;
  },
});

/**
 * Conversa com o servidor pelo contrato de `docs/pedro-maker-sync-api.md`.
 *
 * Usa o `fetch` do navegador, sem biblioteca. Nada que chega do servidor é
 * aceito às cegas: toda fase passa pela mesma limpeza das fases lidas do
 * aparelho, e o que não tiver conserto é descartado.
 */
export class RestLevelSyncGateway implements LevelSyncGateway {
  constructor(private readonly baseUrl: string) {}

  async fetchChanges(code: string, since: string | null): Promise<RemoteChanges> {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    const body = await this.request(code, 'GET', `/levels${query}`);

    return parseChanges(body);
  }

  async upload(code: string, level: CustomLevel): Promise<UploadResult> {
    const response = await this.send(code, 'PUT', `/levels/${encodeURIComponent(level.id)}`, level);

    if (response.status === 409) {
      const conflict = (await readJson(response)) as { level?: unknown } | null;
      const newer = sanitizeCustomLevel(conflict?.level);

      if (!newer) {
        throw new SyncError('O servidor recusou a fase sem explicar o motivo.');
      }

      return { status: 'conflito', level: newer };
    }

    ensureOk(response);

    return { status: 'aceita', level: sanitizeCustomLevel(await readJson(response)) ?? level };
  }

  async remove(code: string, id: string, deletedAt: string): Promise<void> {
    const response = await this.send(
      code,
      'DELETE',
      `/levels/${encodeURIComponent(id)}?deletedAt=${encodeURIComponent(deletedAt)}`,
    );

    // A fase já não existir no servidor é o resultado que se queria.
    if (response.status !== 404) {
      ensureOk(response);
    }
  }

  private async request(code: string, method: string, path: string): Promise<unknown> {
    const response = await this.send(code, method, path);

    ensureOk(response);

    return readJson(response);
  }

  private async send(code: string, method: string, path: string, body?: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${code}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new SyncError(
        controller.signal.aborted
          ? 'O servidor demorou demais para responder.'
          : 'Não foi possível falar com o servidor agora.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function ensureOk(response: Response): void {
  if (response.status === 401 || response.status === 403) {
    throw new SyncError('O servidor não reconheceu o código de sincronização.', true);
  }

  if (!response.ok) {
    throw new SyncError(`O servidor respondeu com erro (${response.status}).`);
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new SyncError('O servidor mandou uma resposta que não dá para ler.');
  }
}

/** Valida a resposta de mudanças; formato inesperado vira erro, não dado estranho. */
export function parseChanges(value: unknown): RemoteChanges {
  if (typeof value !== 'object' || value === null) {
    throw new SyncError('O servidor mandou uma resposta que não dá para ler.');
  }

  const candidate = value as { levels?: unknown; deleted?: unknown; serverTime?: unknown };

  if (typeof candidate.serverTime !== 'string' || Number.isNaN(Date.parse(candidate.serverTime))) {
    throw new SyncError('O servidor não informou a hora da resposta.');
  }

  return {
    serverTime: candidate.serverTime,
    levels: Array.isArray(candidate.levels)
      ? candidate.levels.map(sanitizeCustomLevel).filter((level): level is CustomLevel => level !== null)
      : [],
    deleted: Array.isArray(candidate.deleted) ? candidate.deleted.filter(isDeletion) : [],
  };
}

function isDeletion(value: unknown): value is RemoteDeletion {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Record<keyof RemoteDeletion, unknown>>;

  return typeof candidate.id === 'string' && typeof candidate.deletedAt === 'string';
}
