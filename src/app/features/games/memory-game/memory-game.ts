import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';

import { shuffle } from '../../../core/utils/shuffle';

interface MemoryCard {
  readonly id: number;
  readonly emoji: string;
  readonly isFlipped: boolean;
  readonly isMatched: boolean;
}

const CARD_EMOJIS = ['🦖', '🚀', '⚽', '🎨', '🐶', '🍕', '⭐', '🎈'] as const;
const MISMATCH_DELAY_IN_MS = 900;

@Component({
  selector: 'app-memory-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memory-game.html',
  styleUrl: './memory-game.scss',
})
export class MemoryGame {
  private mismatchTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly cards = signal<readonly MemoryCard[]>(createDeck());
  protected readonly moves = signal(0);
  protected readonly isLocked = signal(false);

  protected readonly matchedPairs = computed(
    () => this.cards().filter((card) => card.isMatched).length / 2,
  );
  protected readonly totalPairs = CARD_EMOJIS.length;
  protected readonly hasWon = computed(() => this.matchedPairs() === this.totalPairs);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearMismatchTimeout());
  }

  protected flip(cardId: number): void {
    const card = this.cards().find((candidate) => candidate.id === cardId);
    if (!card || this.isLocked() || card.isFlipped || card.isMatched) {
      return;
    }

    this.setFlipped(cardId, true);

    const openCards = this.cards().filter((candidate) => candidate.isFlipped && !candidate.isMatched);
    if (openCards.length < 2) {
      return;
    }

    this.moves.update((moves) => moves + 1);
    const [first, second] = openCards;

    if (first.emoji === second.emoji) {
      this.markMatched(first.emoji);
      return;
    }

    this.isLocked.set(true);
    this.mismatchTimeout = setTimeout(() => {
      this.setFlipped(first.id, false);
      this.setFlipped(second.id, false);
      this.isLocked.set(false);
    }, MISMATCH_DELAY_IN_MS);
  }

  protected restart(): void {
    this.clearMismatchTimeout();
    this.cards.set(createDeck());
    this.moves.set(0);
    this.isLocked.set(false);
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

function createDeck(): readonly MemoryCard[] {
  return shuffle([...CARD_EMOJIS, ...CARD_EMOJIS]).map((emoji, index) => ({
    id: index,
    emoji,
    isFlipped: false,
    isMatched: false,
  }));
}
