import {
  IQ_ATTENTION_SETS,
  IQ_COUNTING_SYMBOL,
  IQ_LANGUAGE_ITEMS,
  IQ_MEMORY_TOKENS,
  IQ_PATTERN_SETS,
} from '../../../core/data/iq-game.data';
import type {
  IqChallenge,
  IqChallengeType,
  IqDifficulty,
  IqFigure,
  IqSkill,
  IqToken,
} from '../../../core/models/iq-game.model';

/**
 * Fábrica de desafios do Desafio da Mente.
 *
 * Cada tipo sabe montar a si mesmo a partir da dificuldade e dos bancos de
 * peças. O sorteio recebe o gerador aleatório por parâmetro: em produção é o
 * `Math.random`, nos testes um gerador previsível.
 */

export type IqRandom = () => number;

/** Habilidade avaliada por cada tipo de desafio. */
export const SKILL_BY_TYPE: Readonly<Record<IqChallengeType, IqSkill>> = {
  padrao: 'logica',
  sequencia: 'numeros',
  diferente: 'visual',
  rotacao: 'visual',
  memoria: 'memoria',
  atencao: 'atencao',
  linguagem: 'linguagem',
};

const OPTIONS_PER_CHALLENGE = 4;
const FIGURE_SIZE = 3;
const FIGURE_CELLS = FIGURE_SIZE * FIGURE_SIZE;
const MAX_GENERATION_ATTEMPTS = 40;

/** Peças distintas que formam a unidade repetida de cada padrão. */
const PATTERN_PERIODS: Readonly<Record<IqDifficulty, number>> = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 4 };

/** Quantas peças o padrão mostra antes da incógnita. */
const PATTERN_VISIBLE: Readonly<Record<IqDifficulty, number>> = { 1: 4, 2: 4, 3: 6, 4: 7, 5: 8 };

interface SequenceRule {
  readonly kind: 'soma' | 'multiplica';
  readonly step: number;
  readonly maxStart: number;
}

/** Regras das sequências numéricas, da contagem simples ao salto grande. */
const SEQUENCE_RULES: Readonly<Record<IqDifficulty, readonly [SequenceRule, ...SequenceRule[]]>> = {
  1: [{ kind: 'soma', step: 1, maxStart: 3 }],
  2: [
    { kind: 'soma', step: 2, maxStart: 6 },
    { kind: 'soma', step: 5, maxStart: 5 },
  ],
  3: [
    { kind: 'soma', step: 3, maxStart: 9 },
    { kind: 'soma', step: 4, maxStart: 8 },
    { kind: 'soma', step: 10, maxStart: 9 },
  ],
  4: [
    { kind: 'multiplica', step: 2, maxStart: 5 },
    { kind: 'soma', step: 7, maxStart: 12 },
  ],
  5: [
    { kind: 'multiplica', step: 3, maxStart: 4 },
    { kind: 'soma', step: 11, maxStart: 15 },
  ],
};

/** Itens memorizados por dificuldade e tempo que a sequência fica na tela. */
const MEMORY_LENGTHS: Readonly<Record<IqDifficulty, number>> = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 };
const MEMORY_EXPOSURE_MS: Readonly<Record<IqDifficulty, number>> = {
  1: 4500,
  2: 4000,
  3: 3600,
  4: 3200,
  5: 3000,
};

/** Formato da grade de atenção: cresce junto com a dificuldade. */
const ATTENTION_GRIDS: Readonly<Record<IqDifficulty, { columns: number; rows: number }>> = {
  1: { columns: 4, rows: 3 },
  2: { columns: 4, rows: 4 },
  3: { columns: 5, rows: 4 },
  4: { columns: 6, rows: 4 },
  5: { columns: 6, rows: 5 },
};

/** Células pintadas nas figuras; mais células, diferença mais sutil. */
const FIGURE_FILLED_CELLS: Readonly<Record<IqDifficulty, number>> = { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5 };

/** Figura em "L", assimétrica de propósito: serve de rede de segurança. */
const FALLBACK_FIGURE_CELLS: readonly boolean[] = [
  true, false, false,
  true, false, false,
  true, true, false,
];

/**
 * Monta um desafio pronto para a tela.
 *
 * `order` só entra no identificador, para que dois desafios iguais sorteados na
 * mesma jornada continuem sendo linhas diferentes na lista.
 */
export function createChallenge(
  type: IqChallengeType,
  difficulty: IqDifficulty,
  order: number,
  random: IqRandom = Math.random,
): IqChallenge {
  const id = `${type}-${difficulty}-${order}`;

  switch (type) {
    case 'padrao':
      return createPattern(id, difficulty, random);
    case 'sequencia':
      return createSequence(id, difficulty, random);
    case 'diferente':
      return createOddFigure(id, difficulty, random);
    case 'rotacao':
      return createRotation(id, difficulty, random);
    case 'memoria':
      return createMemory(id, difficulty, random);
    case 'atencao':
      return createAttention(id, difficulty, random);
    case 'linguagem':
      return createLanguage(id, difficulty, random);
  }
}

/* Padrões e lógica --------------------------------------------------------- */

function createPattern(id: string, difficulty: IqDifficulty, random: IqRandom): IqChallenge {
  const set = pickOne(
    IQ_PATTERN_SETS.filter((candidate) => candidate.minDifficulty <= difficulty),
    random,
    IQ_PATTERN_SETS[0],
  );
  const period = Math.min(PATTERN_PERIODS[difficulty], set.tokens.length);
  const unit = shuffle(set.tokens, random).slice(0, period);
  const visibleCount = PATTERN_VISIBLE[difficulty];
  const sequence = Array.from({ length: visibleCount }, (_, index) => unit[index % period]);
  const answer = unit[visibleCount % period];
  const { options, correctIndex } = arrangeOptions(set.tokens, answer, random);

  return {
    id,
    type: 'padrao',
    skill: 'logica',
    difficulty,
    prompt: 'Qual peça continua o padrão?',
    format: 'tokens',
    sequence,
    options,
    correctIndex,
  };
}

/* Sequências numéricas ------------------------------------------------------ */

function createSequence(id: string, difficulty: IqDifficulty, random: IqRandom): IqChallenge {
  const rule = pickOne(SEQUENCE_RULES[difficulty], random, SEQUENCE_RULES[difficulty][0]);
  const start = randomInt(random, 1, rule.maxStart);
  const terms = Array.from({ length: 5 }, (_, index) => applyRule(rule, start, index));
  const answer = terms[terms.length - 1];
  const isVisualCounting = difficulty === 1;

  const toToken = (value: number): IqToken =>
    isVisualCounting
      ? { symbol: IQ_COUNTING_SYMBOL.repeat(value), label: `${value} bolinhas` }
      : { symbol: String(value), label: String(value) };

  const answerToken = toToken(answer);
  const distractors = numberDistractors(answer, random).map(toToken);
  const { options, correctIndex } = arrangeOptions(
    [answerToken, ...distractors],
    answerToken,
    random,
  );

  return {
    id,
    type: 'sequencia',
    skill: 'numeros',
    difficulty,
    prompt: isVisualCounting ? 'Conte e descubra o que vem depois.' : 'Qual número vem depois?',
    format: 'tokens',
    sequence: terms.slice(0, -1).map(toToken),
    options,
    correctIndex,
  };
}

function applyRule(rule: SequenceRule, start: number, index: number): number {
  return rule.kind === 'soma' ? start + rule.step * index : start * rule.step ** index;
}

/** Vizinhos plausíveis do resultado, sempre positivos e sem repetição. */
function numberDistractors(answer: number, random: IqRandom): readonly number[] {
  const values = new Set<number>();
  const spread = Math.max(2, Math.round(answer * 0.2));

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS && values.size < 3; attempt += 1) {
    const offset = randomInt(random, 1, spread);
    const candidate = random() < 0.5 ? answer - offset : answer + offset;

    if (candidate > 0 && candidate !== answer) {
      values.add(candidate);
    }
  }

  let filler = answer + spread;
  while (values.size < 3) {
    filler += 1;
    values.add(filler);
  }

  return [...values];
}

/* Raciocínio visual --------------------------------------------------------- */

function createOddFigure(id: string, difficulty: IqDifficulty, random: IqRandom): IqChallenge {
  const baseCells = randomCells(FIGURE_FILLED_CELLS[difficulty], random);
  const tone = pickOne(FIGURE_TONES, random, 'blue');
  // Abaixo da dificuldade 3 a peça diferente também muda de cor, para que a
  // diferença salte aos olhos de quem ainda está aprendendo a comparar formas.
  const oddTone = difficulty <= 2 ? nextTone(tone) : tone;
  const oddIndex = randomInt(random, 0, OPTIONS_PER_CHALLENGE - 1);

  const options = Array.from({ length: OPTIONS_PER_CHALLENGE }, (_, index): IqFigure => {
    const isOdd = index === oddIndex;

    return {
      cells: isOdd ? moveOneCell(baseCells, random) : baseCells,
      tone: isOdd ? oddTone : tone,
      label: `figura ${index + 1}`,
    };
  });

  return {
    id,
    type: 'diferente',
    skill: 'visual',
    difficulty,
    prompt: 'Qual figura é diferente das outras?',
    format: 'figuras',
    reference: null,
    options,
    correctIndex: oddIndex,
  };
}

function createRotation(id: string, difficulty: IqDifficulty, random: IqRandom): IqChallenge {
  const baseCells = chiralCells(FIGURE_FILLED_CELLS[difficulty], random);
  const tone = pickOne(FIGURE_TONES, random, 'purple');
  const mirrored = mirrorCells(baseCells);

  const correct = rotateCells(baseCells, randomInt(random, 1, 3));
  const distractors = [1, 2, 3].map((turns) => rotateCells(mirrored, turns));

  const figures = [correct, ...distractors].map(
    (cells, index): IqFigure => ({ cells, tone, label: `figura ${index + 1}` }),
  );
  const { options, correctIndex } = arrangeOptions(figures, figures[0], random);

  return {
    id,
    type: 'rotacao',
    skill: 'visual',
    difficulty,
    prompt: 'Qual figura é a mesma lá de cima, só que girada?',
    format: 'figuras',
    reference: { cells: baseCells, tone, label: 'figura original' },
    options: options.map((figure, index) => ({ ...figure, label: `figura ${index + 1}` })),
    correctIndex,
  };
}

/* Memória -------------------------------------------------------------------- */

function createMemory(id: string, difficulty: IqDifficulty, random: IqRandom): IqChallenge {
  const length = Math.min(MEMORY_LENGTHS[difficulty], IQ_MEMORY_TOKENS.length);
  const pool = shuffle(IQ_MEMORY_TOKENS, random);
  const sequence = pool.slice(0, length);
  const targetPosition = randomInt(random, 1, length);
  const answer = sequence[targetPosition - 1];

  // Nos níveis iniciais os distratores nem apareceram na sequência: basta
  // reconhecer. Depois eles vêm da própria sequência, e aí a ordem importa.
  const others =
    difficulty <= 2
      ? pool.slice(length, length + OPTIONS_PER_CHALLENGE - 1)
      : shuffle(
          sequence.filter((token) => token !== answer),
          random,
        ).slice(0, OPTIONS_PER_CHALLENGE - 1);

  const { options, correctIndex } = arrangeOptions([answer, ...others], answer, random);

  return {
    id,
    type: 'memoria',
    skill: 'memoria',
    difficulty,
    prompt: `Qual figurinha estava no lugar ${targetPosition}?`,
    format: 'memoria',
    sequence,
    exposureMs: MEMORY_EXPOSURE_MS[difficulty],
    targetPosition,
    options,
    correctIndex,
  };
}

/* Atenção --------------------------------------------------------------------- */

function createAttention(id: string, difficulty: IqDifficulty, random: IqRandom): IqChallenge {
  const set = pickOne(IQ_ATTENTION_SETS, random, IQ_ATTENTION_SETS[0]);
  const { columns, rows } = ATTENTION_GRIDS[difficulty];
  const total = columns * rows;
  const targetIndex = randomInt(random, 0, total - 1);

  const grid = Array.from({ length: total }, (_, index) =>
    index === targetIndex
      ? set.target
      : set.distractors[randomInt(random, 0, set.distractors.length - 1)],
  );

  return {
    id,
    type: 'atencao',
    skill: 'atencao',
    difficulty,
    prompt: `Encontre ${set.target.label} na grade.`,
    format: 'atencao',
    target: set.target,
    grid,
    columns,
    correctIndex: targetIndex,
  };
}

/* Palavras e significados ------------------------------------------------------ */

function createLanguage(id: string, difficulty: IqDifficulty, random: IqRandom): IqChallenge {
  const available = IQ_LANGUAGE_ITEMS.filter(
    (item) => item.minDifficulty <= difficulty && difficulty <= item.maxDifficulty,
  );
  const item = pickOne(
    available.length > 0 ? available : IQ_LANGUAGE_ITEMS,
    random,
    IQ_LANGUAGE_ITEMS[0],
  );
  const answer = item.options[item.correctIndex];
  const { options, correctIndex } = arrangeOptions(item.options, answer, random);

  return {
    id,
    type: 'linguagem',
    skill: 'linguagem',
    difficulty,
    prompt: item.prompt,
    format: 'tokens',
    sequence: [],
    options,
    correctIndex,
  };
}

/* Figuras: rotação, espelho e comparação ---------------------------------------- */

const FIGURE_TONES = ['blue', 'purple', 'mint', 'orange'] as const;

/** Gira a grade 3x3 em passos de 90 graus no sentido horário. */
export function rotateCells(cells: readonly boolean[], turns: number): readonly boolean[] {
  let rotated = [...cells];

  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn += 1) {
    rotated = rotated.map((_, index) => {
      const row = Math.floor(index / FIGURE_SIZE);
      const column = index % FIGURE_SIZE;
      // A célula que chega aqui vinha da coluna oposta da mesma diagonal.
      return rotated[(FIGURE_SIZE - 1 - column) * FIGURE_SIZE + row];
    });
  }

  return rotated;
}

/** Espelha a grade na horizontal. */
export function mirrorCells(cells: readonly boolean[]): readonly boolean[] {
  return cells.map((_, index) => {
    const row = Math.floor(index / FIGURE_SIZE);
    const column = index % FIGURE_SIZE;

    return cells[row * FIGURE_SIZE + (FIGURE_SIZE - 1 - column)];
  });
}

/** Chave que identifica a figura independentemente de quantas voltas ela deu. */
export function rotationKey(cells: readonly boolean[]): string {
  const keys = [0, 1, 2, 3].map((turns) => cellsToKey(rotateCells(cells, turns)));

  return [...keys].sort()[0];
}

function cellsToKey(cells: readonly boolean[]): string {
  return cells.map((cell) => (cell ? '1' : '0')).join('');
}

/**
 * Figura própria para a rotação.
 *
 * Precisa de duas garantias: não coincidir com o próprio espelho (senão o
 * distrator viraria resposta certa) e ter quatro giros diferentes entre si
 * (senão duas alternativas apareceriam idênticas na tela).
 */
function chiralCells(filled: number, random: IqRandom): readonly boolean[] {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = randomCells(filled, random);

    if (hasFourDistinctRotations(candidate) && rotationKey(candidate) !== rotationKey(mirrorCells(candidate))) {
      return candidate;
    }
  }

  return FALLBACK_FIGURE_CELLS;
}

function hasFourDistinctRotations(cells: readonly boolean[]): boolean {
  const keys = new Set([0, 1, 2, 3].map((turns) => cellsToKey(rotateCells(cells, turns))));

  return keys.size === 4;
}

function randomCells(filled: number, random: IqRandom): readonly boolean[] {
  const positions = shuffle(
    Array.from({ length: FIGURE_CELLS }, (_, index) => index),
    random,
  ).slice(0, Math.min(filled, FIGURE_CELLS));

  return Array.from({ length: FIGURE_CELLS }, (_, index) => positions.includes(index));
}

/** Move uma célula pintada para um espaço vazio, mantendo a mesma quantidade. */
function moveOneCell(cells: readonly boolean[], random: IqRandom): readonly boolean[] {
  const filled = cells.flatMap((cell, index) => (cell ? [index] : []));
  const empty = cells.flatMap((cell, index) => (cell ? [] : [index]));

  if (filled.length === 0 || empty.length === 0) {
    return cells;
  }

  const from = filled[randomInt(random, 0, filled.length - 1)];
  const to = empty[randomInt(random, 0, empty.length - 1)];

  const moved = [...cells];
  moved[from] = false;
  moved[to] = true;

  return moved;
}

function nextTone(tone: (typeof FIGURE_TONES)[number]): (typeof FIGURE_TONES)[number] {
  const index = FIGURE_TONES.indexOf(tone);

  return FIGURE_TONES[(index + 1) % FIGURE_TONES.length];
}

/* Sorteio -------------------------------------------------------------------- */

/** Embaralha as alternativas e diz onde a resposta certa foi parar. */
function arrangeOptions<TItem>(
  candidates: readonly TItem[],
  answer: TItem,
  random: IqRandom,
): { readonly options: readonly TItem[]; readonly correctIndex: number } {
  const others = candidates.filter((candidate) => candidate !== answer);
  const chosen = [answer, ...others.slice(0, OPTIONS_PER_CHALLENGE - 1)];
  const options = shuffle(chosen, random);

  return { options, correctIndex: options.indexOf(answer) };
}

function pickOne<TItem>(items: readonly TItem[], random: IqRandom, fallback: TItem): TItem {
  return items.length === 0 ? fallback : items[randomInt(random, 0, items.length - 1)];
}

function randomInt(random: IqRandom, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  const drawn = min + Math.floor(random() * (max - min + 1));

  return Math.min(max, Math.max(min, drawn));
}

function shuffle<TItem>(items: readonly TItem[], random: IqRandom): TItem[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomInt(random, 0, index);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}
