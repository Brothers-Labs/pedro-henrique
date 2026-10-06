import type { GridCell, TrackDefinition } from '../models/track.model';

type Move = 'R' | 'L' | 'U' | 'D';

const STEPS: Readonly<Record<Move, GridCell>> = {
  R: { column: 1, row: 0 },
  L: { column: -1, row: 0 },
  U: { column: 0, row: -1 },
  D: { column: 0, row: 1 },
};

/**
 * Desenha um circuito a partir da largada e de uma lista de passos.
 *
 * "R4 U2" quer dizer quatro casas para a direita e duas para cima: é o jeito
 * mais legível de escrever uma pista à mão, e o teste garante que cada uma
 * fecha a volta direitinho.
 */
export function traceRoute(start: GridCell, route: string): readonly GridCell[] {
  const cells: GridCell[] = [start];

  for (const token of route.trim().split(/\s+/)) {
    const move = token[0] as Move;
    const step = STEPS[move];
    const count = Number(token.slice(1));

    if (!step || !Number.isInteger(count) || count < 1) {
      throw new Error(`Passo "${token}" inválido no traçado da pista.`);
    }

    for (let index = 0; index < count; index += 1) {
      const last = cells[cells.length - 1];

      cells.push({ column: last.column + step.column, row: last.row + step.row });
    }
  }

  return cells;
}

/**
 * As cinco pistas oficiais, da mais fácil para a mais difícil.
 *
 * Cada uma num cenário diferente: a primeira é um retângulo, para aprender a
 * fazer curva; as outras vão ganhando zigue-zagues e grampos.
 */
export const DEFAULT_TRACKS: readonly TrackDefinition[] = [
  {
    id: 'circuito-do-parque',
    name: 'Circuito do Parque',
    theme: 'parque',
    laps: 3,
    path: traceRoute({ column: 2, row: 7 }, 'R9 U5 L9 D4'),
    boostCells: [4, 18],
    itemCells: [8, 22],
  },
  {
    id: 'praia-do-sol',
    name: 'Praia do Sol',
    theme: 'praia',
    laps: 3,
    path: traceRoute({ column: 3, row: 8 }, 'R8 U3 L3 U3 L5 D3 L2 D2 R1 D1'),
    boostCells: [5, 20],
    itemCells: [10, 25],
  },
  {
    id: 'montanha-gelada',
    name: 'Montanha Gelada',
    theme: 'gelo',
    laps: 3,
    path: traceRoute({ column: 1, row: 8 }, 'R5 U2 R3 D2 R3 U6 L3 D2 L3 U3 L5 D6'),
    boostCells: [3, 16, 36],
    itemCells: [8, 24, 40],
  },
  {
    id: 'vale-dos-dinossauros',
    name: 'Vale dos Dinossauros',
    theme: 'dinos',
    laps: 3,
    path: traceRoute({ column: 2, row: 8 }, 'R10 U3 L2 U3 R2 U1 L11 D3 R4 D2 L4 D2'),
    boostCells: [6, 27],
    itemCells: [12, 30, 40],
  },
  {
    id: 'pista-das-estrelas',
    name: 'Pista das Estrelas',
    theme: 'espaco',
    laps: 3,
    path: traceRoute({ column: 6, row: 9 }, 'R6 U8 L4 D4 L3 U4 L4 D8 R4'),
    boostCells: [4, 12, 35],
    itemCells: [9, 22, 38],
  },
];

const TRACKS_BY_ID = new Map(DEFAULT_TRACKS.map((track) => [track.id, track]));

export function defaultTrack(id: string): TrackDefinition | undefined {
  return TRACKS_BY_ID.get(id);
}
