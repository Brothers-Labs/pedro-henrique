import { pickRandom } from '../../../core/utils/shuffle';

export type Player = '❌' | '⭕';
export type Cell = Player | null;
export type WinningLine = readonly [number, number, number];

export const HUMAN: Player = '❌';
export const COMPUTER: Player = '⭕';
export const EMPTY_BOARD: readonly Cell[] = Array.from({ length: 9 }, () => null);

const CENTER = 4;
const CORNERS: readonly number[] = [0, 2, 6, 8];

const WINNING_LINES: readonly WinningLine[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Devolve a linha vencedora do tabuleiro, ou `null` se ainda não houver uma. */
export function findWinningLine(board: readonly Cell[]): WinningLine | null {
  return (
    WINNING_LINES.find(
      ([first, second, third]) =>
        board[first] !== null && board[first] === board[second] && board[second] === board[third],
    ) ?? null
  );
}

export function listAvailablePositions(board: readonly Cell[]): readonly number[] {
  return board.reduce<number[]>(
    (positions, cell, index) => (cell === null ? [...positions, index] : positions),
    [],
  );
}

export function applyMove(board: readonly Cell[], position: number, player: Player): readonly Cell[] {
  return board.map((cell, index) => (index === position ? player : cell));
}

/**
 * Estratégia do computador: fecha o jogo se puder, bloqueia a vitória do
 * jogador, e só então escolhe centro, canto ou lateral. Deixa a partida
 * disputada sem ser impossível de vencer.
 */
export function chooseComputerMove(board: readonly Cell[]): number | null {
  const available = listAvailablePositions(board);
  if (available.length === 0) {
    return null;
  }

  const winningMove = findDecisiveMove(board, available, COMPUTER);
  if (winningMove !== null) {
    return winningMove;
  }

  const blockingMove = findDecisiveMove(board, available, HUMAN);
  if (blockingMove !== null) {
    return blockingMove;
  }

  if (available.includes(CENTER)) {
    return CENTER;
  }

  const corners = available.filter((position) => CORNERS.includes(position));
  return pickRandom(corners.length > 0 ? corners : available) ?? null;
}

/** Encontra a jogada que fecha uma linha para o jogador informado. */
function findDecisiveMove(
  board: readonly Cell[],
  available: readonly number[],
  player: Player,
): number | null {
  return (
    available.find((position) => findWinningLine(applyMove(board, position, player)) !== null) ??
    null
  );
}
