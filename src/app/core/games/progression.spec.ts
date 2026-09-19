import { GAME_CONFIG, gameDefinition } from '../data/game-progress.data';
import type { GameId, PlayerProgress } from '../models/game-progress.model';
import {
  applyChallenge,
  createPlayerProgress,
  levelFeedbackFor,
  nextGoalFor,
  starsFor,
  streakBonusFor,
  summarize,
} from './progression';

const GAME: GameId = 'matematica';
const PER_LEVEL = gameDefinition(GAME).challengesPerLevel;

/** Responde `count` desafios seguidos com o mesmo resultado. */
function answerMany(
  player: PlayerProgress,
  count: number,
  wasCorrect: boolean,
  gameId: GameId = GAME,
): PlayerProgress {
  let current = player;

  for (let index = 0; index < count; index += 1) {
    current = applyChallenge(current, gameId, wasCorrect).player;
  }

  return current;
}

describe('streakBonusFor', () => {
  it('não dá bônus antes do limite de acertos seguidos', () => {
    expect(streakBonusFor(1)).toBe(0);
    expect(streakBonusFor(GAME_CONFIG.streakBonusThreshold - 1)).toBe(0);
  });

  it('cresce um degrau por acerto a partir do limite', () => {
    expect(streakBonusFor(3)).toBe(5);
    expect(streakBonusFor(4)).toBe(10);
  });

  it('respeita o teto para a pontuação não disparar', () => {
    expect(streakBonusFor(50)).toBe(GAME_CONFIG.maxStreakBonus);
  });
});

describe('starsFor', () => {
  it('segue a escala combinada de 7, 9 e 10 acertos em dez desafios', () => {
    expect(starsFor(6, 10)).toBe(0);
    expect(starsFor(7, 10)).toBe(1);
    expect(starsFor(9, 10)).toBe(2);
    expect(starsFor(10, 10)).toBe(3);
  });

  it('usa proporção, e não quantidade, em níveis de outro tamanho', () => {
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(0, 3)).toBe(0);
  });
});

describe('applyChallenge', () => {
  it('conta um acerto uma única vez e mantém o nível enquanto ele não fecha', () => {
    const { player, outcome } = applyChallenge(createPlayerProgress(), GAME, true);
    const progress = player.games[GAME];

    expect(progress.completedInLevel).toBe(1);
    expect(progress.correctAnswers).toBe(1);
    expect(progress.level).toBe(1);
    expect(outcome.didLevelUp).toBeFalse();
    expect(outcome.earnedPoints).toBe(GAME_CONFIG.pointsPerCorrectAnswer);
  });

  it('sobe de nível exatamente uma vez ao responder o décimo desafio', () => {
    const almost = answerMany(createPlayerProgress(), PER_LEVEL - 1, true);
    expect(almost.games[GAME].level).toBe(1);
    expect(almost.games[GAME].completedInLevel).toBe(PER_LEVEL - 1);

    const { player, outcome } = applyChallenge(almost, GAME, true);

    expect(outcome.didLevelUp).toBeTrue();
    expect(outcome.level).toBe(2);
    expect(player.games[GAME].level).toBe(2);
    expect(player.games[GAME].completedInLevel).toBe(0);
    expect(player.games[GAME].correctInLevel).toBe(0);
  });

  it('paga o bônus de nível e o de nível perfeito uma vez só', () => {
    const almost = answerMany(createPlayerProgress(), PER_LEVEL - 1, true);
    const before = almost.games[GAME].score;
    const { player, outcome } = applyChallenge(almost, GAME, true);

    const expected =
      GAME_CONFIG.pointsPerCorrectAnswer +
      GAME_CONFIG.maxStreakBonus +
      GAME_CONFIG.pointsPerLevelCompleted +
      GAME_CONFIG.pointsPerPerfectLevel;

    expect(outcome.wasPerfectLevel).toBeTrue();
    expect(outcome.stars).toBe(3);
    expect(outcome.earnedPoints).toBe(expected);
    expect(player.games[GAME].score).toBe(before + expected);
    expect(player.games[GAME].perfectLevels).toBe(1);
  });

  it('guarda uma estrela por nível concluído, na ordem', () => {
    const player = answerMany(createPlayerProgress(), PER_LEVEL * 2, true);

    expect(player.games[GAME].starsByLevel).toEqual([3, 3]);
    expect(player.games[GAME].level).toBe(3);
  });

  it('nunca tira pontos nem níveis de quem erra', () => {
    const withLevel = answerMany(createPlayerProgress(), PER_LEVEL, true);
    const scoreBefore = withLevel.games[GAME].score;

    const afterMisses = answerMany(withLevel, 5, false);

    expect(afterMisses.games[GAME].score).toBe(scoreBefore);
    expect(afterMisses.games[GAME].level).toBe(2);
    expect(afterMisses.games[GAME].currentStreak).toBe(0);
    expect(afterMisses.games[GAME].wrongAnswers).toBe(5);
  });

  it('zera a sequência no erro e guarda a melhor já alcançada', () => {
    const streaked = answerMany(createPlayerProgress(), 4, true);
    const broken = applyChallenge(streaked, GAME, false).player;

    expect(broken.games[GAME].currentStreak).toBe(0);
    expect(broken.games[GAME].bestStreak).toBe(4);
  });

  it('não mistura o progresso de jogos diferentes', () => {
    const player = answerMany(createPlayerProgress(), PER_LEVEL, true);

    expect(player.games[GAME].level).toBe(2);
    expect(player.games['quiz'].level).toBe(1);
    expect(player.games['quiz'].score).toBe(0);
  });

  it('desbloqueia a conquista do primeiro nível uma única vez', () => {
    const first = answerMany(createPlayerProgress(), PER_LEVEL, true);
    expect(first.unlockedAchievements).toContain('primeiro-nivel');

    const second = answerMany(first, PER_LEVEL, true);
    const occurrences = second.unlockedAchievements.filter((id) => id === 'primeiro-nivel');

    expect(occurrences.length).toBe(1);
  });

  it('guarda o melhor desempenho dentro de um nível como recorde', () => {
    let player = createPlayerProgress();
    player = answerMany(player, 6, true);
    player = answerMany(player, PER_LEVEL - 6, false);

    expect(player.games[GAME].bestLevelScore).toBe(6);
  });
});

describe('summarize', () => {
  it('soma a pontuação de todos os jogos e deriva o nível geral', () => {
    let player = answerMany(createPlayerProgress(), PER_LEVEL, true);
    player = answerMany(player, 3, true, 'quiz');

    const summary = summarize(player);
    const expectedScore = player.games[GAME].score + player.games['quiz'].score;

    expect(summary.totalScore).toBe(expectedScore);
    expect(summary.overallLevel).toBe(
      Math.floor(expectedScore / GAME_CONFIG.pointsPerOverallLevel) + 1,
    );
    expect(summary.challengesCompleted).toBe(PER_LEVEL + 3);
  });

  it('começa no nível geral 1 com a jornada zerada', () => {
    const summary = summarize(createPlayerProgress());

    expect(summary.overallLevel).toBe(1);
    expect(summary.totalScore).toBe(0);
    expect(summary.pointsToNextLevel).toBe(GAME_CONFIG.pointsPerOverallLevel);
  });
});

describe('nextGoalFor', () => {
  it('prefere o jogo já começado ao que ainda não foi tocado', () => {
    const player = answerMany(createPlayerProgress(), 7, true, 'quiz');
    const goal = nextGoalFor(player);

    expect(goal?.game.id).toBe('quiz');
    expect(goal?.remaining).toBe(gameDefinition('quiz').challengesPerLevel - 7);
    expect(goal?.nextLevel).toBe(2);
  });

  it('sugere o jogo mais curto quando nenhum foi começado', () => {
    const goal = nextGoalFor(createPlayerProgress());

    expect(goal?.game.id).toBe('feijoes');
  });
});

describe('levelFeedbackFor', () => {
  it('celebra sem apontar fracasso, qualquer que seja o resultado', () => {
    expect(levelFeedbackFor(10, 10)).toContain('INCRÍVEL');
    expect(levelFeedbackFor(8, 10)).toContain('MUITO BEM');
    expect(levelFeedbackFor(0, 10)).toContain('CONSEGUIU');
  });
});
