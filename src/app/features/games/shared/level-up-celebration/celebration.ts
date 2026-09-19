import { levelFeedbackFor } from '../../../../core/games/progression';
import type { ChallengeOutcome } from '../../../../core/models/game-progress.model';
import type { CelebrationData } from './level-up-celebration';

/**
 * Traduz o resultado de um desafio na comemoração de fim de nível.
 *
 * Existe para que os sete jogos montem a mesma festa a partir do mesmo dado,
 * em vez de cada um escolher a própria mensagem e o próprio número.
 */
export function celebrationFrom(outcome: ChallengeOutcome, gameLabel: string): CelebrationData {
  return {
    gameLabel,
    level: outcome.level,
    stars: outcome.stars,
    earnedPoints: outcome.earnedPoints,
    streak: outcome.streak,
    isPerfect: outcome.wasPerfectLevel,
    message: levelFeedbackFor(outcome.correctInLevel, outcome.challengesPerLevel),
  };
}
