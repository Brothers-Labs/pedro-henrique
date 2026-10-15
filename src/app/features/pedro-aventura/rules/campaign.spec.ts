import { findLevel, REGIONS } from '../config/regions.config';
import type { LevelDefinition, PlayerLevelProgress } from '../models/campaign.model';
import {
  isLevelUnlocked,
  objectivesFor,
  recordAttempt,
  regionStatus,
  starsFor,
  suggestedLevel,
} from './campaign';

const NOW = new Date('2026-10-20T12:00:00-03:00');
const AFTER_SEASON = new Date('2027-01-10T12:00:00-03:00');

function level(id: string): LevelDefinition {
  const found = findLevel(id);

  if (!found) {
    throw new Error(`Fase ${id} não existe.`);
  }

  return found;
}

function won(stars: number): PlayerLevelProgress {
  return { bestStars: stars, bestTimeMs: 60_000, bestScore: 1000, wins: 1, attempts: 1 };
}

function region(id: string) {
  const found = REGIONS.find((candidate) => candidate.id === id);

  if (!found) {
    throw new Error(`Região ${id} não existe.`);
  }

  return found;
}

describe('campaign', () => {
  const first = level('1-1');

  it('dá uma estrela por completar, duas com algum objetivo extra e três com todos', () => {
    const base = { isVictory: true, coins: 0, ramps: 0, timeMs: first.targetTimeSeconds * 1000 + 1 };

    expect(starsFor(objectivesFor(first, { ...base, isVictory: false }))).toBe(0);
    expect(starsFor(objectivesFor(first, base))).toBe(1);
    expect(starsFor(objectivesFor(first, { ...base, coins: first.coinTarget }))).toBe(2);
    expect(
      starsFor(objectivesFor(first, { isVictory: true, coins: first.coinTarget, ramps: first.rampTarget, timeMs: 1000 })),
    ).toBe(3);
  });

  it('guarda recordes que só melhoram', () => {
    const result = { attemptId: 'a', levelId: '1-1', difficulty: 'facil' as const, isVictory: true, timeMs: 50_000, coins: 10, goldBars: 0, diamonds: 0, hearts: 0, crowns: 1, ramps: 1, damageTaken: 0, score: 900 };
    const firstRecord = recordAttempt(undefined, result, 2);
    const worse = recordAttempt(firstRecord, { ...result, timeMs: 70_000, score: 100 }, 1);

    expect(worse).toEqual({ bestStars: 2, bestTimeMs: 50_000, bestScore: 900, wins: 2, attempts: 2 });
    expect(recordAttempt(worse, { ...result, isVictory: false }, 0).attempts).toBe(3);
  });

  it('abre as fases em sequência dentro da região', () => {
    expect(isLevelUnlocked(level('1-1'), {}, NOW)).toBeTrue();
    expect(isLevelUnlocked(level('1-2'), {}, NOW)).toBeFalse();
    expect(isLevelUnlocked(level('1-2'), { '1-1': won(1) }, NOW)).toBeTrue();
  });

  it('abre a próxima região com as estrelas pedidas', () => {
    const sevenStars = { '1-1': won(3), '1-2': won(3), '1-3': won(1) };
    const eightStars = { ...sevenStars, '1-4': won(1) };

    expect(regionStatus(region('zona-urbana'), sevenStars, NOW)).toBe('locked');
    expect(regionStatus(region('zona-urbana'), eightStars, NOW)).toBe('unlocked');
  });

  it('abre o evento só durante a temporada e com a Ilha vencida', () => {
    const island = Object.fromEntries(region('ilha-inicial').levels.map((entry) => [entry.id, won(1)]));

    expect(regionStatus(region('eventos-especiais'), {}, NOW)).toBe('locked');
    expect(regionStatus(region('eventos-especiais'), island, NOW)).toBe('unlocked');
    expect(regionStatus(region('eventos-especiais'), island, AFTER_SEASON)).toBe('event-closed');
  });

  it('sugere a primeira fase aberta e ainda não vencida', () => {
    expect(suggestedLevel({}, NOW).id).toBe('1-1');
    expect(suggestedLevel({ '1-1': won(2) }, NOW).id).toBe('1-2');
  });
});
