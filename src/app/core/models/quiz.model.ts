export type QuizCategory = 'sobre-mim' | 'geral';

/** Faixa de dificuldade: 1 é direta, 3 exige juntar duas informações. */
export type QuizDifficulty = 1 | 2 | 3;

export interface QuizQuestion {
  readonly id: string;
  readonly category: QuizCategory;
  readonly difficulty: QuizDifficulty;
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly funFact: string;
}
