import { cosmeticById } from '../config/cosmetics.config';
import { RUN_REWARDS } from '../config/economy.config';
import { MISSIONS } from '../config/missions.config';
import { findLevel, REGIONS } from '../config/regions.config';
import { SEASON } from '../config/season.config';
import type { AventuraSettings, AventuraState, RunResult } from '../models/aventura-state.model';
import type { LevelDefinition, RegionDefinition } from '../models/campaign.model';
import type {
  MissionDefinition,
  PassId,
  PremiumPassId,
  Reward,
  SeasonDefinition,
  SeasonProgress,
  WalletTransaction,
} from '../models/economy.model';
import { generateLayout } from '../simulation/level-generator';
import {
  isLevelUnlocked,
  objectivesFor,
  type ObjectiveStatus,
  recordAttempt,
  scoreFor,
  starsFor,
  unlockedRegionIds,
} from './campaign';
import { equipCosmetic, grantCosmetic, ownsCosmetic, createInventory } from './inventory';
import { advanceMissions, markMissionClaimed, type MetricIncrements, missionStatus } from './missions';
import {
  addSeasonXp,
  createSeasonProgress,
  grantPass,
  levelInfo,
  markClaimed,
  passPrice,
  seasonPhase,
  xpToBuyLevels,
} from './season-pass';
import { applyTransactions, createWallet, hasApplied, transaction } from './wallet';

export const AVENTURA_SCHEMA_VERSION = 1;

/** Tentativas lembradas para recusar o mesmo resultado duas vezes. */
export const APPLIED_ATTEMPTS_LIMIT = 200;

/** Nem o mais rápido dos Pedros termina abaixo de 90% do tempo da pista na velocidade máxima. */
const MINIMUM_TIME_FACTOR = 0.9;

/**
 * Regras do Pedro Aventura sobre o estado inteiro.
 *
 * Cada operação recebe o estado e o relógio e devolve um estado novo — ou
 * `null` quando a operação não é permitida (sem saldo, prêmio já resgatado,
 * temporada encerrada). Nada aqui lê o aparelho: é o mesmo código que um
 * servidor rodaria para validar a economia.
 */

export const DEFAULT_SETTINGS: AventuraSettings = {
  quality: 'auto',
  musicVolume: 0.5,
  effectsVolume: 0.8,
  touchControls: 'auto',
};

export function createInitialState(now: Date): AventuraState {
  return {
    version: AVENTURA_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    wallet: createWallet(),
    levels: {},
    unlockedRegions: unlockedRegionIds({}, now),
    seasons: {},
    missions: {},
    inventory: createInventory(),
    settings: DEFAULT_SETTINGS,
    appliedAttempts: [],
  };
}

export function seasonProgressOf(state: AventuraState, season: SeasonDefinition = SEASON): SeasonProgress {
  return state.seasons[season.id] ?? createSeasonProgress(season.id);
}

function withSeason(state: AventuraState, progress: SeasonProgress): AventuraState {
  return { ...state, seasons: { ...state.seasons, [progress.seasonId]: progress } };
}

/* Partida -------------------------------------------------------------------------------- */

export interface RunSummary {
  readonly level: LevelDefinition;
  readonly stars: number;
  readonly objectives: readonly ObjectiveStatus[];
  readonly xpGained: number;
  readonly coinsGained: number;
  readonly diamondsGained: number;
  readonly isFirstWin: boolean;
  readonly isNewRecord: boolean;
  readonly seasonLevelBefore: number;
  readonly seasonLevelAfter: number;
  readonly completedMissions: readonly MissionDefinition[];
  readonly unlockedRegions: readonly RegionDefinition[];
}

/**
 * Confere o resultado contra a própria pista da fase.
 *
 * A pista é determinística, então dá para saber quantas moedas, corações,
 * coroas e rampas existem nela: um resultado que diz ter pego mais do que a
 * pista tem foi adulterado e é recusado.
 */
export function isPlausibleResult(level: LevelDefinition, result: RunResult): boolean {
  const { totals } = generateLayout(level);
  const counts = [result.coins, result.hearts, result.crowns, result.ramps, result.damageTaken, result.timeMs];
  const areCounts = counts.every((value) => Number.isInteger(value) && value >= 0);
  const fastestMs = (level.lengthMeters / level.maxSpeed) * 1000 * MINIMUM_TIME_FACTOR;

  return (
    areCounts &&
    (!result.isVictory || result.timeMs >= fastestMs) &&
    result.levelId === level.id &&
    result.coins <= totals.coins &&
    result.hearts <= totals.hearts &&
    result.crowns <= totals.crowns &&
    result.ramps <= totals.ramps
  );
}

/**
 * Aplica o resultado de uma partida: recordes, moedas, XP, missões e regiões.
 *
 * O mesmo `attemptId` aplicado duas vezes devolve `null` na segunda: um
 * resultado reenviado (toque duplo, aba recarregada) nunca paga em dobro.
 */
export function applyRunResult(
  state: AventuraState,
  result: RunResult,
  now: Date,
  season: SeasonDefinition = SEASON,
): { readonly state: AventuraState; readonly summary: RunSummary } | null {
  const level = findLevel(result.levelId);

  if (
    !level ||
    state.appliedAttempts.includes(result.attemptId) ||
    !isPlausibleResult(level, result) ||
    !isLevelUnlocked(level, state.levels, now)
  ) {
    return null;
  }

  // A pontuação é sempre recalculada aqui: o número que vem da tela não conta.
  const scored: RunResult = { ...result, score: scoreFor(level, result) };

  const objectives = objectivesFor(level, scored);
  const stars = starsFor(objectives);
  const previous = state.levels[level.id];
  const isFirstWin = result.isVictory && (previous?.wins ?? 0) === 0;
  const isFirstThreeStars = stars === 3 && (previous?.bestStars ?? 0) < 3;
  const levels = { ...state.levels, [level.id]: recordAttempt(previous, scored, stars) };

  const regionsBefore = new Set(state.unlockedRegions);
  const regionsNow = unlockedRegionIds(levels, now);
  const newRegions = REGIONS.filter((region) => regionsNow.includes(region.id) && !regionsBefore.has(region.id));

  const xpGained = result.isVictory
    ? RUN_REWARDS.victoryXp + stars * RUN_REWARDS.xpPerStar + result.crowns * RUN_REWARDS.xpPerCrown + result.ramps * RUN_REWARDS.xpPerRamp
    : RUN_REWARDS.defeatXp;
  const diamondsGained = (isFirstWin ? RUN_REWARDS.firstWinDiamonds : 0) + (isFirstThreeStars ? RUN_REWARDS.firstThreeStarsDiamonds : 0);

  const wallet = applyTransactions(state.wallet, [
    transaction(`run:${result.attemptId}:coins`, 'coins', result.coins, `Fase ${level.id}`, now),
    transaction(`first-win:${level.id}`, 'diamonds', isFirstWin ? RUN_REWARDS.firstWinDiamonds : 0, `Primeira vitória na fase ${level.id}`, now),
    transaction(`three-stars:${level.id}`, 'diamonds', isFirstThreeStars ? RUN_REWARDS.firstThreeStarsDiamonds : 0, `Três estrelas na fase ${level.id}`, now),
  ]);

  if (!wallet) {
    return null;
  }

  const increments = runIncrements(level, result, objectives, isFirstWin, newRegions.length);
  const missionsBefore = state.missions;
  const missions = advanceMissions(missionsBefore, MISSIONS, increments, season, now);
  const completedMissions = MISSIONS.filter(
    (mission) =>
      missionStatus(missionsBefore, mission, season, now).state === 'in-progress' &&
      missionStatus(missions, mission, season, now).state === 'completed',
  );

  const seasonBefore = seasonProgressOf(state, season);
  const seasonAfter = addSeasonXp(seasonBefore, season, xpGained, now);
  const best = previous?.bestScore ?? 0;

  return {
    state: {
      ...withSeason(state, seasonAfter),
      wallet,
      levels,
      missions,
      unlockedRegions: [...regionsBefore, ...newRegions.map((region) => region.id)],
      appliedAttempts: [result.attemptId, ...state.appliedAttempts].slice(0, APPLIED_ATTEMPTS_LIMIT),
    },
    summary: {
      level,
      stars,
      objectives,
      xpGained: seasonAfter.xp - seasonBefore.xp,
      coinsGained: result.coins,
      diamondsGained,
      isFirstWin,
      isNewRecord: scored.isVictory && scored.score > best,
      seasonLevelBefore: levelInfo(seasonBefore.xp, season.tiers.length).level,
      seasonLevelAfter: levelInfo(seasonAfter.xp, season.tiers.length).level,
      completedMissions,
      unlockedRegions: newRegions,
    },
  };
}

function runIncrements(
  level: LevelDefinition,
  result: RunResult,
  objectives: readonly ObjectiveStatus[],
  isFirstWin: boolean,
  newRegions: number,
): MetricIncrements {
  const isTimeMet = objectives.some((objective) => objective.id === 'time' && objective.isMet);
  const won = result.isVictory ? 1 : 0;

  return {
    'coins-collected': result.coins,
    'hearts-collected': result.hearts,
    'crowns-collected': result.crowns,
    'ramps-jumped': result.ramps,
    'levels-completed': won,
    'flawless-levels': result.isVictory && result.damageTaken === 0 ? 1 : 0,
    'under-target-time': isTimeMet ? 1 : 0,
    'regions-unlocked': newRegions,
    // Conta fases diferentes: vencer a mesma Corrida Noturna três vezes não fecha a missão.
    'event-levels-completed': isFirstWin && level.regionId === 'eventos-especiais' ? 1 : 0,
  };
}

/* Missões -------------------------------------------------------------------------------- */

export function claimMission(
  state: AventuraState,
  missionId: string,
  now: Date,
  season: SeasonDefinition = SEASON,
): AventuraState | null {
  const mission = MISSIONS.find((candidate) => candidate.id === missionId);

  if (!mission) {
    return null;
  }

  const missions = markMissionClaimed(state.missions, mission, season, now);

  if (!missions) {
    return null;
  }

  const period = missions[mission.id]?.period ?? '';
  const id = `mission:${mission.id}:${period}`;
  const wallet = applyTransactions(state.wallet, [
    transaction(`${id}:coins`, 'coins', mission.reward.coins, mission.title, now),
    transaction(`${id}:diamonds`, 'diamonds', mission.reward.diamonds, mission.title, now),
  ]);

  if (!wallet) {
    return null;
  }

  const seasonAfter = addSeasonXp(seasonProgressOf(state, season), season, mission.reward.xp, now);

  return { ...withSeason(state, seasonAfter), missions, wallet };
}

/* Passe -------------------------------------------------------------------------------- */

/** Resgata um prêmio da trilha e o entrega: moedas e diamantes na carteira, cosméticos na coleção. */
export function claimSeasonReward(
  state: AventuraState,
  level: number,
  pass: PassId,
  now: Date,
  season: SeasonDefinition = SEASON,
): AventuraState | null {
  const tier = season.tiers.find((candidate) => candidate.level === level);
  const progress = markClaimed(seasonProgressOf(state, season), season, level, pass, now);

  if (!tier || !progress) {
    return null;
  }

  const delivered = deliverReward(state, tier.rewards[pass], `season:${season.id}:${level}:${pass}`, now);

  return delivered ? withSeason(delivered, progress) : null;
}

export function claimAllSeasonRewards(state: AventuraState, now: Date, season: SeasonDefinition = SEASON): AventuraState {
  let current = state;

  for (const tier of season.tiers) {
    for (const pass of ['gratuito', 'vip', 'luxo'] as const) {
      current = claimSeasonReward(current, tier.level, pass, now, season) ?? current;
    }
  }

  return current;
}

function deliverReward(state: AventuraState, reward: Reward, id: string, now: Date): AventuraState | null {
  const credit = (transactions: readonly WalletTransaction[]): AventuraState | null => {
    const wallet = applyTransactions(state.wallet, transactions);

    return wallet ? { ...state, wallet } : null;
  };

  switch (reward.kind) {
    case 'coins':
      return credit([transaction(id, 'coins', reward.amount, 'Prêmio da temporada', now)]);
    case 'diamonds':
      return credit([transaction(id, 'diamonds', reward.amount, 'Prêmio da temporada', now)]);
    case 'chest':
      return credit([
        transaction(`${id}:coins`, 'coins', reward.contents.coins, reward.name, now),
        transaction(`${id}:diamonds`, 'diamonds', reward.contents.diamonds, reward.name, now),
      ]);
    case 'cosmetic':
      return { ...state, inventory: grantCosmetic(state.inventory, reward.cosmeticId) };
  }
}

/** Troca diamantes por um passe. */
export function buyPass(state: AventuraState, pass: PremiumPassId, now: Date, season: SeasonDefinition = SEASON): AventuraState | null {
  const before = seasonProgressOf(state, season);
  const after = grantPass(before, season, pass, now);

  if (!after) {
    return null;
  }

  const id = `pass:${season.id}:${pass}`;

  // Débito com id já usado seria ignorado pela carteira: o passe sairia de graça.
  if (hasApplied(state.wallet, id)) {
    return null;
  }

  const wallet = applyTransactions(state.wallet, [
    transaction(id, 'diamonds', -passPrice(before, pass), `Passe ${pass === 'vip' ? 'VIP' : 'Luxo'}`, now),
  ]);

  return wallet ? { ...withSeason(state, after), wallet } : null;
}

/** Diamantes pedidos para subir `levels` níveis no passe. */
export function levelsPrice(state: AventuraState, levels: number, season: SeasonDefinition = SEASON): number {
  const progress = seasonProgressOf(state, season);
  const current = levelInfo(progress.xp, season.tiers.length).level;
  const reachable = Math.min(levels, season.tiers.length - current);

  return Math.max(0, reachable) * season.levelPriceInDiamonds;
}

/** Compra níveis de temporada com diamantes. A chave é o nível de chegada: comprar o mesmo nível duas vezes não cobra duas vezes. */
export function buyLevels(state: AventuraState, levels: number, now: Date, season: SeasonDefinition = SEASON): AventuraState | null {
  const progress = seasonProgressOf(state, season);
  const price = levelsPrice(state, levels, season);

  if (!Number.isInteger(levels) || levels <= 0 || price === 0 || seasonPhase(season, now) !== 'active') {
    return null;
  }

  const target = levelInfo(progress.xp, season.tiers.length).level + price / season.levelPriceInDiamonds;
  const id = `levels:${season.id}:${target}`;

  if (hasApplied(state.wallet, id)) {
    return null;
  }

  const wallet = applyTransactions(state.wallet, [
    transaction(id, 'diamonds', -price, `Níveis até o ${target}`, now),
  ]);

  if (!wallet) {
    return null;
  }

  const xp = xpToBuyLevels(progress, season, price / season.levelPriceInDiamonds);

  return { ...withSeason(state, { ...progress, xp: progress.xp + xp }), wallet };
}

/* Loja e personagem ----------------------------------------------------------------------- */

export function buyCosmetic(state: AventuraState, cosmeticId: string, now: Date): AventuraState | null {
  const cosmetic = cosmeticById(cosmeticId);

  const id = `shop:${cosmeticId}`;

  if (!cosmetic.price || ownsCosmetic(state.inventory, cosmeticId) || hasApplied(state.wallet, id)) {
    return null;
  }

  const wallet = applyTransactions(state.wallet, [
    transaction(id, cosmetic.price.currency, -cosmetic.price.amount, cosmetic.name, now),
  ]);

  return wallet ? { ...state, wallet, inventory: grantCosmetic(state.inventory, cosmeticId) } : null;
}

export function equip(state: AventuraState, cosmeticId: string): AventuraState | null {
  const inventory = equipCosmetic(state.inventory, cosmeticId);

  return inventory ? { ...state, inventory } : null;
}

export function updateSettings(state: AventuraState, changes: Partial<AventuraSettings>): AventuraState {
  return { ...state, settings: { ...state.settings, ...changes } };
}
