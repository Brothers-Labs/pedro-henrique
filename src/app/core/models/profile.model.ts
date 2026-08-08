/** Fato curto exibido em destaque ("7 anos", "2º ano"...). */
export interface QuickFact {
  readonly emoji: string;
  readonly label: string;
  readonly value: string;
}

/** Habilidade divertida com nível de 0 a 100. */
export interface SuperPower {
  readonly emoji: string;
  readonly name: string;
  readonly description: string;
  readonly level: number;
  readonly color: ThemeColor;
}

/** Item da grade de coisas favoritas. */
export interface Favorite {
  readonly emoji: string;
  readonly category: string;
  readonly value: string;
}

/** Conquista comemorada na seção de medalhas. */
export interface Achievement {
  readonly emoji: string;
  readonly title: string;
  readonly description: string;
  readonly year: number;
}

/** Cores nomeadas do design system, usadas para variar os cartões. */
export type ThemeColor = 'pink' | 'blue' | 'yellow' | 'mint' | 'purple' | 'orange';

export interface Profile {
  readonly firstName: string;
  readonly fullName: string;
  /** Data de nascimento em ISO (`yyyy-MM-dd`); a idade é sempre derivada dela. */
  readonly birthDate: string;
  readonly tagline: string;
  readonly introduction: readonly string[];
  readonly avatarEmoji: string;
  readonly quickFacts: readonly QuickFact[];
  readonly superPowers: readonly SuperPower[];
  readonly favorites: readonly Favorite[];
  readonly achievements: readonly Achievement[];
}
