import type {
  MathAgeBand,
  MathBandId,
  MathOperation,
  MathStageTier,
} from '../models/math-game.model';

/**
 * Conteúdo do jogo de matemática.
 *
 * Nada de contas prontas aqui: guardamos só as regras de cada faixa etária e as
 * frases da tela. As contas nascem na hora, para que a trilha nunca se repita
 * igual e a criança possa jogar quantas vezes quiser.
 */

/** Faixas em ordem crescente de idade; a busca por idade depende dessa ordem. */
export const MATH_AGE_BANDS: readonly [MathAgeBand, ...MathAgeBand[]] = [
  {
    id: 'descobrindo',
    label: 'Descobrindo os números',
    emoji: '🌱',
    color: 'mint',
    minAge: 4,
    maxAge: 5,
    description: 'Contar figurinhas, completar sequências e somar bem pouquinho.',
    operations: ['contagem', 'sequencia', 'soma'],
    firstStageCeiling: 5,
    lastStageCeiling: 10,
    stagesWithOptions: 8,
  },
  {
    id: 'somando',
    label: 'Somando e tirando',
    emoji: '🚀',
    color: 'blue',
    minAge: 6,
    maxAge: 7,
    description: 'Somas e subtrações simples até 20.',
    operations: ['soma', 'subtracao'],
    firstStageCeiling: 10,
    lastStageCeiling: 20,
    stagesWithOptions: 4,
  },
  {
    id: 'crescendo',
    label: 'Contas que crescem',
    emoji: '🧭',
    color: 'purple',
    minAge: 8,
    maxAge: 9,
    description: 'Somas, subtrações e as primeiras multiplicações.',
    operations: ['soma', 'subtracao', 'multiplicacao'],
    firstStageCeiling: 20,
    lastStageCeiling: 50,
    stagesWithOptions: 2,
  },
  {
    id: 'desafiando',
    label: 'Desafio dos craques',
    emoji: '🐉',
    color: 'orange',
    minAge: 10,
    maxAge: 12,
    description: 'Multiplicação, divisão e contas com números maiores.',
    operations: ['multiplicacao', 'divisao', 'subtracao', 'soma'],
    firstStageCeiling: 40,
    lastStageCeiling: 100,
    stagesWithOptions: 0,
  },
];

/** Faixa usada quando a idade informada não cai em nenhuma outra. */
export const MATH_FALLBACK_BAND_ID: MathBandId = 'somando';

/** Idades oferecidas na tela inicial. */
export const MATH_PLAYABLE_AGES: readonly number[] = [4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Idade pré-selecionada, para a criança poder começar com um clique só. */
export const MATH_DEFAULT_AGE = 7;

/** Figurinhas contáveis das fases de contagem. */
export const MATH_COUNTABLE_SYMBOLS: readonly string[] = [
  '🍎',
  '🧸',
  '⭐',
  '🐢',
  '🍌',
  '🚗',
  '🌻',
  '🐞',
];

/** Cenário de cada parada do mapa, na ordem em que a trilha avança. */
export const MATH_STAGE_EMOJIS: readonly string[] = [
  '🌳',
  '🍄',
  '💎',
  '🏔️',
  '🌊',
  '🔥',
  '🌈',
  '🏰',
];

/** Comemorações do acerto, escolhidas pela fase para não piscarem na tela. */
export const MATH_CELEBRATIONS: readonly string[] = [
  'Acertou! Você é craque nas contas.',
  'Isso mesmo! Seguindo firme na trilha.',
  'Boa! Essa conta você já domina.',
  'Perfeito! A próxima ilha te espera.',
];

/** Incentivos do erro: sempre convidam a tentar de novo, nunca corrigem duro. */
export const MATH_ENCOURAGEMENTS: readonly string[] = [
  'Quase lá! Conte de novo com calma.',
  'Tudo bem errar. Bora tentar mais uma vez!',
  'Você está perto. Que tal pedir uma dica?',
];

export const MATH_OPERATION_LABELS: Readonly<Record<MathOperation, string>> = {
  contagem: 'Contagem',
  sequencia: 'Sequência',
  soma: 'Soma',
  subtracao: 'Subtração',
  multiplicacao: 'Multiplicação',
  divisao: 'Divisão',
};

export const MATH_TIER_LABELS: Readonly<Record<MathStageTier, string>> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};
