import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import { gameDefinition } from '../../../core/data/game-progress.data';
import { ticTacToeSkillFor } from '../../../core/games/difficulty';
import type { GameId } from '../../../core/models/game-progress.model';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { GameHud } from '../shared/game-hud/game-hud';
import { celebrationFrom } from '../shared/level-up-celebration/celebration';
import type { CelebrationData } from '../shared/level-up-celebration/level-up-celebration';
import { LevelUpCelebration } from '../shared/level-up-celebration/level-up-celebration';
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

const GAME_ID: GameId = 'velha';
const COMPUTER_DELAY_IN_MS = 450;

const SKILL_LABELS = {
  iniciante: 'Adversário iniciante',
  esperto: 'Adversário esperto',
  mestre: 'Adversário mestre',
} as const;

/**
 * Jogo da velha com adversário que cresce junto.
 *
 * Aqui um desafio é uma partida inteira, e não uma resposta certa. Empatar
 * conta como sucesso de propósito: contra um adversário que não erra, o empate
 * é o melhor resultado possível — chamar isso de derrota seria injusto.
 */
@Component({
  selector: 'app-tic-tac-toe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameHud, LevelUpCelebration],
  templateUrl: './tic-tac-toe.html',
  styleUrl: './tic-tac-toe.scss',
})
export class TicTacToe {
  private readonly progressService = inject(GameProgressService);
  private computerTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Trava de registro: uma partida encerrada vale um desafio, nunca dois. */
  private hasRegisteredRound = false;

  protected readonly gameId = GAME_ID;
  protected readonly definition = gameDefinition(GAME_ID);

  protected readonly board = signal<readonly Cell[]>(EMPTY_BOARD);
  protected readonly isComputerThinking = signal(false);
  protected readonly celebration = signal<CelebrationData | null>(null);
  protected readonly earnedPoints = signal(0);

  protected readonly skill = computed(() =>
    ticTacToeSkillFor(this.progressService.progressOf(GAME_ID).level),
  );
  protected readonly skillLabel = computed(() => SKILL_LABELS[this.skill()]);

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
      return 'Deu velha! Empatar também vale ponto.';
    }

    return this.isComputerThinking() ? 'Estou pensando…' : 'Sua vez: toque em um quadrado.';
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
      this.registerRound();
      return;
    }

    this.scheduleComputerMove();
  }

  protected restart(): void {
    this.clearComputerTimeout();
    this.board.set(EMPTY_BOARD);
    this.isComputerThinking.set(false);
    this.hasRegisteredRound = false;
    this.earnedPoints.set(0);
  }

  protected continueAfterCelebration(): void {
    this.celebration.set(null);
    this.restart();
  }

  protected isWinningCell(position: number): boolean {
    return this.winningLine()?.includes(position) ?? false;
  }

  protected cellLabel(position: number): string {
    const cell = this.board()[position];
    const description = cell === HUMAN ? 'seu X' : cell === COMPUTER ? 'minha bolinha' : 'vazio';
    return `Quadrado ${position + 1}: ${description}`;
  }

  /** Conta a partida encerrada uma única vez, mesmo com toques repetidos. */
  private registerRound(): void {
    if (this.hasRegisteredRound) {
      return;
    }

    this.hasRegisteredRound = true;

    const wasGood = this.winner() === HUMAN || this.isDraw();
    const outcome = this.progressService.registerChallenge(GAME_ID, wasGood);

    this.earnedPoints.set(outcome.earnedPoints);

    if (outcome.didLevelUp) {
      this.celebration.set(celebrationFrom(outcome, this.definition.label));
    }
  }

  /** A pausa deixa claro que foi o computador que jogou, e não o próprio toque. */
  private scheduleComputerMove(): void {
    this.isComputerThinking.set(true);

    this.computerTimeout = setTimeout(() => {
      const move = chooseComputerMove(this.board(), this.skill());
      if (move !== null) {
        this.mark(move, COMPUTER);
      }

      this.isComputerThinking.set(false);

      if (this.isFinished()) {
        this.registerRound();
      }
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
