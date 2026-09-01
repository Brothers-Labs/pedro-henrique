import { computed, Injectable, signal } from '@angular/core';

import type { SavedPhrase } from '../models/communication.model';
import { createId, normalizeText } from '../utils/format';

const STORAGE_KEY = 'pedro-henrique:frases-favoritas';

export const MAX_SAVED_PHRASES = 12;

const SEED_PHRASES: readonly SavedPhrase[] = [
  {
    id: 'frase-agua',
    text: 'Eu quero água.',
    createdAt: '2026-05-10T12:00:00.000Z',
  },
  {
    id: 'frase-pausa',
    text: 'Eu preciso de uma pausa.',
    createdAt: '2026-05-10T12:01:00.000Z',
  },
  {
    id: 'frase-abraco',
    text: 'Eu quero um abraço.',
    createdAt: '2026-05-10T12:02:00.000Z',
  },
];

/**
 * Caderninho de frases favoritas da prancha, guardado no dispositivo.
 *
 * A lista é curta de propósito: uma prancha com dezenas de frases salvas
 * demora mais para ser lida do que montar a frase de novo.
 */
@Injectable({ providedIn: 'root' })
export class PhraseBookService {
  private readonly phrasesState = signal<readonly SavedPhrase[]>(readFromStorage());

  readonly phrases = this.phrasesState.asReadonly();
  readonly isFull = computed(() => this.phrasesState().length >= MAX_SAVED_PHRASES);

  has(text: string): boolean {
    const key = toComparableKey(text);
    return this.phrasesState().some((phrase) => toComparableKey(phrase.text) === key);
  }

  /**
   * Guarda a frase no topo da lista.
   *
   * Frase vazia, repetida ou além do limite é ignorada em silêncio: a UI já
   * desabilita o botão nesses casos, e travar a prancha com um erro no meio de
   * uma conversa seria pior do que não guardar.
   */
  save(text: string): void {
    const clean = normalizeText(text);

    if (!clean || this.has(clean) || this.isFull()) {
      return;
    }

    const phrase: SavedPhrase = {
      id: createId('frase'),
      text: clean,
      createdAt: new Date().toISOString(),
    };

    this.phrasesState.update((phrases) => [phrase, ...phrases]);
    this.persist();
  }

  remove(id: string): void {
    this.phrasesState.update((phrases) => phrases.filter((phrase) => phrase.id !== id));
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.phrasesState()));
    } catch {
      // Persistir é um extra; a prancha continua funcionando na sessão atual.
    }
  }
}

function toComparableKey(text: string): string {
  return normalizeText(text).toLocaleLowerCase('pt-BR');
}

function readFromStorage(): readonly SavedPhrase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return SEED_PHRASES;
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedPhrase[]) : SEED_PHRASES;
  } catch {
    // Navegador em modo privado ou storage corrompido: seguimos com os exemplos.
    return SEED_PHRASES;
  }
}
