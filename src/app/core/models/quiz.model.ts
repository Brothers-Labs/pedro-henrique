export interface QuizQuestion {
  readonly id: string;
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly funFact: string;
}
