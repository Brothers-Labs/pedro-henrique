import { REGIONS } from '../config/regions.config';
import { SCORE_RULES } from '../config/economy.config';
import type { RunResult } from '../models/aventura-state.model';
import type {
  LevelDefinition,
  PlayerLevelProgress,
  RegionDefinition,
  RegionId,
  RegionStatus,
} from '../models/campaign.model';
import { isWithin } from './calendar';

export type ObjectiveId = 'complete' | 'coins' | 'ramps' | 'time';

export interface ObjectiveStatus {
  readonly id: ObjectiveId;
  readonly label: string;
  readonly current: number;
  readonly target: number;
  readonly isMet: boolean;
}

type LevelRecords = Readonly<Record<string, PlayerLevelProgress>>;

/** Os quatro objetivos de uma fase, com o andamento atual. */
export function objectivesFor(
  level: LevelDefinition,
  progress: { readonly isVictory: boolean; readonly coins: number; readonly ramps: number; readonly timeMs: number },
): readonly ObjectiveStatus[] {
  const targetMs = level.targetTimeSeconds * 1000;

  return [
    { id: 'complete', label: 'Complete o percurso', current: progress.isVictory ? 1 : 0, target: 1, isMet: progress.isVictory },
    {
      id: 'coins',
      label: `Colete ${level.coinTarget} moedas`,
      current: progress.coins,
      target: level.coinTarget,
      isMet: progress.coins >= level.coinTarget,
    },
    {
      id: 'ramps',
      label: `Salte ${level.rampTarget} ${level.rampTarget === 1 ? 'rampa' : 'rampas'}`,
      current: progress.ramps,
      target: level.rampTarget,
      isMet: progress.ramps >= level.rampTarget,
    },
    {
      id: 'time',
      label: `Chegue em menos de ${formatSeconds(level.targetTimeSeconds)}`,
      current: progress.timeMs,
      target: targetMs,
      isMet: progress.isVictory && progress.timeMs <= targetMs,
    },
  ];
}

/**
 * Estrelas de uma fase: completar vale uma; completar e cumprir algum outro
 * objetivo vale duas; cumprir todos vale três. Sem completar, nenhuma.
 */
export function starsFor(objectives: readonly ObjectiveStatus[]): number {
  const isComplete = objectives.some((objective) => objective.id === 'complete' && objective.isMet);

  if (!isComplete) {
    return 0;
  }

  const extras = objectives.filter((objective) => objective.id !== 'complete');
  const metExtras = extras.filter((objective) => objective.isMet).length;

  if (metExtras === extras.length) {
    return 3;
  }

  return metExtras > 0 ? 2 : 1;
}

export function scoreFor(level: LevelDefinition, result: Omit<RunResult, 'score' | 'attemptId'>): number {
  if (!result.isVictory) {
    return result.coins * SCORE_RULES.perCoin;
  }

  const secondsUnder = Math.max(0, level.targetTimeSeconds - Math.floor(result.timeMs / 1000));

  return (
    result.coins * SCORE_RULES.perCoin +
    result.crowns * SCORE_RULES.perCrown +
    result.ramps * SCORE_RULES.perRamp +
    secondsUnder * SCORE_RULES.perSecondUnderTarget +
    (result.damageTaken === 0 ? SCORE_RULES.flawlessBonus : 0)
  );
}

export function emptyLevelProgress(): PlayerLevelProgress {
  return { bestStars: 0, bestTimeMs: null, bestScore: 0, wins: 0, attempts: 0 };
}

/** Registra uma tentativa: recordes só melhoram, nunca pioram. */
export function recordAttempt(previous: PlayerLevelProgress | undefined, result: RunResult, stars: number): PlayerLevelProgress {
  const base = previous ?? emptyLevelProgress();

  if (!result.isVictory) {
    return { ...base, attempts: base.attempts + 1 };
  }

  return {
    bestStars: Math.max(base.bestStars, stars),
    bestTimeMs: base.bestTimeMs === null ? result.timeMs : Math.min(base.bestTimeMs, result.timeMs),
    bestScore: Math.max(base.bestScore, result.score),
    wins: base.wins + 1,
    attempts: base.attempts + 1,
  };
}

export function isLevelWon(levels: LevelRecords, levelId: string): boolean {
  return (levels[levelId]?.wins ?? 0) > 0;
}

export function regionStars(levels: LevelRecords, region: RegionDefinition): number {
  return region.levels.reduce((sum, level) => sum + (levels[level.id]?.bestStars ?? 0), 0);
}

export function maxRegionStars(region: RegionDefinition): number {
  return region.levels.length * 3;
}

export function isRegionCompleted(levels: LevelRecords, region: RegionDefinition): boolean {
  return region.levels.every((level) => isLevelWon(levels, level.id));
}

/** Situação de uma região pelo progresso e, nos eventos, pelo relógio. */
export function regionStatus(
  region: RegionDefinition,
  levels: LevelRecords,
  now: Date,
  regions: readonly RegionDefinition[] = REGIONS,
): RegionStatus {
  const { unlock } = region;

  switch (unlock.kind) {
    case 'open':
      return 'unlocked';
    case 'stars': {
      const source = findRegion(regions, unlock.regionId);

      return regionStars(levels, source) >= unlock.stars ? 'unlocked' : 'locked';
    }
    case 'event': {
      if (!isWithin(unlock.startsAt, unlock.endsAt, now)) {
        return 'event-closed';
      }

      return isRegionCompleted(levels, findRegion(regions, unlock.requiresRegion)) ? 'unlocked' : 'locked';
    }
  }
}

/** Frase curta que diz à criança o que falta para abrir a região. */
export function unlockHint(region: RegionDefinition, regions: readonly RegionDefinition[] = REGIONS): string {
  const { unlock } = region;

  switch (unlock.kind) {
    case 'open':
      return 'Aberta';
    case 'stars':
      return `Ganhe ${unlock.stars} estrelas em ${findRegion(regions, unlock.regionId).name}`;
    case 'event':
      return `Vença todas as fases de ${findRegion(regions, unlock.requiresRegion).name} durante a temporada`;
  }
}

/** A primeira fase de uma região abre com a região; as outras, ao vencer a anterior. */
export function isLevelUnlocked(
  level: LevelDefinition,
  levels: LevelRecords,
  now: Date,
  regions: readonly RegionDefinition[] = REGIONS,
): boolean {
  const region = findRegion(regions, level.regionId);

  if (regionStatus(region, levels, now, regions) !== 'unlocked') {
    return false;
  }

  const index = region.levels.findIndex((candidate) => candidate.id === level.id);

  return index <= 0 || isLevelWon(levels, region.levels[index - 1].id);
}

/** Regiões abertas agora, para comparar antes e depois de uma partida. */
export function unlockedRegionIds(levels: LevelRecords, now: Date, regions: readonly RegionDefinition[] = REGIONS): readonly RegionId[] {
  return regions.filter((region) => regionStatus(region, levels, now, regions) === 'unlocked').map((region) => region.id);
}

/** Fase sugerida pelo "Jogar agora": a primeira aberta e ainda não vencida. */
export function suggestedLevel(levels: LevelRecords, now: Date, regions: readonly RegionDefinition[] = REGIONS): LevelDefinition {
  const all = regions.flatMap((region) => region.levels);
  const pending = all.find((level) => isLevelUnlocked(level, levels, now, regions) && !isLevelWon(levels, level.id));

  return pending ?? all[0];
}

/** Próxima fase da mesma região, quando existe. */
export function nextLevelOf(level: LevelDefinition, regions: readonly RegionDefinition[] = REGIONS): LevelDefinition | null {
  const region = findRegion(regions, level.regionId);
  const index = region.levels.findIndex((candidate) => candidate.id === level.id);

  return region.levels[index + 1] ?? null;
}

export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function findRegion(regions: readonly RegionDefinition[], id: RegionId): RegionDefinition {
  const region = regions.find((candidate) => candidate.id === id);

  if (!region) {
    throw new Error(`Região "${id}" não existe.`);
  }

  return region;
}
