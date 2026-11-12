/**
 * Formato das fases do Pedro Pedrerê.
 *
 * Uma fase é uma grade de texto, uma linha por fileira de blocos. É o mesmo
 * formato para as fases prontas e para as que o Pedro cria no modo maker:
 * fácil de ler no código, pequeno para guardar no aparelho e simples de
 * validar quando volta do armazenamento.
 */

/** Cada caractere da grade e o que ele representa. */
export const TILE = {
  empty: '.',
  ground: '#',
  brick: 'B',
  trampoline: 'T',
  coin: 'o',
  spike: '^',
  pebble: 'e',
  checkpoint: 'C',
  start: 'S',
  goal: 'F',
} as const;

export type TileKey = keyof typeof TILE;
export type TileChar = (typeof TILE)[TileKey];

export type LevelTheme = 'campo' | 'praia' | 'noite' | 'neve';

export interface PedrereLevel {
  readonly id: string;
  readonly name: string;
  readonly theme: LevelTheme;
  /** Fileiras de cima para baixo; todas com a mesma largura. */
  readonly rows: readonly string[];
}

/** Todas as fases têm a mesma altura: a câmera só anda para os lados. */
export const LEVEL_HEIGHT = 14;
export const MIN_LEVEL_WIDTH = 24;
export const MAX_LEVEL_WIDTH = 120;

export interface GridPoint {
  readonly column: number;
  readonly row: number;
}
