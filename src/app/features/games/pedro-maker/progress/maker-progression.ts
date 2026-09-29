import {
  COIN_RULES,
  COIN_STAR_RATIO,
  DAILY_MISSION,
  MAKER_ACHIEVEMENTS,
  XP_RULES,
  xpForAdventurerLevel,
} from '../config/rules.config';
import { DEFAULT_LOOK, type LookOption } from '../config/character.config';
import { BOSS_LEVEL_NUMBER, LEVELS_PER_WORLD } from '../levels/campaign';
import type { CampaignLevel } from '../models/campaign.model';
import type {
  AdventurerLevel,
  LevelRecord,
  LevelReward,
  LevelRunResult,
  MakerAchievement,
  MakerAchievementMeasure,
  MakerAchievementProgress,
  MakerProgress,
} from '../models/progress.model';

/**
 * Regras do progresso do Pedro Maker, sem Angular e sem tela.
 *
 * Estrela, XP, moeda, conquista, missão do dia e desbloqueio de fase nascem
 * aqui. O serviço só guarda o estado e chama estas funções — é o que permite
 * testar toda a economia do jogo sem abrir o navegador.
 */

export const MAKER_PROGRESS_VERSION = 1;

export function createMakerProgress(today: string): MakerProgress {
  return {
    version: MAKER_PROGRESS_VERSION,
    levels: {},
    secretsFound: [],
    coins: 0,
    totalXp: 0,
    achievements: [],
    stats: {
      coinsCollected: 0,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      fastCompletions: 0,
      customLevelsSaved: 0,
    },
    look: DEFAULT_LOOK,
    ownedLookOptions: [],
    mission: { day: today, levelsCompleted: 0, rewardClaimed: false },
    lastLevelId: null,
  };
}

export function createLevelRecord(crystalCount: number): LevelRecord {
  return {
    completed: false,
    stars: 0,
    crystals: Array.from({ length: crystalCount }, () => false),
    bestTimeMs: null,
    bestCoins: 0,
    timesCompleted: 0,
  };
}

/* Estrelas ----------------------------------------------------------------- */

/**
 * Estrelas de uma partida.
 *
 * Uma por concluir, uma por juntar 70% das moedas e uma por ter todos os
 * cristais — contando os achados em partidas anteriores. Assim a criança que
 * achou dois cristais ontem e o último hoje ganha a terceira estrela hoje.
 */
export function starsFor(result: LevelRunResult, crystalsKnown: readonly boolean[]): number {
  const hasCoinStar =
    result.coinsTotal === 0 || result.coinsCollected >= Math.ceil(result.coinsTotal * COIN_STAR_RATIO);
  const hasCrystalStar = crystalsKnown.every(Boolean);

  return 1 + (hasCoinStar ? 1 : 0) + (hasCrystalStar ? 1 : 0);
}

/* Nível do aventureiro ------------------------------------------------------ */

export function adventurerLevelFor(totalXp: number): AdventurerLevel {
  let level = 1;
  let remaining = Math.max(0, Math.trunc(totalXp));

  while (remaining >= xpForAdventurerLevel(level)) {
    remaining -= xpForAdventurerLevel(level);
    level += 1;
  }

  const xpForLevel = xpForAdventurerLevel(level);

  return {
    level,
    xpIntoLevel: remaining,
    xpForLevel,
    // Para baixo: a barra só aparece cheia quando o nível de fato sobe.
    percentage: Math.floor((remaining / xpForLevel) * 100),
  };
}

/* Desbloqueio ---------------------------------------------------------------- */

/**
 * Uma fase abre quando a anterior do mesmo mundo foi concluída; a primeira de
 * cada mundo abre quando o chefão do mundo anterior foi vencido. A fase
 * secreta abre só pela porta escondida.
 */
export function isLevelUnlocked(progress: MakerProgress, level: CampaignLevel): boolean {
  if (level.kind === 'secret') {
    return progress.secretsFound.includes(level.id);
  }

  if (level.number === 1) {
    return level.worldId === 1 || isCompleted(progress, `${level.worldId - 1}-${BOSS_LEVEL_NUMBER}`);
  }

  return isCompleted(progress, `${level.worldId}-${level.number - 1}`);
}

export function isCompleted(progress: MakerProgress, levelId: string): boolean {
  return progress.levels[levelId]?.completed ?? false;
}

export function isWorldUnlocked(progress: MakerProgress, worldId: number): boolean {
  return worldId === 1 || isCompleted(progress, `${worldId - 1}-${BOSS_LEVEL_NUMBER}`);
}

/* Totais ------------------------------------------------------------------------ */

export function totalStars(progress: MakerProgress): number {
  return Object.values(progress.levels).reduce((total, record) => total + record.stars, 0);
}

export function totalCrystals(progress: MakerProgress): number {
  return Object.values(progress.levels).reduce(
    (total, record) => total + record.crystals.filter(Boolean).length,
    0,
  );
}

export function levelsCompleted(progress: MakerProgress): number {
  return Object.values(progress.levels).filter((record) => record.completed).length;
}

/** Total máximo de estrelas da campanha, para a tela mostrar "18 / 150". */
export const MAX_CAMPAIGN_STARS = 5 * LEVELS_PER_WORLD * 3;

/* Resultado de partida -------------------------------------------------------------- */

export interface CampaignRunContext {
  readonly source: 'campanha';
  readonly levelId: string;
  readonly isBoss: boolean;
  readonly targetTimeSeconds: number;
}

export interface CustomRunContext {
  readonly source: 'minha';
}

export type RunContext = CampaignRunContext | CustomRunContext;

export interface ResultApplication {
  readonly progress: MakerProgress;
  readonly reward: LevelReward;
}

/**
 * Registra uma fase vencida e devolve o estado novo com a recompensa pronta.
 *
 * Nada é retirado: um resultado pior que o recorde só não bate o recorde.
 */
export function applyLevelResult(
  progress: MakerProgress,
  context: RunContext,
  result: LevelRunResult,
  today: string,
): ResultApplication {
  const levelBefore = adventurerLevelFor(progress.totalXp).level;
  const campaign = context.source === 'campanha' ? applyCampaignRecord(progress, context, result) : null;

  let xpGained = campaign?.xp ?? XP_RULES.customLevelCompleted;
  let coinsGained =
    context.source === 'campanha'
      ? result.coinsCollected
      : Math.min(COIN_RULES.customLevelCap, result.coinsCollected);

  const isFast =
    context.source === 'campanha' && result.timeMs <= context.targetTimeSeconds * 1000;

  const mission = advanceMission(progress, today);

  if (mission.missionCompleted) {
    xpGained += XP_RULES.dailyMission;
    coinsGained += COIN_RULES.dailyMission;
  }

  const updated: MakerProgress = {
    ...progress,
    levels: campaign ? { ...progress.levels, [campaign.levelId]: campaign.record } : progress.levels,
    coins: progress.coins + coinsGained,
    totalXp: progress.totalXp + xpGained,
    stats: {
      ...progress.stats,
      coinsCollected: progress.stats.coinsCollected + result.coinsCollected,
      enemiesDefeated: progress.stats.enemiesDefeated + result.enemiesDefeated,
      bossesDefeated: progress.stats.bossesDefeated + (result.bossDefeated ? 1 : 0),
      fastCompletions: progress.stats.fastCompletions + (isFast ? 1 : 0),
    },
    mission: mission.state,
    lastLevelId: context.source === 'campanha' ? context.levelId : progress.lastLevelId,
  };

  const unlocked = findNewAchievements(updated);

  return {
    progress: withAchievements(updated, unlocked),
    reward: {
      stars: campaign?.stars ?? starsFor(result, result.crystalsFound),
      isNewRecord: campaign?.isNewRecord ?? false,
      xpGained,
      coinsGained,
      levelBefore,
      levelAfter: adventurerLevelFor(updated.totalXp).level,
      unlockedAchievements: unlocked,
      missionCompleted: mission.missionCompleted,
      worldCompleted: campaign?.isFirstBossWin ?? false,
    },
  };
}

interface CampaignRecordUpdate {
  readonly levelId: string;
  readonly record: LevelRecord;
  readonly stars: number;
  readonly xp: number;
  readonly isNewRecord: boolean;
  readonly isFirstBossWin: boolean;
}

function applyCampaignRecord(
  progress: MakerProgress,
  context: CampaignRunContext,
  result: LevelRunResult,
): CampaignRecordUpdate {
  const previous = progress.levels[context.levelId] ?? createLevelRecord(result.crystalsFound.length);
  const crystals = result.crystalsFound.map((found, index) => found || (previous.crystals[index] ?? false));
  const stars = starsFor(result, crystals);
  const isFirstCompletion = !previous.completed;
  const hadAllCrystals = previous.crystals.length > 0 && previous.crystals.every(Boolean);
  const hasAllCrystals = crystals.length > 0 && crystals.every(Boolean);

  let xp = isFirstCompletion ? XP_RULES.levelCompleted : XP_RULES.levelReplayed;

  if (hasAllCrystals && !hadAllCrystals) {
    xp += XP_RULES.allCrystals;
  }

  if (stars === 3 && previous.stars < 3) {
    xp += XP_RULES.threeStars;
  }

  const isFirstBossWin = context.isBoss && isFirstCompletion && result.bossDefeated;

  if (isFirstBossWin) {
    xp += XP_RULES.bossDefeated;
  }

  const isNewRecord =
    !isFirstCompletion && (previous.bestTimeMs === null || result.timeMs < previous.bestTimeMs);

  return {
    levelId: context.levelId,
    stars,
    xp,
    isNewRecord,
    isFirstBossWin,
    record: {
      completed: true,
      stars: Math.max(previous.stars, stars),
      crystals,
      bestTimeMs: previous.bestTimeMs === null ? result.timeMs : Math.min(previous.bestTimeMs, result.timeMs),
      bestCoins: Math.max(previous.bestCoins, result.coinsCollected),
      timesCompleted: previous.timesCompleted + 1,
    },
  };
}

/* Missão do dia -------------------------------------------------------------------- */

interface MissionAdvance {
  readonly state: MakerProgress['mission'];
  readonly missionCompleted: boolean;
}

/** Conta mais uma fase na missão do dia, recomeçando o contador num dia novo. */
function advanceMission(progress: MakerProgress, today: string): MissionAdvance {
  const current =
    progress.mission.day === today
      ? progress.mission
      : { day: today, levelsCompleted: 0, rewardClaimed: false };

  const levelsCompleted = current.levelsCompleted + 1;
  const missionCompleted = !current.rewardClaimed && levelsCompleted >= DAILY_MISSION.levelsToComplete;

  return {
    state: {
      day: today,
      levelsCompleted,
      rewardClaimed: current.rewardClaimed || missionCompleted,
    },
    missionCompleted,
  };
}

/** Missão como a tela deve mostrar hoje, mesmo que o save seja de ontem. */
export function missionForToday(progress: MakerProgress, today: string): MakerProgress['mission'] {
  return progress.mission.day === today
    ? progress.mission
    : { day: today, levelsCompleted: 0, rewardClaimed: false };
}

/* Segredos, fases criadas e visual ------------------------------------------------------ */

export interface SimpleApplication {
  readonly progress: MakerProgress;
  readonly unlockedAchievements: readonly MakerAchievement[];
}

export function applySecretFound(progress: MakerProgress, secretLevelId: string): SimpleApplication {
  if (progress.secretsFound.includes(secretLevelId)) {
    return { progress, unlockedAchievements: [] };
  }

  const updated = { ...progress, secretsFound: [...progress.secretsFound, secretLevelId] };
  const unlocked = findNewAchievements(updated);

  return { progress: withAchievements(updated, unlocked), unlockedAchievements: unlocked };
}

export function applyCustomLevelSaved(progress: MakerProgress): SimpleApplication {
  const updated = {
    ...progress,
    stats: { ...progress.stats, customLevelsSaved: progress.stats.customLevelsSaved + 1 },
  };
  const unlocked = findNewAchievements(updated);

  return { progress: withAchievements(updated, unlocked), unlockedAchievements: unlocked };
}

export type LookAvailability = 'equipado' | 'disponivel' | 'comprar' | 'bloqueado';

export function lookAvailability(progress: MakerProgress, option: LookOption): LookAvailability {
  if (progress.look[option.category] === option.id) {
    return 'equipado';
  }

  if (adventurerLevelFor(progress.totalXp).level < option.unlockLevel) {
    return 'bloqueado';
  }

  return option.price === 0 || progress.ownedLookOptions.includes(option.id) ? 'disponivel' : 'comprar';
}

/**
 * Compra (se preciso) e veste uma opção de visual.
 *
 * Devolve o mesmo estado quando a opção está bloqueada ou falta moeda: a tela
 * já desabilita o botão, e esta função garante que nada passe mesmo assim.
 */
export function equipLook(progress: MakerProgress, option: LookOption): MakerProgress {
  const availability = lookAvailability(progress, option);

  if (availability === 'bloqueado' || availability === 'equipado') {
    return progress;
  }

  if (availability === 'comprar') {
    if (progress.coins < option.price) {
      return progress;
    }

    return {
      ...progress,
      coins: progress.coins - option.price,
      ownedLookOptions: [...progress.ownedLookOptions, option.id],
      look: { ...progress.look, [option.category]: option.id },
    };
  }

  return { ...progress, look: { ...progress.look, [option.category]: option.id } };
}

/* Conquistas --------------------------------------------------------------------------- */

export function achievementsProgressOf(progress: MakerProgress): readonly MakerAchievementProgress[] {
  return MAKER_ACHIEVEMENTS.map((achievement) => ({
    achievement,
    current: Math.min(achievement.goal, measure(progress, achievement.measure)),
    isUnlocked: progress.achievements.includes(achievement.id),
  }));
}

function findNewAchievements(progress: MakerProgress): readonly MakerAchievement[] {
  return MAKER_ACHIEVEMENTS.filter(
    (achievement) =>
      !progress.achievements.includes(achievement.id) &&
      measure(progress, achievement.measure) >= achievement.goal,
  );
}

function withAchievements(progress: MakerProgress, unlocked: readonly MakerAchievement[]): MakerProgress {
  return unlocked.length === 0
    ? progress
    : { ...progress, achievements: [...progress.achievements, ...unlocked.map((achievement) => achievement.id)] };
}

function measure(progress: MakerProgress, kind: MakerAchievementMeasure): number {
  switch (kind) {
    case 'levelsCompleted':
      return levelsCompleted(progress);
    case 'coinsCollected':
      return progress.stats.coinsCollected;
    case 'crystalsFound':
      return totalCrystals(progress);
    case 'stars':
      return totalStars(progress);
    case 'bossesDefeated':
      return progress.stats.bossesDefeated;
    case 'fastCompletions':
      return progress.stats.fastCompletions;
    case 'customLevelsSaved':
      return progress.stats.customLevelsSaved;
    case 'secretsFound':
      return progress.secretsFound.length;
  }
}
