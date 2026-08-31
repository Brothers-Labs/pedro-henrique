import type { EnglishChallenge } from '../../../core/models/english-quiz.model';

/**
 * Regras do jogo de inglês que não dependem de tela nem de estado do Angular.
 *
 * A conferência das respostas escritas é propositalmente generosa: uma criança
 * aprendendo a escrever erra maiúsculas, acentos e pontuação sem que isso
 * signifique que ela não sabe a palavra.
 */

/** Resultado da conferência de uma resposta escrita. */
export type WritingVerdict = 'certa' | 'quase' | 'errada';

/** XP extra concedido a partir de três acertos seguidos. */
export const STREAK_BONUS_XP = 5;
export const STREAK_BONUS_THRESHOLD = 3;

/** Erros de digitação tolerados para dizer "quase lá", conforme o tamanho. */
const LONG_ANSWER_LENGTH = 8;
const SHORT_ANSWER_LENGTH = 5;

const DIACRITIC_MARKS = /\p{M}/gu;
const APOSTROPHES = /['‘’`]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

/**
 * Reduz o texto a letras e números minúsculos separados por um único espaço,
 * para que `She doesn’t like coffee!` e `she doesnt like coffee` sejam iguais.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITIC_MARKS, '')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(NON_ALPHANUMERIC, ' ')
    .trim();
}

export function checkWritingAnswer(
  value: string,
  acceptedAnswers: readonly string[],
): WritingVerdict {
  const typed = normalizeAnswer(value);
  if (!typed) {
    return 'errada';
  }

  const accepted = acceptedAnswers.map((answer) => normalizeAnswer(answer));
  if (accepted.includes(typed)) {
    return 'certa';
  }

  const isNearMiss = accepted.some(
    (answer) => editDistance(typed, answer) <= typoToleranceFor(answer),
  );

  return isNearMiss ? 'quase' : 'errada';
}

export interface XpAwardInput {
  /** XP cheio da fase, definido pelo nível. */
  readonly baseXp: number;
  readonly usedHint: boolean;
  readonly missCount: number;
  /** Sequência de acertos já contando a fase recém-concluída. */
  readonly streak: number;
}

/** XP de uma fase concluída: metade quando houve ajuda, mais bônus de sequência. */
export function calculateEarnedXp({ baseXp, usedHint, missCount, streak }: XpAwardInput): number {
  const wasHelped = usedHint || missCount > 0;
  const earned = wasHelped ? Math.ceil(baseXp / 2) : baseXp;
  const bonus = streak >= STREAK_BONUS_THRESHOLD ? STREAK_BONUS_XP : 0;

  return earned + bonus;
}

/** Resposta certa já com a grafia que deve aparecer na tela. */
export function correctAnswerOf(challenge: EnglishChallenge): string {
  return challenge.kind === 'escolha'
    ? challenge.options[challenge.correctIndex]
    : challenge.acceptedAnswers[0];
}

/** Texto em inglês que o botão de áudio pronuncia. */
export function speakableTextOf(challenge: EnglishChallenge): string {
  return challenge.spokenText ?? correctAnswerOf(challenge);
}

function typoToleranceFor(answer: string): number {
  if (answer.length >= LONG_ANSWER_LENGTH) {
    return 2;
  }

  return answer.length >= SHORT_ANSWER_LENGTH ? 1 : 0;
}

/** Distância de Levenshtein com duas linhas, suficiente para frases curtas. */
function editDistance(first: string, second: string): number {
  if (first === second) {
    return 0;
  }

  let previousRow = Array.from({ length: second.length + 1 }, (_, column) => column);

  for (let row = 1; row <= first.length; row += 1) {
    const currentRow: number[] = [row];

    for (let column = 1; column <= second.length; column += 1) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;

      currentRow[column] = Math.min(
        currentRow[column - 1] + 1,
        previousRow[column] + 1,
        previousRow[column - 1] + substitutionCost,
      );
    }

    previousRow = currentRow;
  }

  return previousRow[second.length];
}
