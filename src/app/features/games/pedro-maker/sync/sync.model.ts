import type { CustomLevel } from '../models/level.model';

/**
 * Modelos da sincronização das fases criadas no editor.
 *
 * O aparelho é a fonte da verdade enquanto está desconectado; o servidor só
 * junta o que cada aparelho mandou. Toda mudança local vira uma operação na
 * caixa de saída e sai dela só quando o servidor confirma.
 */

/** Mudança local à espera do servidor; `at` diferencia duas mudanças seguidas da mesma fase. */
export interface SyncOperation {
  readonly kind: 'upsert' | 'delete';
  readonly id: string;
  readonly at: string;
}

/** Exclusão feita em outro aparelho, com a data em que aconteceu. */
export interface RemoteDeletion {
  readonly id: string;
  readonly deletedAt: string;
}

/** O que mudou no servidor desde a última conversa. */
export interface RemoteChanges {
  readonly levels: readonly CustomLevel[];
  readonly deleted: readonly RemoteDeletion[];
  /** Relógio do servidor: é a partir dele que a próxima busca começa. */
  readonly serverTime: string;
}

/** Resultado do envio de uma fase: aceita, ou recusada porque o servidor tem uma mais nova. */
export type UploadResult =
  | { readonly status: 'aceita'; readonly level: CustomLevel }
  | { readonly status: 'conflito'; readonly level: CustomLevel };

export type SyncStatus = 'desligada' | 'sem-codigo' | 'pronta' | 'sincronizando' | 'offline' | 'erro';

/** Porta de saída para o servidor. O serviço não sabe se é REST, fila ou teste. */
export interface LevelSyncGateway {
  fetchChanges(code: string, since: string | null): Promise<RemoteChanges>;
  upload(code: string, level: CustomLevel): Promise<UploadResult>;
  remove(code: string, id: string, deletedAt: string): Promise<void>;
}

/** Erro de conversa com o servidor, já com a frase que a tela pode mostrar. */
export class SyncError extends Error {
  constructor(
    message: string,
    readonly isAuthorization = false,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}
