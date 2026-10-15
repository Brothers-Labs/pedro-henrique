import { InjectionToken } from '@angular/core';

import type { AventuraState } from '../models/aventura-state.model';
import { AVENTURA_SCHEMA_VERSION } from '../rules/aventura-game';
import { sanitizeState } from '../rules/sanitize-state';

export const AVENTURA_STORAGE_KEY = `pedro-henrique:pedro-aventura:v${AVENTURA_SCHEMA_VERSION}`;

/**
 * Onde o progresso do Pedro Aventura mora.
 *
 * Hoje é o aparelho. O contrato existe para que uma API (com validação da
 * economia no servidor) entre no lugar sem mudar nenhuma tela: basta outra
 * implementação deste mesmo contrato.
 */
export interface AventuraRepository {
  load(now: Date): AventuraState;
  /** Devolve falso quando não deu para gravar (modo privado, armazenamento cheio). */
  save(state: AventuraState): boolean;
  /** Avisa quando outra aba gravou um progresso novo. Devolve a função que para de ouvir. */
  watch(onChange: (state: AventuraState) => void): () => void;
}

export class LocalStorageAventuraRepository implements AventuraRepository {
  load(now: Date): AventuraState {
    try {
      const raw = localStorage.getItem(AVENTURA_STORAGE_KEY);

      return sanitizeState(raw ? (JSON.parse(raw) as unknown) : null, now);
    } catch (error) {
      // Dado corrompido ou armazenamento bloqueado: o jogo abre do zero, sem quebrar.
      console.warn('Pedro Aventura: não foi possível ler o progresso salvo.', error);

      return sanitizeState(null, now);
    }
  }

  save(state: AventuraState): boolean {
    try {
      localStorage.setItem(AVENTURA_STORAGE_KEY, JSON.stringify(state));

      return true;
    } catch (error) {
      console.warn('Pedro Aventura: o progresso não pôde ser salvo neste aparelho.', error);

      return false;
    }
  }

  watch(onChange: (state: AventuraState) => void): () => void {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const listener = (event: StorageEvent): void => {
      if (event.key === AVENTURA_STORAGE_KEY && event.newValue) {
        try {
          onChange(sanitizeState(JSON.parse(event.newValue) as unknown, new Date()));
        } catch (error) {
          console.warn('Pedro Aventura: progresso de outra aba ilegível; mantendo o desta.', error);
        }
      }
    };

    window.addEventListener('storage', listener);

    return () => window.removeEventListener('storage', listener);
  }
}

export const AVENTURA_REPOSITORY = new InjectionToken<AventuraRepository>('AVENTURA_REPOSITORY', {
  providedIn: 'root',
  factory: () => new LocalStorageAventuraRepository(),
});
