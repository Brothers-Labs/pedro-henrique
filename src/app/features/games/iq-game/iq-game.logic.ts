import type {
  IqAdaptiveState,
  IqAnswerRecord,
  IqDifficulty,
  IqSkill,
  IqSkillScore,
} from '../../../core/models/iq-game.model';

/**
 * Regras do desafio de raciocínio que não dependem de tela.
 *
 * O que sobrou aqui é o miolo do jogo: mover a dificuldade conforme o
 * desempenho recente e resumir como foi cada habilidade na rodada. Nada disso
 * produz diagnóstico — são números de jogo, e é assim que a tela os apresenta.
 */

export const MIN_DIFFICULTY: IqDifficulty = 1;
export const MAX_DIFFICULTY: IqDifficulty = 5;

/** Acertos (ou erros) seguidos para a dificuldade mudar de degrau. */
export const STREAK_TO_ADAPT = 2;

/** Estrelas máximas por habilidade no resumo da rodada. */
export const MAX_SKILL_STARS = 5;

/** Ordem das habilidades no resumo; fixa para a lista não dançar entre rodadas. */
export const IQ_SKILLS: readonly IqSkill[] = [
  'logica',
  'numeros',
  'visual',
  'memoria',
  'atencao',
  'linguagem',
];

/**
 * Move a dificuldade conforme o desempenho recente.
 *
 * Dois acertos seguidos sobem um degrau; dois erros seguidos descem um. A queda
 * é silenciosa de propósito: a criança nunca é avisada de que o jogo ficou mais
 * fácil, só de que ficou mais difícil.
 */
export function nextAdaptiveState(state: IqAdaptiveState, wasCorrect: boolean): IqAdaptiveState {
  if (wasCorrect) {
    const correctStreak = state.correctStreak + 1;
    const reachedThreshold = correctStreak >= STREAK_TO_ADAPT;
    const hasLevelledUp = reachedThreshold && state.difficulty < MAX_DIFFICULTY;

    return {
      difficulty: hasLevelledUp ? stepDifficulty(state.difficulty, 1) : state.difficulty,
      correctStreak: reachedThreshold ? 0 : correctStreak,
      wrongStreak: 0,
      hasLevelledUp,
    };
  }

  const wrongStreak = state.wrongStreak + 1;
  const reachedThreshold = wrongStreak >= STREAK_TO_ADAPT;
  const shouldLevelDown = reachedThreshold && state.difficulty > MIN_DIFFICULTY;

  return {
    difficulty: shouldLevelDown ? stepDifficulty(state.difficulty, -1) : state.difficulty,
    correctStreak: 0,
    wrongStreak: reachedThreshold ? 0 : wrongStreak,
    hasLevelledUp: false,
  };
}

/** Estrelas de uma habilidade: 0 quando ainda não foi praticada, senão de 1 a 5. */
export function starsForAccuracy(accuracy: number, answered: number): number {
  if (answered === 0) {
    return 0;
  }

  return Math.max(1, Math.round(accuracy * MAX_SKILL_STARS));
}

/**
 * Desempenho por habilidade dentro da rodada.
 *
 * As habilidades que não apareceram ficam de fora: mostrar "0 estrelas" para
 * algo que a criança nem chegou a tentar pareceria uma nota baixa.
 */
export function buildSkillScores(answers: readonly IqAnswerRecord[]): readonly IqSkillScore[] {
  return IQ_SKILLS.map((skill) => {
    const ofSkill = answers.filter((answer) => answer.skill === skill);
    const correct = ofSkill.filter((answer) => answer.wasCorrect).length;
    const accuracy = ofSkill.length === 0 ? 0 : correct / ofSkill.length;

    return {
      skill,
      answered: ofSkill.length,
      correct,
      accuracy,
      stars: starsForAccuracy(accuracy, ofSkill.length),
    };
  }).filter((score) => score.answered > 0);
}

function stepDifficulty(difficulty: IqDifficulty, delta: number): IqDifficulty {
  const next = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, difficulty + delta));

  return next as IqDifficulty;
}
