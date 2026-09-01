import type { ThemeColor } from './profile.model';

/** Grupos em que os cartões da prancha são organizados. */
export type CommunicationCategoryId =
  | 'respostas'
  | 'inicios'
  | 'sentimentos'
  | 'preciso'
  | 'comidas'
  | 'lugares'
  | 'pessoas'
  | 'brincar';

export interface CommunicationCategory {
  readonly id: CommunicationCategoryId;
  readonly label: string;
  readonly emoji: string;
  readonly color: ThemeColor;
}

/** Cartão da prancha: uma palavra falada, com uma figura que a representa. */
export interface CommunicationCard {
  readonly id: string;
  readonly categoryId: CommunicationCategoryId;
  readonly label: string;
  readonly emoji: string;
}

/** Frase guardada no caderninho de favoritas. */
export interface SavedPhrase {
  readonly id: string;
  readonly text: string;
  readonly createdAt: string;
}
