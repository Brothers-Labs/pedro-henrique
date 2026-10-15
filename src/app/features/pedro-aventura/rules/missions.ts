import type {
  MissionDefinition,
  MissionMetric,
  MissionProgress,
  MissionStatus,
  SeasonDefinition,
} from '../models/economy.model';
import { dayKey, startOfNextDay, startOfNextWeek, weekKey } from './calendar';

type MissionRecords = Readonly<Record<string, MissionProgress>>;

/** Quanto cada métrica andou num evento da partida. */
export type MetricIncrements = Partial<Record<MissionMetric, number>>;

/**
 * Período a que o progresso de uma missão pertence.
 *
 * Quando o período muda (novo dia, nova semana, nova temporada), o progresso
 * guardado deixa de valer e a missão recomeça do zero, sem apagar nada à força.
 */
export function periodOf(mission: MissionDefinition, season: SeasonDefinition, now: Date): string {
  switch (mission.category) {
    case 'daily':
      return dayKey(now);
    case 'weekly':
      return weekKey(now);
    case 'season':
      return season.id;
    case 'special':
      return `${season.id}:evento`;
  }
}

export function expiresAt(mission: MissionDefinition, season: SeasonDefinition, now: Date): Date | null {
  switch (mission.category) {
    case 'daily':
      return startOfNextDay(now);
    case 'weekly':
      return startOfNextWeek(now);
    case 'season':
    case 'special':
      return new Date(season.endsAt);
  }
}

function currentProgress(records: MissionRecords, mission: MissionDefinition, season: SeasonDefinition, now: Date): MissionProgress {
  const period = periodOf(mission, season, now);
  const stored = records[mission.id];

  return stored && stored.period === period ? stored : { period, value: 0, isClaimed: false };
}

export function missionStatus(
  records: MissionRecords,
  mission: MissionDefinition,
  season: SeasonDefinition,
  now: Date,
): MissionStatus {
  const progress = currentProgress(records, mission, season, now);
  const value = Math.min(mission.target, progress.value);
  const state = progress.isClaimed ? 'claimed' : value >= mission.target ? 'completed' : 'in-progress';

  return { mission, progress: value, state, expiresAt: expiresAt(mission, season, now) };
}

/** Faz as missões andarem com o que aconteceu na partida. Missão já resgatada não anda mais. */
export function advanceMissions(
  records: MissionRecords,
  missions: readonly MissionDefinition[],
  increments: MetricIncrements,
  season: SeasonDefinition,
  now: Date,
): MissionRecords {
  const updated: Record<string, MissionProgress> = { ...records };

  for (const mission of missions) {
    const amount = increments[mission.metric] ?? 0;

    if (amount <= 0) {
      continue;
    }

    const progress = currentProgress(records, mission, season, now);

    if (progress.isClaimed) {
      continue;
    }

    updated[mission.id] = { ...progress, value: Math.min(mission.target, progress.value + amount) };
  }

  return updated;
}

/** Marca a missão como resgatada. Devolve `null` quando ela ainda não está completa ou já foi resgatada. */
export function markMissionClaimed(
  records: MissionRecords,
  mission: MissionDefinition,
  season: SeasonDefinition,
  now: Date,
): MissionRecords | null {
  if (missionStatus(records, mission, season, now).state !== 'completed') {
    return null;
  }

  return { ...records, [mission.id]: { ...currentProgress(records, mission, season, now), isClaimed: true } };
}

/** Missões completas e ainda não resgatadas: o ponto vermelho do menu. */
export function claimableMissionCount(
  records: MissionRecords,
  missions: readonly MissionDefinition[],
  season: SeasonDefinition,
  now: Date,
): number {
  return missions.filter((mission) => missionStatus(records, mission, season, now).state === 'completed').length;
}
