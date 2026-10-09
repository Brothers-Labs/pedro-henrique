import { Injectable, signal } from '@angular/core';

import { ADVENTURE_CURIOSITIES } from '../config/adventure-curiosities.config';
import { ADVENTURE_RULES } from '../config/adventure-rules.config';
import { ADVENTURE_WORLDS } from '../config/adventure-worlds.config';
import { createAdventureProgress } from '../engine/adventure-progression';
import type { AdventureProgress, CuriosityRecord, LevelRecord } from '../models/adventure.model';

const STORAGE_KEY = `pedro-henrique:adventure:v${ADVENTURE_RULES.schemaVersion}`;

const KNOWN_LEVELS = new Set(ADVENTURE_WORLDS.flatMap((world) => world.levels.map((level) => level.id)));
const KNOWN_CURIOSITIES = new Set(ADVENTURE_CURIOSITIES.map((curiosity) => curiosity.id));

/**
 * Progresso da Aventura guardado no aparelho.
 *
 * Só guarda e lê: nenhuma regra mora aqui. Como os outros progressos do site,
 * vive no `localStorage` e sobrevive a recarregar a página; sem storage
 * (modo privado, pré-renderização) a jornada vale para a sessão atual.
 */
@Injectable({ providedIn: 'root' })
export class AdventureProgressService {
  private readonly state = signal<AdventureProgress>(loadProgress());

  readonly progress = this.state.asReadonly();

  save(progress: AdventureProgress): void {
    this.state.set(progress);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Navegador em modo privado: a aventura continua valendo na sessão atual.
    }
  }
}

function loadProgress(): AdventureProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? reconcile(JSON.parse(raw) as unknown) : createAdventureProgress();
  } catch {
    // Dado corrompido ou storage bloqueado: a aventura recomeça, sem quebrar.
    return createAdventureProgress();
  }
}

/**
 * Aceita o que foi guardado e descarta só o que não faz sentido.
 *
 * Uma fase removida do catálogo some do save; um número estranho volta ao
 * mínimo. O resto da jornada continua de pé.
 */
function reconcile(value: unknown): AdventureProgress {
  const fallback = createAdventureProgress();

  if (typeof value !== 'object' || value === null) {
    return fallback;
  }

  const candidate = value as Partial<AdventureProgress>;
  const storedLevels = typeof candidate.levels === 'object' && candidate.levels !== null ? candidate.levels : {};

  const levels: Record<string, LevelRecord> = {};

  for (const [levelId, record] of Object.entries(storedLevels)) {
    const sanitized = KNOWN_LEVELS.has(levelId) ? sanitizeRecord(record) : null;

    if (sanitized) {
      levels[levelId] = sanitized;
    }
  }

  return {
    ...fallback,
    levels,
    claimedRewards: Array.isArray(candidate.claimedRewards)
      ? candidate.claimedRewards.filter((id): id is string => typeof id === 'string')
      : [],
    curiosities: Array.isArray(candidate.curiosities)
      ? candidate.curiosities.filter(isCuriosityRecord)
      : [],
  };
}

function sanitizeRecord(value: unknown): LevelRecord | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Partial<LevelRecord>;

  if (typeof record.completedAt !== 'string') {
    return null;
  }

  return {
    attempts: count(record.attempts, 1),
    bestScore: count(record.bestScore, 0),
    bestStars: Math.min(ADVENTURE_RULES.stars.max, count(record.bestStars, 1)),
    completedAt: record.completedAt,
  };
}

function isCuriosityRecord(value: unknown): value is CuriosityRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Partial<CuriosityRecord>;

  return typeof record.id === 'string' && KNOWN_CURIOSITIES.has(record.id) && typeof record.unlockedAt === 'string';
}

function count(value: unknown, minimum: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(minimum, Math.trunc(value)) : minimum;
}
