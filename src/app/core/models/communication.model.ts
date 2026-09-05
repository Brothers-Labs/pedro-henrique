import type { AppLanguage, Localized } from './language.model';
import type { ThemeColor } from './profile.model';

/** Grupos em que os cartões da prancha são organizados. */
export type CommunicationCategoryId =
  | 'respostas'
  | 'inicios'
  | 'sentimentos'
  | 'preciso'
  | 'sensorial'
  | 'corpo'
  | 'comidas'
  | 'lugares'
  | 'pessoas'
  | 'brincar'
  | 'rotina'
  | 'escola'
  | 'descrever'
  | 'cores'
  | 'tempo';

export interface CommunicationCategory {
  readonly id: CommunicationCategoryId;
  readonly label: Localized<string>;
  readonly emoji: string;
  readonly color: ThemeColor;
}

/** Cartão da prancha: uma palavra falada, com uma figura que a representa. */
export interface CommunicationCard {
  readonly id: string;
  readonly categoryId: CommunicationCategoryId;
  readonly label: Localized<string>;
  readonly emoji: string;
}

/**
 * Frase pronta: um toque e o site fala a frase inteira.
 *
 * Existe para o que não pode esperar a montagem cartão por cartão — pedir
 * ajuda, avisar que dói, pedir uma pausa.
 */
export interface QuickPhrase {
  readonly id: string;
  readonly emoji: string;
  readonly text: Localized<string>;
}

/** Frase guardada no caderninho de favoritas, no idioma em que foi montada. */
export interface SavedPhrase {
  readonly id: string;
  readonly text: string;
  readonly language: AppLanguage;
  readonly createdAt: string;
}

/** Cartão já traduzido para o idioma da vez, pronto para a tela. */
export interface LocalizedCard {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
}

/** Textos da faixa da frase em construção. */
export interface PhraseBarTexts {
  readonly title: string;
  readonly placeholder: string;
  readonly speak: string;
  readonly undo: string;
  readonly clear: string;
  readonly save: string;
  readonly removeCard: (label: string) => string;
}

/** Todos os textos da prancha em um idioma. */
export interface BoardTexts {
  readonly title: string;
  readonly subtitle: string;
  readonly languageLabel: string;
  readonly speechUnsupported: string;
  readonly voiceMissing: string;
  readonly categoriesLabel: string;
  readonly quickPhrasesTitle: string;
  readonly quickPhrasesHint: string;
  readonly savedTitle: string;
  readonly savedEmpty: string;
  readonly savedFull: string;
  readonly removeSavedPhrase: (text: string) => string;
  readonly phraseBar: PhraseBarTexts;
}
