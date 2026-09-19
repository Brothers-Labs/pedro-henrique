import type { TicTacToeSkill } from '../../../core/games/difficulty';
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

/** Chance de o adversário iniciante simplesmente jogar em qualquer lugar. */
const BEGINNER_MISTAKE_CHANCE = 0.45;

/**
 * Jogada do computador, conforme a força escolhida pelo nível.
 *
 * Nenhuma das três é imbatível — nem a última. Um jogo da velha jogado de
 * forma perfeita termina sempre empatado, e uma criança que nunca consegue
 * ganhar para de jogar. O `mestre` enxerga forquilhas; o `esperto` fecha e
 * bloqueia; o `iniciante` distrai-se de propósito quase metade das vezes.
 */
export function chooseComputerMove(
  board: readonly Cell[],
  skill: TicTacToeSkill = 'esperto',
  random: () => number = Math.random,
): number | null {
  const available = listAvailablePositions(board);
  if (available.length === 0) {
    return null;
  }

  if (skill === 'iniciante' && random() < BEGINNER_MISTAKE_CHANCE) {
    return pickRandom(available) ?? null;
  }

  const winningMove = findDecisiveMove(board, available, COMPUTER);
  if (winningMove !== null) {
    return winningMove;
  }

  const blockingMove = findDecisiveMove(board, available, HUMAN);
  if (blockingMove !== null) {
    return blockingMove;
  }

  if (skill === 'mestre') {
    const fork = findForkMove(board, available, COMPUTER) ?? findForkMove(board, available, HUMAN);
    if (fork !== null) {
      return fork;
    }
  }

  if (available.includes(CENTER)) {
    return CENTER;
  }

  const corners = available.filter((position) => CORNERS.includes(position));
  return pickRandom(corners.length > 0 ? corners : available) ?? null;
}

/**
 * Jogada que cria duas ameaças ao mesmo tempo.
 *
 * Serve tanto para armar a própria forquilha quanto para ocupar antes a casa
 * em que o adversário armaria a dele.
 */
function findForkMove(
  board: readonly Cell[],
  available: readonly number[],
  player: Player,
): number | null {
  return (
    available.find((position) => countThreats(applyMove(board, position, player), player) >= 2) ??
    null
  );
}

/** Linhas em que o jogador tem duas casas e a terceira está livre. */
function countThreats(board: readonly Cell[], player: Player): number {
  return WINNING_LINES.filter((line) => {
    const cells = line.map((position) => board[position]);

    return (
      cells.filter((cell) => cell === player).length === 2 &&
      cells.filter((cell) => cell === null).length === 1
    );
  }).length;
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
