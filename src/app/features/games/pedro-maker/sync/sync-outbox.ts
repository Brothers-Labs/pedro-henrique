import { computed, Injectable, signal } from '@angular/core';

import type { SyncOperation } from './sync.model';

const STORAGE_KEY = 'pedro-henrique:pedro-maker:sync-outbox:v1';

/**
 * Caixa de saída da sincronização: o que mudou no aparelho e o servidor ainda
 * não confirmou.
 *
 * Mora no `localStorage`, e não na memória, porque a criança fecha a aba sem
 * aviso: a fase salva no editor precisa continuar na fila até chegar ao
 * servidor, nem que seja amanhã. Cada fase tem no máximo uma operação na fila —
 * a mais recente vale pelas anteriores.
 */
@Injectable({ providedIn: 'root' })
export class SyncOutbox {
  private readonly state = signal<readonly SyncOperation[]>(readOutbox());

  readonly operations = this.state.asReadonly();
  readonly size = computed(() => this.state().length);

  enqueue(operation: SyncOperation): void {
    this.write([...this.state().filter((pending) => pending.id !== operation.id), operation]);
  }

  /**
   * Retira a operação confirmada — só se ela ainda for a mesma que foi enviada.
   * Se a fase mudou de novo durante o envio, a operação nova fica na fila.
   */
  acknowledge(operation: SyncOperation): void {
    this.write(this.state().filter((pending) => !sameOperation(pending, operation)));
  }

  private write(operations: readonly SyncOperation[]): void {
    this.state.set(operations);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
    } catch (error) {
      console.warn('Pedro Maker: a fila de sincronização não pôde ser gravada.', error);
    }
  }
}

function sameOperation(first: SyncOperation, second: SyncOperation): boolean {
  return first.kind === second.kind && first.id === second.id && first.at === second.at;
}

function readOutbox(): readonly SyncOperation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;

    return Array.isArray(parsed) ? parsed.filter(isOperation) : [];
  } catch {
    // Fila ilegível: a primeira sincronização reenviará todas as fases de qualquer forma.
    return [];
  }
}

function isOperation(value: unknown): value is SyncOperation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Record<'kind' | 'id' | 'at', unknown>>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.at === 'string' &&
    (candidate.kind === 'upsert' || candidate.kind === 'delete')
  );
}
