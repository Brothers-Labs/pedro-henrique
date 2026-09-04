import { Injectable, signal } from '@angular/core';

import type { SavedPhrase } from '../models/communication.model';
import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from '../models/language.model';
import { createId, normalizeText } from '../utils/format';

const STORAGE_KEY = 'pedro-henrique:frases-favoritas';

export const MAX_SAVED_PHRASES_PER_LANGUAGE = 12;

const SEED_PHRASES: readonly SavedPhrase[] = [
  {
    id: 'frase-agua',
    text: 'Eu quero água.',
    language: 'pt-BR',
    createdAt: '2026-05-10T12:00:00.000Z',
  },
  {
    id: 'frase-pausa',
    text: 'Eu preciso de uma pausa.',
    language: 'pt-BR',
    createdAt: '2026-05-10T12:01:00.000Z',
  },
  {
    id: 'frase-abraco',
    text: 'Eu quero um abraço.',
    language: 'pt-BR',
    createdAt: '2026-05-10T12:02:00.000Z',
  },
  {
    id: 'frase-water',
    text: 'I want water.',
    language: 'en-US',
    createdAt: '2026-05-10T12:03:00.000Z',
  },
  {
    id: 'frase-break',
    text: 'I need a break.',
    language: 'en-US',
    createdAt: '2026-05-10T12:04:00.000Z',
  },
  {
    id: 'frase-hug',
    text: 'I want a hug.',
    language: 'en-US',
    createdAt: '2026-05-10T12:05:00.000Z',
  },
];

/**
 * Lê o caderninho guardado no dispositivo.
 *
 * Frases salvas antes da versão bilíngue não têm idioma: são assumidas como
 * português, que era o único idioma que a prancha falava. Devolve `null`
 * quando não há nada aproveitável, para que quem chama decida o que fazer.
 */
export function parseSavedPhrases(raw: string | null): readonly SavedPhrase[] | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isStoredPhrase).map(toSavedPhrase) : null;
  } catch {
    // Storage corrompido: melhor recomeçar dos exemplos do que quebrar a página.
    return null;
  }
}

/**
 * Caderninho de frases favoritas da prancha, guardado no dispositivo.
 *
 * A lista é curta de propósito: uma prancha com dezenas de frases salvas
 * demora mais para ser lida do que montar a frase de novo. O limite vale por
 * idioma, e cada frase só aparece no idioma em que foi montada — uma frase em
 * português lida por uma voz inglesa não sairia compreensível.
 */
@Injectable({ providedIn: 'root' })
export class PhraseBookService {
  private readonly phrasesState = signal<readonly SavedPhrase[]>(
    parseSavedPhrases(readFromStorage()) ?? SEED_PHRASES,
  );

  readonly phrases = this.phrasesState.asReadonly();

  listFor(language: AppLanguage): readonly SavedPhrase[] {
    return this.phrasesState().filter((phrase) => phrase.language === language);
  }

  isFullFor(language: AppLanguage): boolean {
    return this.listFor(language).length >= MAX_SAVED_PHRASES_PER_LANGUAGE;
  }

  has(text: string, language: AppLanguage): boolean {
    const key = toComparableKey(text, language);

    return this.listFor(language).some(
      (phrase) => toComparableKey(phrase.text, language) === key,
    );
  }

  /**
   * Guarda a frase no topo da lista.
   *
   * Frase vazia, repetida ou além do limite é ignorada em silêncio: a UI já
   * desabilita o botão nesses casos, e travar a prancha com um erro no meio de
   * uma conversa seria pior do que não guardar.
   */
  save(text: string, language: AppLanguage): void {
    const clean = normalizeText(text);

    if (!clean || this.has(clean, language) || this.isFullFor(language)) {
      return;
    }

    const phrase: SavedPhrase = {
      id: createId('frase'),
      text: clean,
      language,
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

function toComparableKey(text: string, language: AppLanguage): string {
  return normalizeText(text).toLocaleLowerCase(language);
}

function isStoredPhrase(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate['id'] === 'string' && typeof candidate['text'] === 'string';
}

function toSavedPhrase(stored: Record<string, unknown>): SavedPhrase {
  const language = stored['language'];
  const createdAt = stored['createdAt'];

  return {
    id: String(stored['id']),
    text: String(stored['text']),
    language: isAppLanguage(language) ? language : DEFAULT_LANGUAGE,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  };
}

function readFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Navegador em modo privado: seguimos com os exemplos.
    return null;
  }
}
