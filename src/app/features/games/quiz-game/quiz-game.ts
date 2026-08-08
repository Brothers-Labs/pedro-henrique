import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { QUIZ_QUESTIONS } from '../../../core/data/quiz.data';

@Component({
  selector: 'app-quiz-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-game.html',
  styleUrl: './quiz-game.scss',
})
export class QuizGame {
  protected readonly totalQuestions = QUIZ_QUESTIONS.length;

  protected readonly currentIndex = signal(0);
  protected readonly selectedIndex = signal<number | null>(null);
  protected readonly score = signal(0);
  protected readonly isFinished = signal(false);

  protected readonly currentQuestion = computed(() => QUIZ_QUESTIONS[this.currentIndex()]);
  protected readonly hasAnswered = computed(() => this.selectedIndex() !== null);
  protected readonly isCorrect = computed(
    () => this.selectedIndex() === this.currentQuestion().correctIndex,
  );
  protected readonly progressPercentage = computed(() =>
    Math.round((this.currentIndex() / this.totalQuestions) * 100),
  );
  protected readonly isLastQuestion = computed(
    () => this.currentIndex() === this.totalQuestions - 1,
  );

  protected readonly finalMessage = computed(() => {
    const ratio = this.score() / this.totalQuestions;
    if (ratio === 1) {
      return 'Uau! Você me conhece de verdade!';
    }
    if (ratio >= 0.6) {
      return 'Muito bem! Você acertou quase tudo.';
    }
    return 'Vale a pena dar uma volta pelo site e tentar de novo!';
  });

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

  protected restart(): void {
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
