import { Injectable, signal } from '@angular/core';

import { findLevelProblems, LEVEL_PROBLEM_MESSAGES } from '../levels/level-layout';
import type { LevelTheme, PedrereLevel } from '../models/level.model';

const STORAGE_KEY = 'pedro-henrique:pedro-pedrere:levels:v1';

export const MAX_CUSTOM_LEVELS = 20;
export const MAX_LEVEL_NAME_LENGTH = 24;
export const DEFAULT_LEVEL_NAME = 'Minha fase';
export const CUSTOM_LEVEL_PREFIX = 'minha-';

const LEVEL_THEMES: readonly LevelTheme[] = ['campo', 'praia', 'noite', 'neve'];

export type LevelDraft = Omit<PedrereLevel, 'id'>;

export type SaveLevelOutcome =
  | { readonly isSaved: true; readonly level: PedrereLevel }
  | { readonly isSaved: false; readonly messages: readonly string[] };

export function isLevelTheme(value: unknown): value is LevelTheme {
  return LEVEL_THEMES.some((theme) => theme === value);
}

/** Nome limpo e com tamanho seguro; o nome padrão quando não sobra nada. */
export function normalizeLevelName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_LEVEL_NAME_LENGTH) || DEFAULT_LEVEL_NAME;
}

/**
 * Lê as fases guardadas, descartando qualquer uma que não possa ser jogada.
 *
 * O storage é entrada externa: pode vir de uma versão antiga do jogo ou ter
 * sido editado à mão. Uma fase estragada some; as outras continuam.
 */
export function parseStoredLevels(raw: string | null): readonly PedrereLevel[] {
  if (raw === null) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .flatMap((entry: unknown) => {
      const level = toStoredLevel(entry);

      return level ? [level] : [];
    })
    .slice(0, MAX_CUSTOM_LEVELS);
}

/**
 * As fases que o Pedro cria no modo maker, guardadas no aparelho.
 *
 * Uma fase longa tem menos de dois mil caracteres, então vinte cabem com
 * folga no `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class PedrereLevelsService {
  private readonly levelsState = signal<readonly PedrereLevel[]>(parseStoredLevels(readStorage()));

  readonly levels = this.levelsState.asReadonly();

  find(levelId: string): PedrereLevel | null {
    return this.levelsState().find((level) => level.id === levelId) ?? null;
  }

  /** Cria a fase, ou atualiza a de `levelId` quando ela existe. */
  save(draft: LevelDraft, levelId?: string): SaveLevelOutcome {
    const problems = findLevelProblems(draft.rows);

    if (problems.length > 0) {
      return { isSaved: false, messages: problems.map((problem) => LEVEL_PROBLEM_MESSAGES[problem]) };
    }

    const existing = levelId ? this.find(levelId) : null;

    if (!existing && this.levelsState().length >= MAX_CUSTOM_LEVELS) {
      return {
        isSaved: false,
        messages: [`Você já tem ${MAX_CUSTOM_LEVELS} fases. Apague uma para criar outra.`],
      };
    }

    const level: PedrereLevel = {
      id: existing?.id ?? createLevelId(),
      name: normalizeLevelName(draft.name),
      theme: draft.theme,
      rows: [...draft.rows],
    };
    const levels = existing
      ? this.levelsState().map((current) => (current.id === level.id ? level : current))
      : [...this.levelsState(), level];

    this.commit(levels);

    return { isSaved: true, level };
  }

  remove(levelId: string): void {
    this.commit(this.levelsState().filter((level) => level.id !== levelId));
  }

  private commit(levels: readonly PedrereLevel[]): void {
    this.levelsState.set(levels);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
    } catch (error) {
      console.warn('Pedro Pedrerê: não foi possível guardar as fases neste aparelho.', error);
    }
  }
}

function createLevelId(): string {
  return `${CUSTOM_LEVEL_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function toStoredLevel(entry: unknown): PedrereLevel | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  const { id, name, theme, rows } = entry as Readonly<Record<string, unknown>>;

  if (
    typeof id !== 'string' ||
    !id.startsWith(CUSTOM_LEVEL_PREFIX) ||
    typeof name !== 'string' ||
    !isLevelTheme(theme) ||
    !Array.isArray(rows) ||
    !rows.every((row): row is string => typeof row === 'string') ||
    findLevelProblems(rows).length > 0
  ) {
    return null;
  }

  return { id, name: normalizeLevelName(name), theme, rows };
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
