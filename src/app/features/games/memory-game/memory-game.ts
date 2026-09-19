import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import { gameDefinition } from '../../../core/data/game-progress.data';
import { memoryPlanFor } from '../../../core/games/difficulty';
import type { GameId } from '../../../core/models/game-progress.model';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { shuffle } from '../../../core/utils/shuffle';
import { GameHud } from '../shared/game-hud/game-hud';
import { celebrationFrom } from '../shared/level-up-celebration/celebration';
import type { CelebrationData } from '../shared/level-up-celebration/level-up-celebration';
import { LevelUpCelebration } from '../shared/level-up-celebration/level-up-celebration';

interface MemoryCard {
  readonly id: number;
  readonly emoji: string;
  readonly isFlipped: boolean;
  readonly isMatched: boolean;
}

const GAME_ID: GameId = 'memoria';

/** Figurinhas disponíveis; a rodada usa as primeiras conforme o nível. */
const CARD_EMOJIS = ['🦖', '🚀', '⚽', '🎨', '🐶', '🍕', '⭐', '🎈', '🐙', '🍉'] as const;

/**
 * Quantas jogadas ainda contam como rodada bem resolvida.
 *
 * O mínimo possível é uma jogada por par. O dobro disso dá margem para errar
 * e ainda assim reconhecer que a criança lembrou das cartas.
 */
const MOVE_BUDGET_PER_PAIR = 2;

/**
 * Jogo da memória por níveis.
 *
 * O nível decide quantos pares entram e quanto tempo um par errado fica
 * visível. A rodada conta como acerto quando foi resolvida dentro do orçamento
 * de jogadas — terminar sempre conta como progresso, mas lembrar rápido é o
 * que vale estrela.
 */
@Component({
  selector: 'app-memory-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameHud, LevelUpCelebration],
  templateUrl: './memory-game.html',
  styleUrl: './memory-game.scss',
})
export class MemoryGame {
  private readonly progressService = inject(GameProgressService);
  private mismatchTimeout: ReturnType<typeof setTimeout> | null = null;
  private hasRegisteredRound = false;

  protected readonly gameId = GAME_ID;
  protected readonly definition = gameDefinition(GAME_ID);

  protected readonly plan = signal(
    memoryPlanFor(this.progressService.progressOf(GAME_ID).level),
  );
  protected readonly cards = signal<readonly MemoryCard[]>(createDeck(this.plan().pairs));
  protected readonly moves = signal(0);
  protected readonly isLocked = signal(false);
  protected readonly celebration = signal<CelebrationData | null>(null);
  protected readonly earnedPoints = signal(0);

  protected readonly totalPairs = computed(() => this.plan().pairs);
  protected readonly matchedPairs = computed(
    () => this.cards().filter((card) => card.isMatched).length / 2,
  );
  protected readonly hasWon = computed(() => this.matchedPairs() === this.totalPairs());
  protected readonly moveBudget = computed(() => this.totalPairs() * MOVE_BUDGET_PER_PAIR);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearMismatchTimeout());
  }

  protected flip(cardId: number): void {
    const card = this.cards().find((candidate) => candidate.id === cardId);
    if (!card || this.isLocked() || card.isFlipped || card.isMatched) {
      return;
    }

    this.setFlipped(cardId, true);

    const openCards = this.cards().filter(
      (candidate) => candidate.isFlipped && !candidate.isMatched,
    );
    if (openCards.length < 2) {
      return;
    }

    this.moves.update((moves) => moves + 1);
    const [first, second] = openCards;

    if (first.emoji === second.emoji) {
      this.markMatched(first.emoji);

      if (this.hasWon()) {
        this.registerRound();
      }

      return;
    }

    this.isLocked.set(true);
    this.mismatchTimeout = setTimeout(() => {
      this.setFlipped(first.id, false);
      this.setFlipped(second.id, false);
      this.isLocked.set(false);
    }, this.plan().mismatchDelayMs);
  }

  /** Começa a rodada seguinte, já com a dificuldade do nível atual. */
  protected restart(): void {
    this.clearMismatchTimeout();
    this.plan.set(memoryPlanFor(this.progressService.progressOf(GAME_ID).level));
    this.cards.set(createDeck(this.plan().pairs));
    this.moves.set(0);
    this.isLocked.set(false);
    this.hasRegisteredRound = false;
    this.earnedPoints.set(0);
  }

  protected continueAfterCelebration(): void {
    this.celebration.set(null);
    this.restart();
  }

  private registerRound(): void {
    if (this.hasRegisteredRound) {
      return;
    }

    this.hasRegisteredRound = true;

    const wasEfficient = this.moves() <= this.moveBudget();
    const outcome = this.progressService.registerChallenge(GAME_ID, wasEfficient);

    this.earnedPoints.set(outcome.earnedPoints);

    if (outcome.didLevelUp) {
      this.celebration.set(celebrationFrom(outcome, this.definition.label));
    }
  }

  private setFlipped(cardId: number, isFlipped: boolean): void {
    this.cards.update((cards) =>
      cards.map((card) => (card.id === cardId ? { ...card, isFlipped } : card)),
    );
  }

  private markMatched(emoji: string): void {
    this.cards.update((cards) =>
      cards.map((card) => (card.emoji === emoji ? { ...card, isMatched: true } : card)),
    );
  }

  private clearMismatchTimeout(): void {
    if (this.mismatchTimeout !== null) {
      clearTimeout(this.mismatchTimeout);
      this.mismatchTimeout = null;
    }
  }
}

function createDeck(pairs: number): readonly MemoryCard[] {
  const chosen = CARD_EMOJIS.slice(0, Math.min(pairs, CARD_EMOJIS.length));

  return shuffle([...chosen, ...chosen]).map((emoji, index) => ({
    id: index,
    emoji,
    isFlipped: false,
    isMatched: false,
  }));
}
