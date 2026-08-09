import { pickRandom } from '../../../core/utils/shuffle';

/**
 * Regras da Trilha (também conhecida como jogo dos nove feijões).
 *
 * O tabuleiro tem 24 casas distribuídas em três quadrados concêntricos ligados
 * pelo meio dos lados. Cada jogador começa com nove feijões e o jogo tem três
 * fases: colocar, mover para casas vizinhas e — quando restam apenas três
 * feijões — voar para qualquer casa vazia.
 */

export type BeanPlayer = 'crianca' | 'rival';
export type BeanCell = BeanPlayer | null;

export const BEANS_PER_PLAYER = 9;
/** Com menos de três feijões o jogador não consegue mais formar trilhas. */
export const MINIMUM_BEANS = 3;
/** Com exatamente três feijões o jogador ganha o direito de voar. */
export const FLYING_BEANS = 3;

export const EMPTY_BEAN_BOARD: readonly BeanCell[] = Array.from({ length: 24 }, () => null);

/** Posição de cada casa em porcentagem, para desenhar o tabuleiro. */
export interface BoardPoint {
  readonly x: number;
  readonly y: number;
}

const COLUMN_ROW_BY_POSITION: readonly (readonly [number, number])[] = [
  [0, 0], [3, 0], [6, 0],
  [1, 1], [3, 1], [5, 1],
  [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5],
  [0, 6], [3, 6], [6, 6],
];

export const BOARD_POINTS: readonly BoardPoint[] = COLUMN_ROW_BY_POSITION.map(([column, row]) => ({
  x: (column / 6) * 100,
  y: (row / 6) * 100,
}));

/** Casas vizinhas de cada posição, ligadas por uma linha do tabuleiro. */
export const NEIGHBOURS: readonly (readonly number[])[] = [
  [1, 9],
  [0, 2, 4],
  [1, 14],
  [4, 10],
  [1, 3, 5, 7],
  [4, 13],
  [7, 11],
  [4, 6, 8],
  [7, 12],
  [0, 10, 21],
  [3, 9, 11, 18],
  [6, 10, 15],
  [8, 13, 17],
  [5, 12, 14, 20],
  [2, 13, 23],
  [11, 16],
  [15, 17, 19],
  [12, 16],
  [10, 19],
  [16, 18, 20, 22],
  [13, 19],
  [9, 22],
  [19, 21, 23],
  [14, 22],
];

/** As 16 trilhas possíveis: oito na horizontal e oito na vertical. */
export const MILLS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
  [12, 13, 14],
  [15, 16, 17],
  [18, 19, 20],
  [21, 22, 23],
  [0, 9, 21],
  [3, 10, 18],
  [6, 11, 15],
  [1, 4, 7],
  [16, 19, 22],
  [8, 12, 17],
  [5, 13, 20],
  [2, 14, 23],
];

export function opponentOf(player: BeanPlayer): BeanPlayer {
  return player === 'crianca' ? 'rival' : 'crianca';
}

export function positionsOf(board: readonly BeanCell[], player: BeanPlayer): readonly number[] {
  return board.reduce<number[]>(
    (positions, cell, index) => (cell === player ? [...positions, index] : positions),
    [],
  );
}

export function emptyPositions(board: readonly BeanCell[]): readonly number[] {
  return board.reduce<number[]>(
    (positions, cell, index) => (cell === null ? [...positions, index] : positions),
    [],
  );
}

export function withBean(
  board: readonly BeanCell[],
  position: number,
  value: BeanCell,
): readonly BeanCell[] {
  return board.map((cell, index) => (index === position ? value : cell));
}

export function moveBean(
  board: readonly BeanCell[],
  from: number,
  to: number,
  player: BeanPlayer,
): readonly BeanCell[] {
  return board.map((cell, index) => {
    if (index === from) {
      return null;
    }
    return index === to ? player : cell;
  });
}

/** Trilhas completas do jogador que passam pela casa informada. */
export function millsAt(
  board: readonly BeanCell[],
  position: number,
  player: BeanPlayer,
): readonly (readonly [number, number, number])[] {
  return MILLS.filter(
    (mill) => mill.includes(position) && mill.every((cell) => board[cell] === player),
  );
}

export function formsMill(
  board: readonly BeanCell[],
  position: number,
  player: BeanPlayer,
): boolean {
  return millsAt(board, position, player).length > 0;
}

/** Todas as casas do jogador que fazem parte de alguma trilha completa. */
export function positionsInMills(
  board: readonly BeanCell[],
  player: BeanPlayer,
): readonly number[] {
  return positionsOf(board, player).filter((position) => formsMill(board, position, player));
}

/**
 * Feijões do adversário que podem ser comidos: os que estão fora de trilhas.
 * Se todos estiverem protegidos em trilhas, qualquer um pode ser comido.
 */
export function removablePositions(
  board: readonly BeanCell[],
  opponent: BeanPlayer,
): readonly number[] {
  const all = positionsOf(board, opponent);
  const unprotected = all.filter((position) => !formsMill(board, position, opponent));

  return unprotected.length > 0 ? unprotected : all;
}

export function canFly(beansOnBoard: number, beansInHand: number): boolean {
  return beansInHand === 0 && beansOnBoard === FLYING_BEANS;
}

/** Casas para onde o feijão da posição informada pode ir. */
export function destinationsFrom(
  board: readonly BeanCell[],
  from: number,
  isFlying: boolean,
): readonly number[] {
  if (isFlying) {
    return emptyPositions(board);
  }

  return NEIGHBOURS[from].filter((position) => board[position] === null);
}

export function hasAnyMove(
  board: readonly BeanCell[],
  player: BeanPlayer,
  beansInHand: number,
): boolean {
  if (beansInHand > 0) {
    return emptyPositions(board).length > 0;
  }

  const positions = positionsOf(board, player);
  if (canFly(positions.length, beansInHand)) {
    return emptyPositions(board).length > 0;
  }

  return positions.some((position) => destinationsFrom(board, position, false).length > 0);
}

export interface BeanMove {
  readonly from: number | null;
  readonly to: number;
}

/**
 * Escolha do computador para colocar ou mover um feijão.
 *
 * A ordem de prioridade é a mesma que uma criança aprende jogando: primeiro
 * fecha a própria trilha, depois estraga a trilha do outro e, por fim, ocupa a
 * casa com mais saídas.
 */
export function chooseBeanMove(
  board: readonly BeanCell[],
  player: BeanPlayer,
  beansInHand: number,
): BeanMove | null {
  const moves = listMoves(board, player, beansInHand);
  if (moves.length === 0) {
    return null;
  }

  const winning = moves.filter(({ from, to }) => formsMill(applyMove(board, { from, to }, player), to, player));
  if (winning.length > 0) {
    return pickRandom(winning) ?? null;
  }

  const opponent = opponentOf(player);
  const blocking = moves.filter(({ to }) => formsMill(withBean(board, to, opponent), to, opponent));
  if (blocking.length > 0) {
    return pickRandom(blocking) ?? null;
  }

  const bestConnectivity = Math.max(...moves.map(({ to }) => NEIGHBOURS[to].length));
  const connected = moves.filter(({ to }) => NEIGHBOURS[to].length === bestConnectivity);

  return pickRandom(connected) ?? null;
}

/** Feijão do adversário que o computador escolhe comer. */
export function chooseBeanToRemove(
  board: readonly BeanCell[],
  opponent: BeanPlayer,
): number | null {
  const candidates = removablePositions(board, opponent);
  if (candidates.length === 0) {
    return null;
  }

  // Prioriza o feijão que está a uma casa de fechar uma trilha do adversário.
  const threatening = candidates.filter((position) =>
    MILLS.some(
      (mill) =>
        mill.includes(position) &&
        mill.filter((cell) => board[cell] === opponent).length === 2 &&
        mill.some((cell) => board[cell] === null),
    ),
  );

  return pickRandom(threatening.length > 0 ? threatening : candidates) ?? null;
}

export function applyMove(
  board: readonly BeanCell[],
  move: BeanMove,
  player: BeanPlayer,
): readonly BeanCell[] {
  return move.from === null
    ? withBean(board, move.to, player)
    : moveBean(board, move.from, move.to, player);
}

function listMoves(
  board: readonly BeanCell[],
  player: BeanPlayer,
  beansInHand: number,
): readonly BeanMove[] {
  if (beansInHand > 0) {
    return emptyPositions(board).map((to) => ({ from: null, to }));
  }

  const positions = positionsOf(board, player);
  const isFlying = canFly(positions.length, beansInHand);

  return positions.flatMap((from) =>
    destinationsFrom(board, from, isFlying).map((to) => ({ from, to })),
  );
}
