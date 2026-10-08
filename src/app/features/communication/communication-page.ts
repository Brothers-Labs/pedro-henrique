import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { BOARD_TEXTS } from '../../core/data/communication-texts.data';
import {
  COMMUNICATION_CATEGORIES,
  COMMUNICATION_QUICK_PHRASES,
  findCardsByCategory,
} from '../../core/data/communication.data';
import type { PhraseSource } from '../../core/models/analytics-event.model';
import type {
  CommunicationCard,
  CommunicationCategoryId,
  QuickPhrase,
  SavedPhrase,
} from '../../core/models/communication.model';
import type { AppLanguage } from '../../core/models/language.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { CalmModeService } from '../../core/services/calm-mode.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { LanguageService } from '../../core/services/language.service';
import { PhraseBookService } from '../../core/services/phrase-book.service';
import {
  CALM_SPEECH_RATE,
  DEFAULT_SPEECH_RATE,
  SpeechService,
} from '../../core/services/speech.service';
import { buildPhraseText } from '../../core/utils/phrase';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { LanguageSwitch } from './language-switch/language-switch';
import { PhraseBar } from './phrase-bar/phrase-bar';

/** Teto de cartões por frase: além disso a fala vira uma lista sem sentido. */
const MAX_PHRASE_CARDS = 12;

/**
 * Prancha de comunicação: o Pedro Henrique monta uma frase tocando em cartões
 * e o navegador fala por ele, em português ou em inglês.
 *
 * A página guarda os cartões escolhidos, e não o texto pronto: assim, trocar o
 * idioma no meio da conversa traduz a frase que já estava montada em vez de
 * apagá-la. Falar, guardar e lembrar o idioma são responsabilidades dos
 * serviços de núcleo.
 */
@Component({
  selector: 'app-communication-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, PhraseBar, LanguageSwitch],
  templateUrl: './communication-page.html',
  styleUrl: './communication-page.scss',
})
export class CommunicationPage {
  private readonly speech = inject(SpeechService);
  private readonly calmMode = inject(CalmModeService);
  private readonly languageService = inject(LanguageService);
  private readonly phraseBook = inject(PhraseBookService);
  private readonly analytics = inject(AnalyticsService);
  private readonly connectivity = inject(ConnectivityService);

  protected readonly language = this.languageService.current;
  protected readonly categories = COMMUNICATION_CATEGORIES;
  protected readonly quickPhrases = COMMUNICATION_QUICK_PHRASES;
  protected readonly isSpeechSupported = this.speech.isSupported;
  protected readonly isSpeaking = this.speech.isSpeaking;

  protected readonly activeCategoryId = signal<CommunicationCategoryId>(
    COMMUNICATION_CATEGORIES[0].id,
  );
  private readonly phraseCards = signal<readonly CommunicationCard[]>([]);

  protected readonly texts = computed(() => BOARD_TEXTS[this.language()]);

  protected readonly activeCategory = computed(
    () =>
      this.categories.find((category) => category.id === this.activeCategoryId()) ??
      this.categories[0],
  );

  protected readonly visibleCards = computed(() => findCardsByCategory(this.activeCategoryId()));

  /** Cartões da frase já traduzidos: é o que a faixa da frase precisa mostrar. */
  protected readonly chosenCards = computed(() =>
    this.phraseCards().map((card) => ({
      id: card.id,
      emoji: card.emoji,
      label: card.label[this.language()],
    })),
  );

  protected readonly phraseText = computed(() =>
    buildPhraseText(
      this.chosenCards().map((card) => card.label),
      this.language(),
    ),
  );

  protected readonly savedPhrases = computed(() => this.phraseBook.listFor(this.language()));
  protected readonly isPhraseBookFull = computed(() => this.phraseBook.isFullFor(this.language()));

  protected readonly canSavePhrase = computed(() => {
    const text = this.phraseText();

    return text.length > 0 && !this.isPhraseBookFull() && !this.phraseBook.has(text, this.language());
  });

  protected readonly isVoiceMissing = computed(() => this.speech.isVoiceMissingFor(this.language()));

  /** Trocar de idioma interrompe a fala em curso: a próxima voz é outra. */
  protected selectLanguage(language: AppLanguage): void {
    this.speech.stop();
    this.languageService.select(language);
  }

  protected selectCategory(categoryId: CommunicationCategoryId): void {
    this.activeCategoryId.set(categoryId);
  }

  /** Cada cartão é falado no toque: a criança confere a palavra antes de seguir. */
  protected addCard(card: CommunicationCard): void {
    if (this.phraseCards().length >= MAX_PHRASE_CARDS) {
      return;
    }

    this.phraseCards.update((cards) => [...cards, card]);
    this.say(card.label[this.language()]);
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
    this.sayPhrase(this.phraseText(), 'board');
  }

  protected speakQuickPhrase(phrase: QuickPhrase): void {
    this.sayPhrase(phrase.text[this.language()], 'quick');
  }

  protected savePhrase(): void {
    this.phraseBook.save(this.phraseText(), this.language());
  }

  protected speakSavedPhrase(phrase: SavedPhrase): void {
    this.sayPhrase(phrase.text, 'saved');
  }

  protected removeSavedPhrase(phrase: SavedPhrase): void {
    this.phraseBook.remove(phrase.id);
  }

  /**
   * Fala uma frase inteira e conta que ela foi dita — só o tamanho, nunca o
   * conteúdo. O toque em cada cartão solto fala, mas não entra na conta.
   */
  private sayPhrase(text: string, source: PhraseSource): void {
    const wordCount = countWords(text);

    if (wordCount === 0) {
      return;
    }

    this.say(text);
    this.analytics.track({
      name: 'phrase_spoken',
      properties: {
        language: this.language(),
        source,
        wordCount,
        isOnline: this.connectivity.isOnline(),
      },
    });
  }

  private say(text: string): void {
    this.speech.speak(text, {
      language: this.language(),
      rate: this.calmMode.isEnabled() ? CALM_SPEECH_RATE : DEFAULT_SPEECH_RATE,
    });
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
