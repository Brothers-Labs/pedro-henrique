import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { COMMUNICATION_CATEGORIES, findCardsByCategory } from '../../core/data/communication.data';
import type {
  CommunicationCard,
  CommunicationCategoryId,
  SavedPhrase,
} from '../../core/models/communication.model';
import { CalmModeService } from '../../core/services/calm-mode.service';
import { PhraseBookService } from '../../core/services/phrase-book.service';
import {
  CALM_SPEECH_RATE,
  DEFAULT_SPEECH_RATE,
  SpeechService,
} from '../../core/services/speech.service';
import { buildPhraseText } from '../../core/utils/phrase';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { PhraseBar } from './phrase-bar/phrase-bar';

/** Teto de cartões por frase: além disso a fala vira uma lista sem sentido. */
const MAX_PHRASE_CARDS = 12;

/**
 * Prancha de comunicação: o Pedro Henrique monta uma frase tocando em cartões
 * e o navegador fala por ele.
 *
 * A página é a dona da frase em construção; falar, guardar e lembrar são
 * responsabilidades dos serviços de núcleo.
 */
@Component({
  selector: 'app-communication-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, PhraseBar],
  templateUrl: './communication-page.html',
  styleUrl: './communication-page.scss',
})
export class CommunicationPage {
  private readonly speech = inject(SpeechService);
  private readonly calmMode = inject(CalmModeService);

  protected readonly phraseBook = inject(PhraseBookService);
  protected readonly categories = COMMUNICATION_CATEGORIES;
  protected readonly isSpeechSupported = this.speech.isSupported;
  protected readonly isSpeaking = this.speech.isSpeaking;

  protected readonly activeCategoryId = signal<CommunicationCategoryId>(
    COMMUNICATION_CATEGORIES[0].id,
  );
  protected readonly phraseCards = signal<readonly CommunicationCard[]>([]);

  protected readonly activeCategory = computed(
    () =>
      this.categories.find((category) => category.id === this.activeCategoryId()) ??
      this.categories[0],
  );
  protected readonly visibleCards = computed(() => findCardsByCategory(this.activeCategoryId()));
  protected readonly phraseText = computed(() =>
    buildPhraseText(this.phraseCards().map((card) => card.label)),
  );
  protected readonly canSavePhrase = computed(() => {
    const text = this.phraseText();
    return text.length > 0 && !this.phraseBook.isFull() && !this.phraseBook.has(text);
  });

  protected selectCategory(categoryId: CommunicationCategoryId): void {
    this.activeCategoryId.set(categoryId);
  }

  /** Cada cartão é falado no toque: a criança confere a palavra antes de seguir. */
  protected addCard(card: CommunicationCard): void {
    if (this.phraseCards().length >= MAX_PHRASE_CARDS) {
      return;
    }

    this.phraseCards.update((cards) => [...cards, card]);
    this.say(card.label);
  }

  protected removeCardAt(index: number): void {
    this.phraseCards.update((cards) => cards.filter((_, position) => position !== index));
  }

  protected removeLastCard(): void {
    this.phraseCards.update((cards) => cards.slice(0, -1));
  }

  protected clearPhrase(): void {
    this.phraseCards.set([]);
    this.speech.stop();
  }

  protected speakPhrase(): void {
    this.say(this.phraseText());
  }

  protected savePhrase(): void {
    this.phraseBook.save(this.phraseText());
  }

  protected speakSavedPhrase(phrase: SavedPhrase): void {
    this.say(phrase.text);
  }

  protected removeSavedPhrase(phrase: SavedPhrase): void {
    this.phraseBook.remove(phrase.id);
  }

  private say(text: string): void {
    this.speech.speak(text, {
      rate: this.calmMode.isEnabled() ? CALM_SPEECH_RATE : DEFAULT_SPEECH_RATE,
    });
  }
}
