export type QuizCategory = 'sobre-mim' | 'geral';

/** Filtro escolhido pelo jogador; `tudo` mistura as duas categorias. */
export type QuizCategoryFilter = QuizCategory | 'tudo';

export interface QuizQuestion {
  readonly id: string;
  readonly category: QuizCategory;
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly funFact: string;
}

export interface QuizCategoryOption {
  readonly value: QuizCategoryFilter;
  readonly label: string;
  readonly emoji: string;
}
