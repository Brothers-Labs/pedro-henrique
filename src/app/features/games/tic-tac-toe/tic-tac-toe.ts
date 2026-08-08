import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';

import { pickRandom } from '../../../core/utils/shuffle';

type Player = '❌' | '⭕';
type Cell = Player | null;

const HUMAN: Player = '❌';
const COMPUTER: Player = '⭕';
const EMPTY_BOARD: readonly Cell[] = Array.from({ length: 9 }, () => null);
const COMPUTER_DELAY_IN_MS = 450;

const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

@Component({
  selector: 'app-tic-tac-toe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tic-tac-toe.html',
  styleUrl: './tic-tac-toe.scss',
})
export class TicTacToe {
  private computerTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly board = signal<readonly Cell[]>(EMPTY_BOARD);
  protected readonly isComputerThinking = signal(false);

  protected readonly winningLine = computed(() => findWinningLine(this.board()));
  protected readonly winner = computed<Cell>(() => {
    const line = this.winningLine();
    return line ? this.board()[line[0]] : null;
  });
  protected readonly isDraw = computed(
    () => !this.winner() && this.board().every((cell) => cell !== null),
  );
  protected readonly isFinished = computed(() => this.winner() !== null || this.isDraw());

  protected readonly statusMessage = computed(() => {
    const winner = this.winner();
    if (winner === HUMAN) {
      return 'Você ganhou! Muito bem!';
    }
    if (winner === COMPUTER) {
      return 'Dessa vez eu ganhei. Bora de novo?';
    }
    if (this.isDraw()) {
      return 'Deu velha! Ninguém ganhou.';
    }
    return this.isComputerThinking() ? 'Estou pensando…' : 'Sua vez: clique em um quadrado.';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearComputerTimeout());
  }

  protected play(position: number): void {
    if (this.isFinished() || this.isComputerThinking() || this.board()[position] !== null) {
      return;
    }

    this.mark(position, HUMAN);

    if (this.isFinished()) {
      return;
    }

    this.isComputerThinking.set(true);
    this.computerTimeout = setTimeout(() => {
      const move = chooseComputerMove(this.board());
      if (move !== null) {
        this.mark(move, COMPUTER);
      }
      this.isComputerThinking.set(false);
    }, COMPUTER_DELAY_IN_MS);
  }

  protected restart(): void {
    this.clearComputerTimeout();
    this.board.set(EMPTY_BOARD);
    this.isComputerThinking.set(false);
  }

  protected isWinningCell(position: number): boolean {
    return this.winningLine()?.includes(position) ?? false;
  }

  protected cellLabel(position: number): string {
    const cell = this.board()[position];
    const description = cell === HUMAN ? 'seu X' : cell === COMPUTER ? 'minha bolinha' : 'vazio';
    return `Quadrado ${position + 1}: ${description}`;
  }

  private mark(position: number, player: Player): void {
    this.board.update((board) => board.map((cell, index) => (index === position ? player : cell)));
  }

  private clearComputerTimeout(): void {
    if (this.computerTimeout !== null) {
      clearTimeout(this.computerTimeout);
      this.computerTimeout = null;
    }
  }
}

function findWinningLine(board: readonly Cell[]): readonly [number, number, number] | null {
  return (
    WINNING_LINES.find(
      ([a, b, c]) => board[a] !== null && board[a] === board[b] && board[b] === board[c],
    ) ?? null
  );
}

/**
 * Estratégia do computador: fecha o jogo se puder, bloqueia a vitória do
 * jogador, e só então escolhe centro, canto ou lateral. Deixa a partida
 * disputada sem ser impossível de vencer.
 */
function chooseComputerMove(board: readonly Cell[]): number | null {
  const available = board.reduce<number[]>(
    (positions, cell, index) => (cell === null ? [...positions, index] : positions),
    [],
  );

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

  const center = 4;
  if (available.includes(center)) {
    return center;
  }

  const corners = available.filter((position) => [0, 2, 6, 8].includes(position));
  return pickRandom(corners.length > 0 ? corners : available) ?? null;
}

function findDecisiveMove(
  board: readonly Cell[],
  available: readonly number[],
  player: Player,
): number | null {
  for (const position of available) {
    const candidate = board.map((cell, index) => (index === position ? player : cell));
    if (findWinningLine(candidate)) {
      return position;
    }
  }

  return null;
}
