import { LEVEL_HEIGHT, TILE, type TileChar } from '../models/level.model';

/** Fileira da superfície do chão padrão: o Pedro fica de pé na fileira de cima dela. */
export const GROUND_TOP = 12;

/**
 * Rascunho de fase para montar as fases prontas no código.
 *
 * Escrever catorze linhas de texto à mão erra a largura com facilidade; aqui
 * cada pedaço da fase é uma chamada com nome, e qualquer bloco fora da grade
 * falha na hora em vez de virar uma fase torta.
 */
export class LevelSketch {
  private readonly cells: TileChar[][];

  constructor(readonly width: number) {
    this.cells = Array.from({ length: LEVEL_HEIGHT }, () => Array.from({ length: width }, () => TILE.empty));
  }

  /** Chão maciço de `from` a `to` (inclusive), com a superfície na fileira `top`. */
  ground(from: number, to: number, top: number = GROUND_TOP): this {
    for (let column = from; column <= to; column += 1) {
      for (let row = top; row < LEVEL_HEIGHT; row += 1) {
        this.put(column, row, TILE.ground);
      }
    }

    return this;
  }

  /** Uma fileira horizontal do mesmo bloco, começando em `column`. */
  line(column: number, row: number, length: number, tile: TileChar): this {
    for (let offset = 0; offset < length; offset += 1) {
      this.put(column + offset, row, tile);
    }

    return this;
  }

  /** Uma pilha do mesmo bloco, de `fromRow` até `toRow` (inclusive). */
  stack(column: number, fromRow: number, toRow: number, tile: TileChar): this {
    for (let row = fromRow; row <= toRow; row += 1) {
      this.put(column, row, tile);
    }

    return this;
  }

  put(column: number, row: number, tile: TileChar): this {
    if (column < 0 || column >= this.width || row < 0 || row >= LEVEL_HEIGHT) {
      throw new Error(`Bloco fora da fase: coluna ${column}, fileira ${row}.`);
    }

    this.cells[row][column] = tile;

    return this;
  }

  toRows(): readonly string[] {
    return this.cells.map((row) => row.join(''));
  }
}
