import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { QUESTIONS_PER_ROUND, QUIZ_CATEGORIES, QUIZ_QUESTIONS } from '../../../core/data/quiz.data';
import type { QuizCategoryFilter, QuizQuestion } from '../../../core/models/quiz.model';
import { shuffle } from '../../../core/utils/shuffle';

@Component({
  selector: 'app-quiz-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-game.html',
  styleUrl: './quiz-game.scss',
})
export class QuizGame {
  protected readonly categories = QUIZ_CATEGORIES;
  protected readonly selectedCategory = signal<QuizCategoryFilter>('tudo');
  protected readonly questions = signal<readonly QuizQuestion[]>(buildRound('tudo'));

  protected readonly currentIndex = signal(0);
  protected readonly selectedIndex = signal<number | null>(null);
  protected readonly score = signal(0);
  protected readonly isFinished = signal(false);

  protected readonly totalQuestions = computed(() => this.questions().length);
  protected readonly currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  protected readonly hasAnswered = computed(() => this.selectedIndex() !== null);
  protected readonly isCorrect = computed(
    () => this.selectedIndex() === this.currentQuestion().correctIndex,
  );
  protected readonly progressPercentage = computed(() =>
    Math.round((this.currentIndex() / this.totalQuestions()) * 100),
  );
  protected readonly isLastQuestion = computed(
    () => this.currentIndex() === this.totalQuestions() - 1,
  );

  protected readonly finalMessage = computed(() => {
    const ratio = this.score() / this.totalQuestions();

    if (ratio === 1) {
      return 'Uau! Você acertou tudo!';
    }
    if (ratio >= 0.6) {
      return 'Muito bem! Você acertou quase tudo.';
    }

    return 'Vale a pena dar uma volta pelo site e tentar de novo!';
  });

  protected selectCategory(category: QuizCategoryFilter): void {
    if (category === this.selectedCategory()) {
      return;
    }

    this.selectedCategory.set(category);
    this.restart();
  }

  protected answer(optionIndex: number): void {
    if (this.hasAnswered()) {
      return;
    }

    this.selectedIndex.set(optionIndex);

    if (optionIndex === this.currentQuestion().correctIndex) {
      this.score.update((score) => score + 1);
    }
  }

  protected next(): void {
    if (!this.hasAnswered()) {
      return;
    }

    if (this.isLastQuestion()) {
      this.isFinished.set(true);
      return;
    }

    this.currentIndex.update((index) => index + 1);
    this.selectedIndex.set(null);
  }

  /** Recomeça com um novo sorteio, para as rodadas nunca ficarem iguais. */
  protected restart(): void {
    this.questions.set(buildRound(this.selectedCategory()));
    this.currentIndex.set(0);
    this.selectedIndex.set(null);
    this.score.set(0);
    this.isFinished.set(false);
  }

  protected optionState(optionIndex: number): 'correct' | 'wrong' | 'idle' {
    if (!this.hasAnswered()) {
      return 'idle';
    }

    if (optionIndex === this.currentQuestion().correctIndex) {
      return 'correct';
    }

    return optionIndex === this.selectedIndex() ? 'wrong' : 'idle';
  }
}

function buildRound(category: QuizCategoryFilter): readonly QuizQuestion[] {
  const available =
    category === 'tudo'
      ? QUIZ_QUESTIONS
      : QUIZ_QUESTIONS.filter((question) => question.category === category);

  return shuffle(available).slice(0, QUESTIONS_PER_ROUND);
}
