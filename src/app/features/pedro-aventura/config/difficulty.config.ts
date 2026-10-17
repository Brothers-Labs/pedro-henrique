export type Difficulty = 'facil' | 'medio' | 'dificil';

export interface DifficultyDefinition {
  readonly id: Difficulty;
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
  /** Multiplica a velocidade inicial e a final de cada fase. */
  readonly speedMultiplier: number;
  /** Soma à densidade de obstáculos da fase (0 a 1). */
  readonly densityBonus: number;
  readonly maxLives: number;
  /** Tempo de invencibilidade depois de cada batida. */
  readonly invulnerableSeconds: number;
  /** Multiplica o XP de temporada que a partida rende. */
  readonly xpMultiplier: number;
}

/**
 * Os três jeitos de jogar.
 *
 * O Fácil é o jogo de sempre e o padrão: a primeira corrida tem que dar
 * vontade de correr de novo. Médio e Difícil aceleram, enchem a pista e
 * pagam mais XP — nunca tiram o que a criança já ganhou.
 */
export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  {
    id: 'facil',
    label: 'Fácil',
    emoji: '🐢',
    description: 'O jogo de sempre: 3 corações e tempo para pensar.',
    speedMultiplier: 1,
    densityBonus: 0,
    maxLives: 3,
    invulnerableSeconds: 1.5,
    xpMultiplier: 1,
  },
  {
    id: 'medio',
    label: 'Médio',
    emoji: '🐇',
    description: 'Mais rápido e com mais obstáculos. +25% de XP.',
    speedMultiplier: 1.15,
    densityBonus: 0.12,
    maxLives: 3,
    invulnerableSeconds: 1.2,
    xpMultiplier: 1.25,
  },
  {
    id: 'dificil',
    label: 'Difícil',
    emoji: '🐆',
    description: 'Velocidade máxima, pista cheia e só 2 corações. +50% de XP.',
    speedMultiplier: 1.3,
    densityBonus: 0.22,
    maxLives: 2,
    invulnerableSeconds: 1,
    xpMultiplier: 1.5,
  },
];

export const DEFAULT_DIFFICULTY: Difficulty = 'facil';

const DIFFICULTIES_BY_ID = new Map(DIFFICULTIES.map((difficulty) => [difficulty.id, difficulty]));

export function difficultyById(id: Difficulty): DifficultyDefinition {
  const difficulty = DIFFICULTIES_BY_ID.get(id);

  if (!difficulty) {
    throw new Error(`Dificuldade "${id}" não existe em DIFFICULTIES.`);
  }

  return difficulty;
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTIES_BY_ID.has(value as Difficulty);
}
