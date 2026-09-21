import type { AchievementId, GameId } from './game-progress.model';

/**
 * Eventos da jornada de jogos.
 *
 * Existem para que outras partes do site — hoje o mascote, amanhã o que for —
 * possam reagir ao que a criança faz nos jogos sem que nenhum jogo precise
 * saber que elas existem. Quem registra o desafio continua sendo o
 * `GameProgressService`; ele apenas anuncia o que aconteceu.
 */
export type GameEvent =
  | {
      readonly type: 'CHALLENGE_COMPLETED';
      readonly gameId: GameId;
      readonly wasCorrect: boolean;
      /** Acertos seguidos depois deste desafio; zero quando houve erro. */
      readonly streak: number;
    }
  | {
      readonly type: 'LEVEL_COMPLETED';
      readonly gameId: GameId;
      readonly level: number;
      readonly wasPerfect: boolean;
    }
  | { readonly type: 'ACHIEVEMENT_UNLOCKED'; readonly achievementId: AchievementId };

export type GameEventType = GameEvent['type'];
