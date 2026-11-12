import {
  type GridPoint,
  LEVEL_HEIGHT,
  MAX_LEVEL_WIDTH,
  MIN_LEVEL_WIDTH,
  type PedrereLevel,
  TILE,
  type TileChar,
} from '../models/level.model';

/** O que pode existir parado no cenário; moedas, pedrinhas e marcos viram listas à parte. */
export type TerrainKind = 'empty' | 'ground' | 'brick' | 'trampoline' | 'spike';

export type LevelProblem =
  | 'tamanho-invalido'
  | 'bloco-desconhecido'
  | 'sem-inicio'
  | 'sem-chegada'
  | 'inicio-repetido'
  | 'chegada-repetida';

export const LEVEL_PROBLEM_MESSAGES: Readonly<Record<LevelProblem, string>> = {
  'tamanho-invalido': 'A fase tem um tamanho que o jogo não conhece.',
  'bloco-desconhecido': 'A fase tem um bloco que o jogo não conhece.',
  'sem-inicio': 'Coloque o Pedro (início) em algum lugar da fase.',
  'sem-chegada': 'Coloque a bandeira de chegada em algum lugar da fase.',
  'inicio-repetido': 'A fase só pode ter um início.',
  'chegada-repetida': 'A fase só pode ter uma chegada.',
};

const KNOWN_TILES: ReadonlySet<string> = new Set<string>(Object.values(TILE));

const TERRAIN_BY_TILE: Readonly<Partial<Record<TileChar, TerrainKind>>> = {
  [TILE.ground]: 'ground',
  [TILE.brick]: 'brick',
  [TILE.trampoline]: 'trampoline',
  [TILE.spike]: 'spike',
};

/** A fase já lida: o cenário fixo de um lado e o que se mexe ou some do outro. */
export interface LevelLayout {
  readonly width: number;
  readonly height: number;
  readonly start: GridPoint;
  readonly goal: GridPoint;
  readonly coins: readonly GridPoint[];
  readonly pebbles: readonly GridPoint[];
  readonly checkpoints: readonly GridPoint[];
  terrainAt(column: number, row: number): TerrainKind;
}

/** Tudo o que impede a fase de ser jogada; lista vazia quando ela está pronta. */
export function findLevelProblems(rows: readonly string[]): readonly LevelProblem[] {
  const width = rows[0]?.length ?? 0;

  if (
    rows.length !== LEVEL_HEIGHT ||
    width < MIN_LEVEL_WIDTH ||
    width > MAX_LEVEL_WIDTH ||
    rows.some((row) => row.length !== width)
  ) {
    return ['tamanho-invalido'];
  }

  const problems: LevelProblem[] = [];
  const text = rows.join('');

  if ([...text].some((tile) => !KNOWN_TILES.has(tile))) {
    problems.push('bloco-desconhecido');
  }

  const starts = countOf(text, TILE.start);
  const goals = countOf(text, TILE.goal);

  if (starts === 0) {
    problems.push('sem-inicio');
  } else if (starts > 1) {
    problems.push('inicio-repetido');
  }

  if (goals === 0) {
    problems.push('sem-chegada');
  } else if (goals > 1) {
    problems.push('chegada-repetida');
  }

  return problems;
}

/**
 * Lê a fase para a simulação.
 *
 * Falha alto quando a fase tem problema: quem chama já devia ter validado, e
 * uma fase quebrada rodando em silêncio seria muito mais difícil de achar.
 */
export function layoutLevel(level: PedrereLevel): LevelLayout {
  const problems = findLevelProblems(level.rows);

  if (problems.length > 0) {
    throw new Error(`A fase "${level.name}" não pode ser jogada: ${problems.join(', ')}.`);
  }

  const width = level.rows[0].length;
  const terrain: TerrainKind[] = [];
  const coins: GridPoint[] = [];
  const pebbles: GridPoint[] = [];
  const checkpoints: GridPoint[] = [];
  let start: GridPoint = { column: 0, row: 0 };
  let goal: GridPoint = { column: 0, row: 0 };

  level.rows.forEach((line, row) => {
    [...line].forEach((tile, column) => {
      const point = { column, row };

      terrain.push(TERRAIN_BY_TILE[tile as TileChar] ?? 'empty');

      switch (tile) {
        case TILE.coin:
          coins.push(point);
          break;
        case TILE.pebble:
          pebbles.push(point);
          break;
        case TILE.checkpoint:
          checkpoints.push(point);
          break;
        case TILE.start:
          start = point;
          break;
        case TILE.goal:
          goal = point;
          break;
      }
    });
  });

  return {
    width,
    height: LEVEL_HEIGHT,
    start,
    goal,
    coins,
    pebbles,
    checkpoints,
    terrainAt: (column, row) => {
      // As laterais são paredes; acima e abaixo da fase não há nada.
      if (column < 0 || column >= width) {
        return 'ground';
      }

      if (row < 0 || row >= LEVEL_HEIGHT) {
        return 'empty';
      }

      return terrain[row * width + column];
    },
  };
}

export function isSolidTerrain(kind: TerrainKind): boolean {
  return kind === 'ground' || kind === 'brick' || kind === 'trampoline';
}

function countOf(text: string, tile: TileChar): number {
  let count = 0;

  for (const character of text) {
    if (character === tile) {
      count += 1;
    }
  }

  return count;
}
