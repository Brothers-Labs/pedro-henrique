import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import {
  CORRECT_MESSAGES,
  ENCOURAGEMENT_MESSAGES,
  gameDefinition,
} from '../../../core/data/game-progress.data';
import { quizTierFor } from '../../../core/games/difficulty';
import type { GameId } from '../../../core/models/game-progress.model';
import type { QuizQuestion } from '../../../core/models/quiz.model';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { pickRandom } from '../../../core/utils/shuffle';
import { GameHud } from '../shared/game-hud/game-hud';
import { celebrationFrom } from '../shared/level-up-celebration/celebration';
import type { CelebrationData } from '../shared/level-up-celebration/level-up-celebration';
import { LevelUpCelebration } from '../shared/level-up-celebration/level-up-celebration';
import { drawQuestion } from './quiz-game.logic';

const GAME_ID: GameId = 'quiz';

const TIER_LABELS: Readonly<Record<1 | 2 | 3, string>> = {
  1: 'Para começar',
  2: 'Pensando um pouco mais',
  3: 'Desafio de raciocínio',
};

/**
 * Quiz por níveis.
 *
 * O nível escolhe a faixa de dificuldade das perguntas; dentro do nível o
 * sorteio evita repetir o que já foi perguntado. O filtro por categoria saiu:
 * quem organiza a rodada agora é a dificuldade, não o assunto.
 */
@Component({
  selector: 'app-quiz-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameHud, LevelUpCelebration],
  templateUrl: './quiz-game.html',
  styleUrl: './quiz-game.scss',
})
export class QuizGame {
  private readonly progressService = inject(GameProgressService);
  private askedIds = new Set<string>();

  protected readonly gameId = GAME_ID;
  protected readonly definition = gameDefinition(GAME_ID);

  protected readonly question = signal<QuizQuestion>(this.draw());
  protected readonly selectedIndex = signal<number | null>(null);
  protected readonly earnedPoints = signal(0);
  protected readonly feedbackMessage = signal('');
  protected readonly celebration = signal<CelebrationData | null>(null);

  protected readonly hasAnswered = computed(() => this.selectedIndex() !== null);
  protected readonly isCorrect = computed(
    () => this.selectedIndex() === this.question().correctIndex,
  );

  protected readonly tierLabel = computed(
    () => TIER_LABELS[quizTierFor(this.progressService.progressOf(GAME_ID).level)],
  );

  protected answer(optionIndex: number): void {
    if (this.hasAnswered()) {
      return;
    }

    this.selectedIndex.set(optionIndex);

    const wasCorrect = optionIndex === this.question().correctIndex;
    const outcome = this.progressService.registerChallenge(GAME_ID, wasCorrect);

    this.earnedPoints.set(outcome.earnedPoints);
    this.feedbackMessage.set(
      pickRandom(wasCorrect ? CORRECT_MESSAGES : ENCOURAGEMENT_MESSAGES) ?? '',
    );

    if (outcome.didLevelUp) {
      // O nível novo tem outra faixa de perguntas: o histórico recomeça junto.
      this.askedIds = new Set();
      this.celebration.set(celebrationFrom(outcome, this.definition.label));
    }
  }

  protected next(): void {
    this.startNextQuestion();
  }

  protected continueAfterCelebration(): void {
    this.celebration.set(null);
    this.startNextQuestion();
  }

  protected optionState(optionIndex: number): 'certa' | 'errada' | 'neutra' {
    if (!this.hasAnswered()) {
      return 'neutra';
    }

    if (optionIndex === this.question().correctIndex) {
      return 'certa';
    }

    return optionIndex === this.selectedIndex() ? 'errada' : 'neutra';
  }

  private startNextQuestion(): void {
    this.question.set(this.draw());
    this.selectedIndex.set(null);
    this.earnedPoints.set(0);
    this.feedbackMessage.set('');
  }

  private draw(): QuizQuestion {
    const level = this.progressService.progressOf(GAME_ID).level;
    const question = drawQuestion(level, this.askedIds);

    this.askedIds.add(question.id);

    return question;
  }
}
