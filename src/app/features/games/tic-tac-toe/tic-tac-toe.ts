import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';

import {
  applyMove,
  Cell,
  chooseComputerMove,
  COMPUTER,
  EMPTY_BOARD,
  findWinningLine,
  HUMAN,
  Player,
} from './tic-tac-toe.logic';

const COMPUTER_DELAY_IN_MS = 450;

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

    this.scheduleComputerMove();
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

  /** A pausa deixa claro que foi o computador que jogou, e não o próprio clique. */
  private scheduleComputerMove(): void {
    this.isComputerThinking.set(true);

    this.computerTimeout = setTimeout(() => {
      const move = chooseComputerMove(this.board());
      if (move !== null) {
        this.mark(move, COMPUTER);
      }
      this.isComputerThinking.set(false);
    }, COMPUTER_DELAY_IN_MS);
  }

  private mark(position: number, player: Player): void {
    this.board.update((board) => applyMove(board, position, player));
  }

  private clearComputerTimeout(): void {
    if (this.computerTimeout !== null) {
      clearTimeout(this.computerTimeout);
      this.computerTimeout = null;
    }
  }
}
