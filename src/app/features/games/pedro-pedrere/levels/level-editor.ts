import { LEVEL_HEIGHT, MAX_LEVEL_WIDTH, MIN_LEVEL_WIDTH, TILE, type TileChar } from '../models/level.model';
import { GROUND_TOP } from './level-sketch';

export interface LevelSize {
  readonly id: 'curta' | 'media' | 'longa';
  readonly label: string;
  readonly width: number;
}

export const LEVEL_SIZES: readonly LevelSize[] = [
  { id: 'curta', label: 'Curta', width: 40 },
  { id: 'media', label: 'Média', width: 70 },
  { id: 'longa', label: 'Longa', width: 100 },
];

/** Blocos que só podem aparecer uma vez: colocar de novo muda o lugar. */
const UNIQUE_TILES: ReadonlySet<TileChar> = new Set<TileChar>([TILE.start, TILE.goal]);

/**
 * Fase em branco para começar a criar: chão inteiro, o Pedro no começo e a
 * bandeira no fim. Já nasce jogável — a criança só enfeita.
 */
export function createBlankRows(width: number): readonly string[] {
  assertWidth(width);

  return Array.from({ length: LEVEL_HEIGHT }, (_, row) => {
    if (row >= GROUND_TOP) {
      return TILE.ground.repeat(width);
    }

    if (row === GROUND_TOP - 1) {
      return TILE.empty.repeat(2) + TILE.start + TILE.empty.repeat(width - 6) + TILE.goal + TILE.empty.repeat(2);
    }

    return TILE.empty.repeat(width);
  });
}

/**
 * Pinta um bloco e devolve a grade nova, sem mexer na anterior.
 *
 * O início e a chegada são únicos: pintá-los num lugar novo apaga o antigo,
 * em vez de deixar a fase com dois Pedros.
 */
export function paintTile(rows: readonly string[], column: number, row: number, tile: TileChar): readonly string[] {
  const current = rows[row]?.[column];

  if (current === undefined || current === tile) {
    return rows;
  }

  return rows.map((line, lineIndex) => {
    let next = line;

    if (UNIQUE_TILES.has(tile)) {
      next = next.replaceAll(tile, TILE.empty);
    }

    return lineIndex === row ? replaceAt(next, column, tile) : next;
  });
}

/**
 * Muda a largura da fase: corta o fim ou estica com chão.
 *
 * Cortar pode levar a bandeira junto; a validação de salvar avisa, e o
 * editor não decide sozinho onde recolocá-la.
 */
export function resizeRows(rows: readonly string[], width: number): readonly string[] {
  assertWidth(width);

  return rows.map((line, row) => {
    if (line.length >= width) {
      return line.slice(0, width);
    }

    const filler = row >= GROUND_TOP ? TILE.ground : TILE.empty;

    return line + filler.repeat(width - line.length);
  });
}

function replaceAt(line: string, column: number, tile: TileChar): string {
  return line.slice(0, column) + tile + line.slice(column + 1);
}

function assertWidth(width: number): void {
  if (!Number.isInteger(width) || width < MIN_LEVEL_WIDTH || width > MAX_LEVEL_WIDTH) {
    throw new Error(`Largura de fase inválida: ${width}.`);
  }
}
