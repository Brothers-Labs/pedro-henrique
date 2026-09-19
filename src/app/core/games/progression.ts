import {
  ACHIEVEMENTS,
  GAME_CATALOG,
  GAME_CONFIG,
  GAME_IDS,
  gameDefinition,
  LEVEL_FEEDBACK,
} from '../data/game-progress.data';
import type {
  Achievement,
  AchievementId,
  ChallengeOutcome,
  GameDefinition,
  GameId,
  GameProgress,
  NextGoal,
  PlayerProgress,
  PlayerSummary,
} from '../models/game-progress.model';

/**
 * Regras da jornada de jogos, sem Angular e sem tela.
 *
 * Todo ponto, nível, estrela e conquista nasce aqui. Os componentes só chamam
 * `applyChallenge` e desenham o que voltar — é o que impede sete jogos de
 * inventarem sete progressões ligeiramente diferentes.
 */

/** Sobe a cada mudança incompatível do formato guardado. */
export const PROGRESS_SCHEMA_VERSION = 1;

export function createGameProgress(gameId: GameId): GameProgress {
  return {
    gameId,
    level: 1,
    completedInLevel: 0,
    correctInLevel: 0,
    score: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    totalPlayed: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectLevels: 0,
    bestLevelScore: 0,
    starsByLevel: [],
  };
}

export function createPlayerProgress(): PlayerProgress {
  return {
    version: PROGRESS_SCHEMA_VERSION,
    games: Object.fromEntries(GAME_IDS.map((id) => [id, createGameProgress(id)])) as Readonly<
      Record<GameId, GameProgress>
    >,
    unlockedAchievements: [],
  };
}

/** Bônus da sequência atual, já limitado pelo teto da configuração. */
export function streakBonusFor(streak: number): number {
  if (streak < GAME_CONFIG.streakBonusThreshold) {
    return 0;
  }

  const steps = streak - GAME_CONFIG.streakBonusThreshold + 1;

  return Math.min(GAME_CONFIG.maxStreakBonus, steps * GAME_CONFIG.pointsPerStreakStep);
}

/** Estrelas do nível: nunca retiradas depois, porque cada nível fecha uma vez. */
export function starsFor(correct: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const ratio = correct / total;

  return GAME_CONFIG.starThresholds.reduce(
    (stars, threshold) => (ratio >= threshold ? stars + 1 : stars),
    0,
  );
}

export function levelFeedbackFor(correct: number, total: number): string {
  // A escala do texto foi escrita para dez desafios; outros tamanhos são reescalados.
  const scaled = total === 0 ? 0 : Math.round((correct / total) * 10);
  const match = LEVEL_FEEDBACK.find((entry) => scaled >= entry.minCorrect);

  return match?.message ?? LEVEL_FEEDBACK[LEVEL_FEEDBACK.length - 1].message;
}

export interface ChallengeApplication {
  readonly player: PlayerProgress;
  readonly outcome: ChallengeOutcome;
}

/**
 * Registra um desafio concluído e devolve o estado novo junto do que mudou.
 *
 * Nunca subtrai: errar custa a sequência, e só. Uma criança que erra cinco
 * vezes seguidas continua com todos os pontos e níveis que já conquistou.
 */
export function applyChallenge(
  player: PlayerProgress,
  gameId: GameId,
  wasCorrect: boolean,
): ChallengeApplication {
  const definition = gameDefinition(gameId);
  const current = player.games[gameId];
  const streak = wasCorrect ? current.currentStreak + 1 : 0;

  const streakBonus = wasCorrect ? streakBonusFor(streak) : 0;
  const answerPoints = wasCorrect ? GAME_CONFIG.pointsPerCorrectAnswer + streakBonus : 0;

  const completedInLevel = current.completedInLevel + 1;
  const correctInLevel = current.correctInLevel + (wasCorrect ? 1 : 0);
  const didLevelUp = completedInLevel >= definition.challengesPerLevel;

  const wasPerfectLevel = didLevelUp && correctInLevel === definition.challengesPerLevel;
  const levelPoints = didLevelUp ? GAME_CONFIG.pointsPerLevelCompleted : 0;
  const perfectPoints = wasPerfectLevel ? GAME_CONFIG.pointsPerPerfectLevel : 0;
  const stars = didLevelUp ? starsFor(correctInLevel, definition.challengesPerLevel) : 0;

  const updated: GameProgress = {
    ...current,
    level: didLevelUp ? current.level + 1 : current.level,
    completedInLevel: didLevelUp ? 0 : completedInLevel,
    correctInLevel: didLevelUp ? 0 : correctInLevel,
    score: current.score + answerPoints + levelPoints + perfectPoints,
    correctAnswers: current.correctAnswers + (wasCorrect ? 1 : 0),
    wrongAnswers: current.wrongAnswers + (wasCorrect ? 0 : 1),
    totalPlayed: current.totalPlayed + 1,
    currentStreak: streak,
    bestStreak: Math.max(current.bestStreak, streak),
    perfectLevels: current.perfectLevels + (wasPerfectLevel ? 1 : 0),
    bestLevelScore: Math.max(current.bestLevelScore, correctInLevel),
    starsByLevel: didLevelUp ? [...current.starsByLevel, stars] : current.starsByLevel,
  };

  const withGame: PlayerProgress = {
    ...player,
    games: { ...player.games, [gameId]: updated },
  };

  const unlocked = findNewAchievements(withGame);

  return {
    player: {
      ...withGame,
      unlockedAchievements: [
        ...withGame.unlockedAchievements,
        ...unlocked.map((achievement) => achievement.id),
      ],
    },
    outcome: {
      gameId,
      wasCorrect,
      earnedPoints: answerPoints + levelPoints + perfectPoints,
      streakBonus,
      streak,
      completedInLevel: updated.completedInLevel,
      challengesPerLevel: definition.challengesPerLevel,
      correctInLevel: didLevelUp ? correctInLevel : 0,
      didLevelUp,
      level: updated.level,
      stars,
      wasPerfectLevel,
      unlockedAchievements: unlocked,
    },
  };
}

/** Percentual do nível atual, pronto para a barra de progresso. */
export function levelPercentage(progress: GameProgress, definition: GameDefinition): number {
  if (definition.challengesPerLevel <= 0) {
    return 0;
  }

  return Math.round((progress.completedInLevel / definition.challengesPerLevel) * 100);
}

export function summarize(player: PlayerProgress): PlayerSummary {
  const games = GAME_IDS.map((id) => player.games[id]);
  const totalScore = games.reduce((total, game) => total + game.score, 0);
  const pointsIntoLevel = totalScore % GAME_CONFIG.pointsPerOverallLevel;

  return {
    totalScore,
    overallLevel: Math.floor(totalScore / GAME_CONFIG.pointsPerOverallLevel) + 1,
    bestStreak: games.reduce((best, game) => Math.max(best, game.bestStreak), 0),
    challengesCompleted: games.reduce((total, game) => total + game.totalPlayed, 0),
    achievementsUnlocked: player.unlockedAchievements.length,
    progressToNextLevel: Math.round(
      (pointsIntoLevel / GAME_CONFIG.pointsPerOverallLevel) * 100,
    ),
    pointsToNextLevel: GAME_CONFIG.pointsPerOverallLevel - pointsIntoLevel,
  };
}

/**
 * Próximo objetivo: o jogo em que falta menos para subir de nível.
 *
 * Entre jogos empatados vence o que já foi começado, porque continuar custa
 * menos do que abrir um jogo novo.
 */
export function nextGoalFor(player: PlayerProgress): NextGoal | null {
  const candidates = GAME_CATALOG.map((game) => {
    const progress = player.games[game.id];
    const remaining = game.challengesPerLevel - progress.completedInLevel;

    return { game, remaining, started: progress.completedInLevel > 0, nextLevel: progress.level + 1 };
  }).filter((candidate) => candidate.remaining > 0);

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates.reduce((chosen, candidate) => {
    if (candidate.started !== chosen.started) {
      return candidate.started ? candidate : chosen;
    }

    return candidate.remaining < chosen.remaining ? candidate : chosen;
  });

  return { game: best.game, remaining: best.remaining, nextLevel: best.nextLevel };
}

/** Conquistas que acabaram de ser satisfeitas e ainda não estavam na lista. */
function findNewAchievements(player: PlayerProgress): readonly Achievement[] {
  const already = new Set(player.unlockedAchievements);

  return ACHIEVEMENTS.filter(
    (achievement) => !already.has(achievement.id) && isAchieved(achievement.id, player),
  );
}

function isAchieved(id: AchievementId, player: PlayerProgress): boolean {
  const games = GAME_IDS.map((gameId) => player.games[gameId]);
  const totalScore = games.reduce((total, game) => total + game.score, 0);

  switch (id) {
    case 'primeiro-nivel':
      return games.some((game) => game.level > 1);
    case 'em-chamas':
      return games.some((game) => game.bestStreak >= 5);
    case 'cem-pontos':
      return totalScore >= 100;
    case 'nivel-perfeito':
      return games.some((game) => game.perfectLevels > 0);
    case 'explorador-de-jogos':
      return games.filter((game) => game.level > 1).length >= 3;
    case 'mil-pontos':
      return totalScore >= 1000;
    case 'maratonista':
      return games.reduce((total, game) => total + game.totalPlayed, 0) >= 50;
  }
}
