import type { GridCell } from '../../pedro-kart/models/track.model';

/**
 * Modelos das fases do Pedro Flash.
 *
 * Uma fase é um caminho de casas na mesma grade do Pedro Kart, mas aberto:
 * começa na largada e termina na chegada. É o mesmo formato para as fases
 * prontas e para as que o Pedro cria no Pedro Flash Maker, então qualquer
 * fase criada corre exatamente como uma das oficiais.
 */

export type FlashTheme = 'cidade' | 'praia' | 'vulcao' | 'gelo' | 'tempestade' | 'espaco';

/** O que pode morar numa casa do caminho. Cada casa tem no máximo uma peça. */
export type PieceKind =
  | 'raios'
  | 'mola'
  | 'turbo'
  | 'rampa'
  | 'loop'
  | 'caixa'
  | 'espinhos'
  | 'barreira'
  | 'buraco'
  | 'besouro'
  | 'abelha'
  | 'tatu';

/** Faixa da pista, de quem olha para a frente: -1 é a esquerda, 1 a direita. */
export type Lane = -1 | 0 | 1;

export interface CoursePiece {
  /** Posição da casa em `path`. */
  readonly cell: number;
  readonly kind: PieceKind;
  /** Peças que ocupam a pista inteira (mola, rampa, loop…) ignoram a faixa. */
  readonly lane: Lane;
}

export interface CourseDefinition {
  readonly id: string;
  readonly name: string;
  readonly theme: FlashTheme;
  /**
   * Casas do caminho, na ordem em que o Pedro corre por elas.
   *
   * Numa fase, a primeira é a largada e a última, a chegada. Numa arena de
   * chefão o caminho é fechado: a última casa encosta na primeira.
   */
  readonly path: readonly GridCell[];
  readonly isCircuit: boolean;
  readonly pieces: readonly CoursePiece[];
}

/** Fase criada no Pedro Flash Maker, guardada no aparelho. */
export interface CustomCourse extends CourseDefinition {
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const COURSE_LIMITS = {
  /** Com menos casas que isso a fase acaba antes de a criança pegar o ritmo. */
  minimumCells: 10,
  maximumNameLength: 32,
} as const;
