import {
  MATH_AGE_BANDS,
  MATH_COUNTABLE_SYMBOLS,
  MATH_FALLBACK_BAND_ID,
  MATH_STAGE_EMOJIS,
} from '../../../core/data/math-game.data';
import type {
  MathAgeBand,
  MathOperation,
  MathStage,
  MathStageTier,
  MathTrail,
  MathTrailStep,
} from '../../../core/models/math-game.model';

/**
 * Regras do jogo de matemática que não dependem de tela nem do Angular.
 *
 * As contas são sorteadas, então o gerador aleatório é um parâmetro: em produção
 * usamos `Math.random`, nos testes um gerador previsível.
 */

/** Fases de uma trilha. Oito paradas cabem na tela sem virar maratona. */
export const STAGES_PER_TRAIL = 8;

/** Estrelas máximas por fase: acertar de primeira vale a nota cheia. */
export const MAX_STARS = 3;

const OPTIONS_PER_STAGE = 4;
const OPTION_SPREAD = 5;
const MAX_OPTION_ATTEMPTS = 24;

const MIN_CEILING = 2;
const MAX_COUNTABLE = 10;
const MIN_FACTOR = 2;
const MAX_FACTOR = 10;
const SEQUENCE_TERMS = 4;
const BIG_SEQUENCE_CEILING = 20;

export type RandomGenerator = () => number;

/** Faixa escolhida para a idade informada. */
export interface MathBandResolution {
  readonly band: MathAgeBand;
  /** Verdadeiro quando a idade não existia e caímos na faixa mais próxima. */
  readonly wasAdjusted: boolean;
}

const YOUNGEST_BAND = MATH_AGE_BANDS[0];
const OLDEST_BAND = MATH_AGE_BANDS[MATH_AGE_BANDS.length - 1];
const FALLBACK_BAND =
  MATH_AGE_BANDS.find((band) => band.id === MATH_FALLBACK_BAND_ID) ?? YOUNGEST_BAND;

/**
 * Traduz a idade em uma faixa jogável.
 *
 * Nunca falha: idade inválida cai na faixa padrão e idade fora do intervalo é
 * aproximada para a ponta mais próxima, para a criança nunca ficar sem trilha.
 */
export function resolveAgeBand(age: number): MathBandResolution {
  if (!Number.isFinite(age)) {
    return { band: FALLBACK_BAND, wasAdjusted: true };
  }

  const wholeAge = Math.trunc(age);

  if (wholeAge < YOUNGEST_BAND.minAge) {
    return { band: YOUNGEST_BAND, wasAdjusted: true };
  }
  if (wholeAge > OLDEST_BAND.maxAge) {
    return { band: OLDEST_BAND, wasAdjusted: true };
  }

  const band = MATH_AGE_BANDS.find(
    (candidate) => wholeAge >= candidate.minAge && wholeAge <= candidate.maxAge,
  );

  return band ? { band, wasAdjusted: wholeAge !== age } : { band: FALLBACK_BAND, wasAdjusted: true };
}

/** Monta a trilha inteira da faixa, da fase mais leve à mais desafiadora. */
export function buildTrail(band: MathAgeBand, random: RandomGenerator = Math.random): MathTrail {
  const stages = Array.from({ length: STAGES_PER_TRAIL }, (_, index): MathStage => {
    const operation = band.operations[index % band.operations.length];
    const content = buildStageContent(operation, ceilingFor(band, index), random);
    const hasOptions = index < band.stagesWithOptions;

    const base = {
      id: `${band.id}-${index + 1}`,
      operation,
      tier: tierFor(index),
      emoji: MATH_STAGE_EMOJIS[index % MATH_STAGE_EMOJIS.length],
      prompt: content.prompt,
      hint: content.hint,
      answer: content.answer,
      options: hasOptions ? buildOptions(content.answer, random) : [],
    };

    return content.kind === 'contagem'
      ? { ...base, kind: 'contagem', symbols: content.symbols }
      : { ...base, kind: 'expressao', expression: content.expression };
  });

  return { bandId: band.id, stages };
}

/**
 * Lê o número digitado pela criança.
 *
 * Devolve `null` para qualquer coisa que não seja um número inteiro, então o
 * botão de conferir só liga quando existe mesmo uma resposta.
 */
export function parseTypedAnswer(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isInteger(parsed) ? parsed : null;
}

/** Estrelas da fase: cheias no acerto de primeira, nunca menos de uma. */
export function starsForMisses(missCount: number): number {
  const penalty = Math.max(0, Math.trunc(missCount));

  return Math.max(1, MAX_STARS - penalty);
}

/** Percentual concluído da trilha, já arredondado para a barra de progresso. */
export function completionPercentage(completedStages: number, totalStages: number): number {
  if (totalStages <= 0) {
    return 0;
  }

  return Math.round((completedStages / totalStages) * 100);
}

/**
 * Prepara o mapa de fases.
 *
 * A trilha é sequencial: uma parada só abre quando a anterior foi concluída,
 * assim a criança sempre sabe qual é o próximo passo.
 */
export function buildTrailSteps(
  stages: readonly MathStage[],
  stars: readonly number[],
  currentIndex: number,
): readonly MathTrailStep[] {
  let isUnlocked = true;

  return stages.map((stage, index) => {
    const earnedStars = stars[index] ?? 0;
    const isCompleted = earnedStars > 0;
    const step: MathTrailStep = {
      index,
      stage,
      stars: earnedStars,
      isCompleted,
      isUnlocked,
      isCurrent: index === currentIndex,
    };

    isUnlocked = isUnlocked && isCompleted;

    return step;
  });
}

interface StageContentBase {
  readonly answer: number;
  readonly prompt: string;
  readonly hint: string;
}

type StageContent =
  | (StageContentBase & { readonly kind: 'contagem'; readonly symbols: readonly string[] })
  | (StageContentBase & { readonly kind: 'expressao'; readonly expression: string });

function buildStageContent(
  operation: MathOperation,
  ceiling: number,
  random: RandomGenerator,
): StageContent {
  switch (operation) {
    case 'contagem':
      return buildCounting(ceiling, random);
    case 'sequencia':
      return buildSequence(ceiling, random);
    case 'soma':
      return buildAddition(ceiling, random);
    case 'subtracao':
      return buildSubtraction(ceiling, random);
    case 'multiplicacao':
      return buildMultiplication(ceiling, random);
    case 'divisao':
      return buildDivision(ceiling, random);
  }
}

function buildCounting(ceiling: number, random: RandomGenerator): StageContent {
  const total = randomInt(random, MIN_CEILING, Math.min(safeCeiling(ceiling), MAX_COUNTABLE));
  const symbol = MATH_COUNTABLE_SYMBOLS[randomInt(random, 0, MATH_COUNTABLE_SYMBOLS.length - 1)];

  return {
    kind: 'contagem',
    symbols: Array.from({ length: total }, () => symbol),
    answer: total,
    prompt: 'Conte as figurinhas e escolha o número certo.',
    hint: 'Aponte para uma de cada vez e conte em voz alta.',
  };
}

function buildSequence(ceiling: number, random: RandomGenerator): StageContent {
  const highestStep = ceiling >= BIG_SEQUENCE_CEILING ? 5 : 2;
  const step = randomInt(random, 1, highestStep);
  const highestStart = Math.max(1, safeCeiling(ceiling) - step * (SEQUENCE_TERMS - 1));
  const start = randomInt(random, 1, highestStart);
  const terms = Array.from({ length: SEQUENCE_TERMS }, (_, index) => start + step * index);

  return {
    kind: 'expressao',
    expression: `${terms.slice(0, -1).join('  ·  ')}  ·  ?`,
    answer: terms[SEQUENCE_TERMS - 1],
    prompt: 'Descubra qual número vem depois.',
    hint: `Os números estão pulando de ${step} em ${step}.`,
  };
}

function buildAddition(ceiling: number, random: RandomGenerator): StageContent {
  const total = safeCeiling(ceiling);
  const first = randomInt(random, 1, total - 1);
  const second = randomInt(random, 1, total - first);

  return {
    kind: 'expressao',
    expression: `${first} + ${second}`,
    answer: first + second,
    prompt: 'Some os dois números.',
    hint: `Comece no ${first} e conte mais ${second}.`,
  };
}

function buildSubtraction(ceiling: number, random: RandomGenerator): StageContent {
  const first = randomInt(random, MIN_CEILING, safeCeiling(ceiling));
  const second = randomInt(random, 1, first);

  return {
    kind: 'expressao',
    expression: `${first} − ${second}`,
    answer: first - second,
    prompt: 'Descubra quanto sobra.',
    hint: `Comece no ${first} e volte ${second} casinhas.`,
  };
}

function buildMultiplication(ceiling: number, random: RandomGenerator): StageContent {
  const highestFactor = factorCeilingFor(ceiling);
  const first = randomInt(random, MIN_FACTOR, highestFactor);
  const second = randomInt(random, MIN_FACTOR, highestFactor);

  return {
    kind: 'expressao',
    expression: `${first} × ${second}`,
    answer: first * second,
    prompt: 'Multiplique os dois números.',
    hint: `É somar ${first} um total de ${second} vezes.`,
  };
}

function buildDivision(ceiling: number, random: RandomGenerator): StageContent {
  const highestFactor = factorCeilingFor(ceiling);
  const divisor = randomInt(random, MIN_FACTOR, highestFactor);
  const quotient = randomInt(random, MIN_FACTOR, highestFactor);
  const dividend = divisor * quotient;

  return {
    kind: 'expressao',
    expression: `${dividend} ÷ ${divisor}`,
    answer: quotient,
    prompt: 'Divida em partes iguais.',
    hint: `Quantas vezes o ${divisor} cabe dentro do ${dividend}?`,
  };
}

/** Alternativas plausíveis: a resposta certa cercada de vizinhos próximos. */
function buildOptions(answer: number, random: RandomGenerator): readonly number[] {
  const values = new Set<number>([answer]);

  for (
    let attempt = 0;
    attempt < MAX_OPTION_ATTEMPTS && values.size < OPTIONS_PER_STAGE;
    attempt += 1
  ) {
    const offset = randomInt(random, 1, OPTION_SPREAD);
    const candidate = random() < 0.5 ? answer - offset : answer + offset;

    if (candidate >= 0) {
      values.add(candidate);
    }
  }

  // Respostas muito pequenas têm poucos vizinhos válidos: completamos para cima.
  let filler = answer + OPTION_SPREAD;
  while (values.size < OPTIONS_PER_STAGE) {
    filler += 1;
    values.add(filler);
  }

  return shuffle([...values], random);
}

/** Teto da fase: cresce linearmente da primeira até a última parada. */
function ceilingFor(band: MathAgeBand, stageIndex: number): number {
  const span = band.lastStageCeiling - band.firstStageCeiling;
  const progress = STAGES_PER_TRAIL > 1 ? stageIndex / (STAGES_PER_TRAIL - 1) : 0;

  return Math.round(band.firstStageCeiling + span * progress);
}

function tierFor(stageIndex: number): MathStageTier {
  if (stageIndex < STAGES_PER_TRAIL / 3) {
    return 'facil';
  }

  return stageIndex < (STAGES_PER_TRAIL * 2) / 3 ? 'medio' : 'dificil';
}

/** Maior fator de multiplicação e divisão para que o produto respeite o teto. */
function factorCeilingFor(ceiling: number): number {
  const derived = Math.round(Math.sqrt(safeCeiling(ceiling)));

  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR + 1, derived));
}

function safeCeiling(ceiling: number): number {
  return Math.max(MIN_CEILING, Math.trunc(ceiling));
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
