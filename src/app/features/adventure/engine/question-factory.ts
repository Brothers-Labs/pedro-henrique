import {
  buildAnswerOptions,
  buildChallengeFromPlan,
  type RandomGenerator,
} from '../../games/math-game/math-game.logic';
import type { AdventureLevel, MathRound } from '../models/adventure.model';

/** Pergunta pronta para a tela, igual para qualquer tipo de atividade. */
export interface AdventureQuestion {
  readonly id: string;
  readonly kind: 'conta' | 'problema' | 'sequencia';
  readonly prompt: string;
  readonly statement: string;
  readonly hint: string;
  readonly options: readonly string[];
  readonly answer: string;
}

/** Tentativas de sortear uma pergunta diferente das que já saíram na fase. */
const MAX_DRAW_ATTEMPTS = 6;

const SEQUENCE_VISIBLE_TERMS = 4;

/**
 * Monta todas as perguntas de uma partida de uma vez.
 *
 * Sortear tudo no começo deixa a partida previsível do primeiro ao último
 * toque — o número de perguntas na barra nunca muda — e permite evitar que a
 * mesma conta apareça duas vezes na mesma fase.
 */
export function buildLevelQuestions(
  level: AdventureLevel,
  random: RandomGenerator = Math.random,
  childName = 'Pedro',
): readonly AdventureQuestion[] {
  const { activity } = level;
  const questions: AdventureQuestion[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < activity.questionCount; index += 1) {
    const round = activity.rounds[index % activity.rounds.length];
    const id = `${level.id}-${index + 1}`;
    let question = buildMathQuestion(round, id, random, childName);

    for (let attempt = 1; attempt < MAX_DRAW_ATTEMPTS && seen.has(question.statement); attempt += 1) {
      question = buildMathQuestion(round, id, random, childName);
    }

    seen.add(question.statement);
    questions.push(question);
  }

  return questions;
}

function buildMathQuestion(round: MathRound, id: string, random: RandomGenerator, childName: string): AdventureQuestion {
  if (round.operation === 'sequencia') {
    return buildSequenceQuestion(round.ceiling, id, random);
  }

  const challenge = buildChallengeFromPlan(
    {
      operations: [round.operation],
      ceiling: round.ceiling,
      useOptions: true,
      useWordProblems: round.asWordProblem === true,
    },
    id,
    0,
    random,
    childName,
  );

  return {
    id,
    kind: challenge.kind,
    prompt: challenge.prompt,
    statement: challenge.statement,
    hint: challenge.hint,
    options: challenge.options.map(String),
    answer: String(challenge.answer),
  };
}

/**
 * Sequência que cresce sempre do mesmo tanto: "3, 5, 7, 9, ?".
 *
 * O passo cresce com o teto, mas o último termo nunca passa dele — assim a
 * sequência continua do tamanho que a fase prometeu.
 */
function buildSequenceQuestion(ceiling: number, id: string, random: RandomGenerator): AdventureQuestion {
  const maxStep = Math.max(1, Math.floor(ceiling / (SEQUENCE_VISIBLE_TERMS + 1)));
  const step = randomInt(random, 1, Math.min(maxStep, 10));
  const start = randomInt(random, 0, Math.max(0, ceiling - step * SEQUENCE_VISIBLE_TERMS));
  const terms = Array.from({ length: SEQUENCE_VISIBLE_TERMS }, (_, position) => start + position * step);
  const answer = start + SEQUENCE_VISIBLE_TERMS * step;

  return {
    id,
    kind: 'sequencia',
    prompt: 'Qual número vem depois?',
    statement: `${terms.join(', ')}, ?`,
    hint: step === 1 ? 'Os números andam de 1 em 1.' : `Os números pulam de ${step} em ${step}.`,
    options: buildAnswerOptions(answer, random).map(String),
    answer: String(answer),
  };
}

function randomInt(random: RandomGenerator, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return Math.min(max, min + Math.floor(random() * (max - min + 1)));
}
