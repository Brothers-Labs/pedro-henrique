import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';

import { gameDefinition } from '../../../core/data/game-progress.data';
import { beansSkillFor } from '../../../core/games/difficulty';
import type { GameId } from '../../../core/models/game-progress.model';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { GameHud } from '../shared/game-hud/game-hud';
import { celebrationFrom } from '../shared/level-up-celebration/celebration';
import type { CelebrationData } from '../shared/level-up-celebration/level-up-celebration';
import { LevelUpCelebration } from '../shared/level-up-celebration/level-up-celebration';
import {
  applyMove,
  BEANS_PER_PLAYER,
  BeanCell,
  BeanPlayer,
  BOARD_POINTS,
  canFly,
  chooseBeanMove,
  chooseBeanToRemove,
  destinationsFrom,
  EMPTY_BEAN_BOARD,
  formsMill,
  hasAnyMove,
  MINIMUM_BEANS,
  opponentOf,
  positionsOf,
  removablePositions,
  withBean,
} from './beans-game.logic';

type GameMode = 'computador' | 'dupla';

const PLAYER_EMOJI: Readonly<Record<BeanPlayer, string>> = {
  crianca: '🟤',
  rival: '⚪',
};

const PLAYER_NAME: Readonly<Record<BeanPlayer, string>> = {
  crianca: 'Feijões marrons',
  rival: 'Feijões brancos',
};

const RIVAL_DELAY_IN_MS = 650;

const GAME_ID: GameId = 'feijoes';

const SKILL_LABELS = {
  iniciante: 'Rival iniciante',
  esperto: 'Rival esperto',
  mestre: 'Rival mestre',
} as const;

@Component({
  selector: 'app-beans-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameHud, LevelUpCelebration],
  templateUrl: './beans-game.html',
  styleUrl: './beans-game.scss',
})
export class BeansGame {
  private readonly progressService = inject(GameProgressService);
  private rivalTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Trava de registro: uma partida encerrada vale um desafio, nunca dois. */
  private hasRegisteredRound = false;

  protected readonly gameId = GAME_ID;
  protected readonly definition = gameDefinition(GAME_ID);
  protected readonly celebration = signal<CelebrationData | null>(null);
  protected readonly earnedPoints = signal(0);

  protected readonly rivalSkill = computed(() =>
    beansSkillFor(this.progressService.progressOf(GAME_ID).level),
  );
  protected readonly rivalSkillLabel = computed(() => SKILL_LABELS[this.rivalSkill()]);

  protected readonly points = BOARD_POINTS;
  protected readonly playerEmoji = PLAYER_EMOJI;
  protected readonly playerName = PLAYER_NAME;
  protected readonly sides: readonly BeanPlayer[] = ['crianca', 'rival'];

  protected readonly mode = signal<GameMode>('computador');
  protected readonly board = signal<readonly BeanCell[]>(EMPTY_BEAN_BOARD);
  protected readonly currentPlayer = signal<BeanPlayer>('crianca');
  protected readonly beansInHand = signal<Readonly<Record<BeanPlayer, number>>>({
    crianca: BEANS_PER_PLAYER,
    rival: BEANS_PER_PLAYER,
  });
  protected readonly mustRemove = signal(false);
  protected readonly selectedPosition = signal<number | null>(null);
  protected readonly winner = signal<BeanPlayer | null>(null);
  protected readonly isRivalThinking = signal(false);

  protected readonly isFinished = computed(() => this.winner() !== null);
  protected readonly beansOnBoard = computed(() => ({
    crianca: positionsOf(this.board(), 'crianca').length,
    rival: positionsOf(this.board(), 'rival').length,
  }));
  protected readonly isPlacingPhase = computed(() => this.beansInHand()[this.currentPlayer()] > 0);
  protected readonly isFlying = computed(() =>
    canFly(this.beansOnBoard()[this.currentPlayer()], this.beansInHand()[this.currentPlayer()]),
  );

  /** Casas destacadas como jogada possível para o jogador da vez. */
  protected readonly highlighted = computed<readonly number[]>(() => {
    if (this.isFinished() || this.isRivalThinking()) {
      return [];
    }

    if (this.mustRemove()) {
      return removablePositions(this.board(), opponentOf(this.currentPlayer()));
    }

    if (this.isPlacingPhase()) {
      return this.board().reduce<number[]>(
        (positions, cell, index) => (cell === null ? [...positions, index] : positions),
        [],
      );
    }

    const selected = this.selectedPosition();
    if (selected === null) {
      return positionsOf(this.board(), this.currentPlayer()).filter(
        (position) => destinationsFrom(this.board(), position, this.isFlying()).length > 0,
      );
    }

    return destinationsFrom(this.board(), selected, this.isFlying());
  });

  protected readonly statusMessage = computed(() => {
    const winner = this.winner();
    if (winner) {
      return this.isSolo() && winner === 'rival'
        ? 'Dessa vez eu ganhei! Bora de novo?'
        : `${this.playerName[winner]} venceram!`;
    }

    if (this.isRivalThinking()) {
      return 'Estou pensando na minha jogada…';
    }

    const turnLabel = this.turnLabel();

    if (this.mustRemove()) {
      return `${turnLabel}: você fez uma trilha! Escolha um feijão do outro para comer.`;
    }

    if (this.isPlacingPhase()) {
      return `${turnLabel}: coloque um feijão em uma casa vazia.`;
    }

    if (this.isFlying()) {
      return `${turnLabel}: só restam 3 feijões, então você pode voar para qualquer casa.`;
    }

    return this.selectedPosition() === null
      ? `${turnLabel}: escolha o feijão que vai andar.`
      : `${turnLabel}: agora escolha para onde ele vai.`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearRivalTimeout());
  }

  protected selectMode(mode: GameMode): void {
    if (mode === this.mode()) {
      return;
    }

    this.mode.set(mode);
    this.restart();
  }

  protected onSpotClick(position: number): void {
    if (this.isFinished() || this.isRivalThinking() || this.isRivalTurn()) {
      return;
    }

    if (this.mustRemove()) {
      this.removeBean(position);
      return;
    }

    if (this.isPlacingPhase()) {
      this.placeBean(position);
      return;
    }

    this.moveOrSelect(position);
  }

  protected restart(): void {
    this.clearRivalTimeout();
    this.board.set(EMPTY_BEAN_BOARD);
    this.currentPlayer.set('crianca');
    this.beansInHand.set({ crianca: BEANS_PER_PLAYER, rival: BEANS_PER_PLAYER });
    this.mustRemove.set(false);
    this.selectedPosition.set(null);
    this.winner.set(null);
    this.hasRegisteredRound = false;
    this.earnedPoints.set(0);
    this.isRivalThinking.set(false);
  }

  protected isHighlighted(position: number): boolean {
    return this.highlighted().includes(position);
  }

  protected spotLabel(position: number): string {
    const cell = this.board()[position];
    const occupant = cell === null ? 'casa vazia' : `feijão ${this.playerName[cell].toLowerCase()}`;
    return `Casa ${position + 1}: ${occupant}`;
  }

  protected continueAfterCelebration(): void {
    this.celebration.set(null);
    this.restart();
  }

  /**
   * Encerra a partida e conta o desafio uma única vez.
   *
   * Só vale na partida contra o computador: no modo dupla o adversário é outra
   * pessoa, e o nível da jornada não teria o que medir.
   */
  private declareWinner(winner: BeanPlayer): void {
    this.winner.set(winner);

    if (!this.isSolo() || this.hasRegisteredRound) {
      return;
    }

    this.hasRegisteredRound = true;

    const outcome = this.progressService.registerChallenge(GAME_ID, winner === 'crianca');
    this.earnedPoints.set(outcome.earnedPoints);

    if (outcome.didLevelUp) {
      this.celebration.set(celebrationFrom(outcome, this.definition.label));
    }
  }

  private isSolo(): boolean {
    return this.mode() === 'computador';
  }

  private isRivalTurn(): boolean {
    return this.isSolo() && this.currentPlayer() === 'rival';
  }

  private turnLabel(): string {
    if (!this.isSolo()) {
      return this.playerName[this.currentPlayer()];
    }

    return this.currentPlayer() === 'crianca' ? 'Sua vez' : 'Minha vez';
  }

  private placeBean(position: number): void {
    if (this.board()[position] !== null) {
      return;
    }

    const player = this.currentPlayer();
    this.board.update((board) => withBean(board, position, player));
    this.beansInHand.update((hand) => ({ ...hand, [player]: hand[player] - 1 }));

    this.finishTurn(position, player);
  }

  private moveOrSelect(position: number): void {
    const player = this.currentPlayer();
    const cell = this.board()[position];

    if (cell === player) {
      this.selectedPosition.set(this.selectedPosition() === position ? null : position);
      return;
    }

    const from = this.selectedPosition();
    if (from === null || !destinationsFrom(this.board(), from, this.isFlying()).includes(position)) {
      return;
    }

    this.board.update((board) => applyMove(board, { from, to: position }, player));
    this.selectedPosition.set(null);

    this.finishTurn(position, player);
  }

  private removeBean(position: number): void {
    const opponent = opponentOf(this.currentPlayer());
    if (!removablePositions(this.board(), opponent).includes(position)) {
      return;
    }

    this.board.update((board) => withBean(board, position, null));
    this.mustRemove.set(false);

    if (this.checkDefeat(opponent)) {
      return;
    }

    this.startNextTurn();
  }

  /** Fecha a jogada: se formou trilha, o jogador ainda come um feijão. */
  private finishTurn(position: number, player: BeanPlayer): void {
    if (formsMill(this.board(), position, player)) {
      this.mustRemove.set(true);

      if (this.isRivalTurn()) {
        this.scheduleRivalAction();
      }
      return;
    }

    this.startNextTurn();
  }

  private startNextTurn(): void {
    const next = opponentOf(this.currentPlayer());
    this.currentPlayer.set(next);
    this.selectedPosition.set(null);

    if (!hasAnyMove(this.board(), next, this.beansInHand()[next])) {
      this.declareWinner(opponentOf(next));
      return;
    }

    if (this.isSolo() && next === 'rival') {
      this.scheduleRivalAction();
    }
  }

  /** Derrota por ficar com menos de três feijões, já sem nada na mão. */
  private checkDefeat(player: BeanPlayer): boolean {
    const remaining = positionsOf(this.board(), player).length + this.beansInHand()[player];

    if (remaining < MINIMUM_BEANS) {
      this.declareWinner(opponentOf(player));
      return true;
    }

    return false;
  }

  private scheduleRivalAction(): void {
    this.isRivalThinking.set(true);

    this.rivalTimeout = setTimeout(() => {
      this.isRivalThinking.set(false);
      this.playRivalAction();
    }, RIVAL_DELAY_IN_MS);
  }

  private playRivalAction(): void {
    if (this.isFinished()) {
      return;
    }

    if (this.mustRemove()) {
      const target = chooseBeanToRemove(this.board(), opponentOf('rival'));
      if (target !== null) {
        this.removeBean(target);
      }
      return;
    }

    const move = chooseBeanMove(
      this.board(),
      'rival',
      this.beansInHand()['rival'],
      this.rivalSkill(),
    );
    if (move === null) {
      this.declareWinner('crianca');
      return;
    }

    this.board.update((board) => applyMove(board, move, 'rival'));

    if (move.from === null) {
      this.beansInHand.update((hand) => ({ ...hand, rival: hand['rival'] - 1 }));
    }

    this.finishTurn(move.to, 'rival');
  }

  private clearRivalTimeout(): void {
    if (this.rivalTimeout !== null) {
      clearTimeout(this.rivalTimeout);
      this.rivalTimeout = null;
    }
  }
}
