import {
  MATH_STORY_ITEMS,
  MATH_STORY_TEMPLATES,
} from '../../../core/data/math-game.data';
import { mathPlanFor } from '../../../core/games/difficulty';
import type { MathChallenge, MathOperation } from '../../../core/models/math-game.model';

/**
 * Geração das contas do jogo de matemática.
 *
 * Quem decide o que é difícil é o nível, e só ele — a idade não entra em
 * nenhuma conta deste arquivo. O gerador aleatório é um parâmetro para que os
 * testes possam sortear de forma previsível.
 */

export type RandomGenerator = () => number;

const OPTIONS_PER_CHALLENGE = 4;
const OPTION_SPREAD = 5;
const MAX_OPTION_ATTEMPTS = 24;

const MIN_TERM = 1;
const MIN_FACTOR = 2;
const MAX_FACTOR = 12;

/** Monta a conta de um desafio do nível informado. */
export function buildChallenge(
  level: number,
  index: number,
  random: RandomGenerator = Math.random,
  childName = 'Pedro',
): MathChallenge {
  const plan = mathPlanFor(level);
  const operation = plan.operations[index % plan.operations.length];
  const terms = buildTerms(operation, plan.ceiling, random);

  const statement = plan.useWordProblems
    ? buildStory(operation, terms, random, childName)
    : `${terms.first} ${symbolFor(operation)} ${terms.second}`;

  return {
    id: `math-${level}-${index + 1}`,
    operation,
    kind: plan.useWordProblems ? 'problema' : 'conta',
    statement,
    prompt: promptFor(operation, plan.useWordProblems),
    hint: hintFor(operation, terms),
    answer: terms.answer,
    options: plan.useOptions ? buildOptions(terms.answer, random) : [],
  };
}

/**
 * Lê o número digitado pela criança.
 *
 * Devolve `null` para qualquer coisa que não seja inteiro, e é isso que mantém
 * o botão de conferir desligado enquanto não existe uma resposta de verdade.
 */
export function parseTypedAnswer(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isInteger(parsed) ? parsed : null;
}

interface Terms {
  readonly first: number;
  readonly second: number;
  readonly answer: number;
}

function buildTerms(operation: MathOperation, ceiling: number, random: RandomGenerator): Terms {
  switch (operation) {
    case 'soma': {
      const first = randomInt(random, MIN_TERM, Math.max(MIN_TERM + 1, ceiling - 1));
      const second = randomInt(random, MIN_TERM, Math.max(MIN_TERM, ceiling - first));

      return { first, second, answer: first + second };
    }
    case 'subtracao': {
      const first = randomInt(random, 2, Math.max(3, ceiling));
      const second = randomInt(random, MIN_TERM, first - 1);

      return { first, second, answer: first - second };
    }
    case 'multiplicacao': {
      const limit = factorCeilingFor(ceiling);
      const first = randomInt(random, MIN_FACTOR, limit);
      const second = randomInt(random, MIN_FACTOR, limit);

      return { first, second, answer: first * second };
    }
    case 'divisao': {
      // Monta pelo resultado para que a divisão seja sempre exata.
      const limit = factorCeilingFor(ceiling);
      const divisor = randomInt(random, MIN_FACTOR, limit);
      const quotient = randomInt(random, MIN_FACTOR, limit);

      return { first: divisor * quotient, second: divisor, answer: quotient };
    }
  }
}

function symbolFor(operation: MathOperation): string {
  switch (operation) {
    case 'soma':
      return '+';
    case 'subtracao':
      return '−';
    case 'multiplicacao':
      return '×';
    case 'divisao':
      return '÷';
  }
}

function promptFor(operation: MathOperation, isStory: boolean): string {
  if (isStory) {
    return 'Leia com calma e descubra o resultado.';
  }

  switch (operation) {
    case 'soma':
      return 'Some os dois números.';
    case 'subtracao':
      return 'Descubra quanto sobra.';
    case 'multiplicacao':
      return 'Multiplique os dois números.';
    case 'divisao':
      return 'Divida em partes iguais.';
  }
}

function hintFor(operation: MathOperation, { first, second }: Terms): string {
  switch (operation) {
    case 'soma':
      return `Comece no ${first} e conte mais ${second}.`;
    case 'subtracao':
      return `Comece no ${first} e volte ${second} casinhas.`;
    case 'multiplicacao':
      return `É somar ${first} um total de ${second} vezes.`;
    case 'divisao':
      return `Quantas vezes o ${second} cabe dentro do ${first}?`;
  }
}

function buildStory(
  operation: MathOperation,
  terms: Terms,
  random: RandomGenerator,
  childName: string,
): string {
  const templates = MATH_STORY_TEMPLATES[operation];
  const template = templates[randomInt(random, 0, templates.length - 1)];
  const item = MATH_STORY_ITEMS[randomInt(random, 0, MATH_STORY_ITEMS.length - 1)];

  return template
    .replace('{nome}', childName)
    .replace('{a}', String(terms.first))
    .replace('{b}', String(terms.second))
    .replace('{item}', item);
}

/** Alternativas plausíveis: a resposta certa cercada de vizinhos próximos. */
function buildOptions(answer: number, random: RandomGenerator): readonly number[] {
  const values = new Set<number>([answer]);

  for (
    let attempt = 0;
    attempt < MAX_OPTION_ATTEMPTS && values.size < OPTIONS_PER_CHALLENGE;
    attempt += 1
  ) {
    const offset = randomInt(random, 1, OPTION_SPREAD);
    const candidate = random() < 0.5 ? answer - offset : answer + offset;

    if (candidate >= 0) {
      values.add(candidate);
    }
  }

  // Respostas pequenas têm poucos vizinhos válidos: completamos para cima.
  let filler = answer + OPTION_SPREAD;
  while (values.size < OPTIONS_PER_CHALLENGE) {
    filler += 1;
    values.add(filler);
  }

  return shuffle([...values], random);
}

/** Maior fator para que o produto não estoure o teto do nível. */
function factorCeilingFor(ceiling: number): number {
  const derived = Math.round(Math.sqrt(Math.max(4, ceiling)));

  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR + 1, derived));
}

function randomInt(random: RandomGenerator, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  const drawn = min + Math.floor(random() * (max - min + 1));

  return Math.min(max, Math.max(min, drawn));
}

function shuffle<T>(items: readonly T[], random: RandomGenerator): readonly T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomInt(random, 0, index);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}
