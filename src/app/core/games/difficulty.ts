import type { EnglishChallengeKind, EnglishLevelId } from '../models/english-quiz.model';
import type { IqDifficulty } from '../models/iq-game.model';
import type { MathOperation } from '../models/math-game.model';

/**
 * Tradução de nível em dificuldade concreta, um jogo de cada vez.
 *
 * É aqui que "nível 8" vira multiplicação, um adversário mais esperto ou nove
 * pares de cartas. A idade não entra em nenhuma destas contas: ela continua no
 * perfil como referência, mas quem manda na dificuldade é o desempenho.
 *
 * Todas as funções são degraus explícitos, e não fórmulas: assim dá para ler a
 * progressão inteira de um jogo de cima a baixo e ajustar um degrau sozinho.
 */

/* Matemática --------------------------------------------------------------- */

export interface MathLevelPlan {
  /** Operações sorteadas no nível, percorridas em ciclo. */
  readonly operations: readonly [MathOperation, ...MathOperation[]];
  /** Maior número envolvido nas contas. */
  readonly ceiling: number;
  /** Verdadeiro enquanto a resposta é escolhida entre botões. */
  readonly useOptions: boolean;
  /** A partir daqui a conta vem embrulhada em uma historinha. */
  readonly useWordProblems: boolean;
}

/** Até que nível a resposta continua sendo escolhida entre alternativas. */
const MATH_LAST_LEVEL_WITH_OPTIONS = 6;

/** Degraus da matemática; o último vale para todos os níveis acima dele. */
const MATH_STEPS: readonly { readonly upTo: number; readonly plan: Omit<MathLevelPlan, 'useOptions' | 'useWordProblems'> }[] = [
  { upTo: 2, plan: { operations: ['soma'], ceiling: 10 } },
  { upTo: 4, plan: { operations: ['subtracao', 'soma'], ceiling: 15 } },
  { upTo: 6, plan: { operations: ['soma', 'subtracao'], ceiling: 30 } },
  { upTo: 8, plan: { operations: ['multiplicacao', 'soma'], ceiling: 50 } },
  { upTo: 10, plan: { operations: ['divisao', 'multiplicacao'], ceiling: 60 } },
  { upTo: 15, plan: { operations: ['multiplicacao', 'divisao', 'subtracao', 'soma'], ceiling: 90 } },
  {
    upTo: Number.POSITIVE_INFINITY,
    plan: { operations: ['soma', 'subtracao', 'multiplicacao', 'divisao'], ceiling: 120 },
  },
];

export function mathPlanFor(level: number): MathLevelPlan {
  const safeLevel = normalizeLevel(level);
  const step = MATH_STEPS.find((candidate) => safeLevel <= candidate.upTo) ?? MATH_STEPS[MATH_STEPS.length - 1];

  return {
    ...step.plan,
    useOptions: safeLevel <= MATH_LAST_LEVEL_WITH_OPTIONS,
    useWordProblems: safeLevel >= 16,
  };
}

/* Memória ------------------------------------------------------------------ */

/** Pares iniciais e teto: acima disso o tabuleiro não cabe bem no celular. */
const MEMORY_FIRST_LEVEL_PAIRS = 4;
const MEMORY_MAX_PAIRS = 10;

/** Nível em que as cartas passam a virar de volta mais rápido. */
const MEMORY_FAST_FLIP_LEVEL = 8;

export interface MemoryLevelPlan {
  readonly pairs: number;
  /** Tempo que um par errado fica visível antes de desvirar. */
  readonly mismatchDelayMs: number;
}

export function memoryPlanFor(level: number): MemoryLevelPlan {
  const safeLevel = normalizeLevel(level);

  return {
    pairs: Math.min(MEMORY_MAX_PAIRS, MEMORY_FIRST_LEVEL_PAIRS + safeLevel - 1),
    mismatchDelayMs: safeLevel >= MEMORY_FAST_FLIP_LEVEL ? 600 : 900,
  };
}

/* Jogo da velha ------------------------------------------------------------ */

/**
 * Força do adversário.
 *
 * Nenhum dos três é imbatível, nem o último: um jogo da velha perfeito termina
 * sempre empatado, e uma criança que nunca consegue ganhar para de jogar.
 */
export type TicTacToeSkill = 'iniciante' | 'esperto' | 'mestre';

export function ticTacToeSkillFor(level: number): TicTacToeSkill {
  const safeLevel = normalizeLevel(level);

  if (safeLevel <= 3) {
    return 'iniciante';
  }

  return safeLevel <= 7 ? 'esperto' : 'mestre';
}

/* Trilha dos feijões -------------------------------------------------------- */

/** O rival da trilha usa a mesma escala do jogo da velha, em degraus mais largos. */
export function beansSkillFor(level: number): TicTacToeSkill {
  const safeLevel = normalizeLevel(level);

  if (safeLevel <= 2) {
    return 'iniciante';
  }

  return safeLevel <= 5 ? 'esperto' : 'mestre';
}

/* Quiz --------------------------------------------------------------------- */

/** Faixa de dificuldade das perguntas, de 1 (direta) a 3 (exige raciocínio). */
export type QuizTier = 1 | 2 | 3;

export function quizTierFor(level: number): QuizTier {
  const safeLevel = normalizeLevel(level);

  if (safeLevel <= 3) {
    return 1;
  }

  return safeLevel <= 7 ? 2 : 3;
}

/* Inglês ------------------------------------------------------------------- */

export interface EnglishLevelPlan {
  /** Bancos sorteados no nível, do mais leve ao mais pesado. */
  readonly tiers: readonly [EnglishLevelId, ...EnglishLevelId[]];
  /** Formatos aceitos; escrever é mais difícil do que escolher. */
  readonly kinds: readonly [EnglishChallengeKind, ...EnglishChallengeKind[]];
}

const ENGLISH_STEPS: readonly { readonly upTo: number; readonly plan: EnglishLevelPlan }[] = [
  { upTo: 2, plan: { tiers: ['facil'], kinds: ['escolha'] } },
  { upTo: 4, plan: { tiers: ['facil', 'medio'], kinds: ['escolha'] } },
  { upTo: 6, plan: { tiers: ['medio'], kinds: ['escolha', 'escrita'] } },
  { upTo: 8, plan: { tiers: ['medio', 'dificil'], kinds: ['escolha', 'escrita'] } },
  {
    upTo: Number.POSITIVE_INFINITY,
    plan: { tiers: ['dificil'], kinds: ['escolha', 'escrita'] },
  },
];

export function englishPlanFor(level: number): EnglishLevelPlan {
  const safeLevel = normalizeLevel(level);
  const step =
    ENGLISH_STEPS.find((candidate) => safeLevel <= candidate.upTo) ??
    ENGLISH_STEPS[ENGLISH_STEPS.length - 1];

  return step.plan;
}

/* Desafio de raciocínio ----------------------------------------------------- */

/** Dificuldade inicial do desafio; ele continua se adaptando durante a rodada. */
export function reasoningDifficultyFor(level: number): IqDifficulty {
  const safeLevel = normalizeLevel(level);
  const step = Math.ceil(safeLevel / 2);

  return Math.min(5, Math.max(1, step)) as IqDifficulty;
}

function normalizeLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : 1;
}
