/**
 * Modelos das pistas do Pedro Kart.
 *
 * Uma pista é um caminho fechado de casas numa grade: é o mesmo formato para
 * as pistas prontas e para as que o Pedro desenha no Pedro Kart Maker, então
 * qualquer pista criada corre exatamente como uma das oficiais.
 */

export type TrackTheme = 'parque' | 'praia' | 'gelo' | 'dinos' | 'espaco';

/** Casa da grade do editor; `column` cresce para a direita e `row` para baixo. */
export interface GridCell {
  readonly column: number;
  readonly row: number;
}

export interface TrackDefinition {
  readonly id: string;
  readonly name: string;
  readonly theme: TrackTheme;
  readonly laps: number;
  /**
   * Casas do circuito, na ordem em que os karts passam por elas.
   *
   * A primeira é a da largada; a última encosta na primeira, fechando a volta.
   */
  readonly path: readonly GridCell[];
  /** Posições em `path` que têm placa de turbo no chão. */
  readonly boostCells: readonly number[];
  /** Posições em `path` que têm caixas de surpresa. */
  readonly itemCells: readonly number[];
}

/** Pista criada no Pedro Kart Maker, guardada no aparelho. */
export interface CustomTrack extends TrackDefinition {
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Medidas da grade do editor, em casas. */
export const TRACK_GRID = {
  columns: 14,
  rows: 10,
  /** Tamanho de uma casa no mundo 3D, em metros do jogo. */
  cellSize: 16,
  /** Um circuito com menos casas que isso vira só um rodamoinho. */
  minimumCells: 8,
  minimumLaps: 1,
  maximumLaps: 5,
  maximumNameLength: 32,
} as const;
