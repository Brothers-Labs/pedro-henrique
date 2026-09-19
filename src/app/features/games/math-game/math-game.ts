import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { gameDefinition } from '../../../core/data/game-progress.data';
import {
  MATH_CELEBRATIONS,
  MATH_ENCOURAGEMENTS,
  MATH_OPERATION_LABELS,
} from '../../../core/data/math-game.data';
import { PROFILE } from '../../../core/data/profile.data';
import { mathPlanFor } from '../../../core/games/difficulty';
import type { GameId } from '../../../core/models/game-progress.model';
import type { MathChallenge } from '../../../core/models/math-game.model';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { pickRandom } from '../../../core/utils/shuffle';
import { GameHud } from '../shared/game-hud/game-hud';
import { celebrationFrom } from '../shared/level-up-celebration/celebration';
import type { CelebrationData } from '../shared/level-up-celebration/level-up-celebration';
import { LevelUpCelebration } from '../shared/level-up-celebration/level-up-celebration';
import { buildChallenge, parseTypedAnswer } from './math-game.logic';

const GAME_ID: GameId = 'matematica';

type AnswerStatus = 'aguardando' | 'certo' | 'errado';

/**
 * Jogo de matemática por níveis.
 *
 * A dificuldade vem do nível alcançado, nunca da idade: o nível 8 traz
 * multiplicação para qualquer criança que tenha chegado até ele.
 *
 * Uma conta de cada vez, com a resposta travada depois do primeiro toque — é
 * o que impede um duplo clique de contar dois desafios.
 */
@Component({
  selector: 'app-math-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameHud, LevelUpCelebration],
  templateUrl: './math-game.html',
  styleUrl: './math-game.scss',
})
export class MathGame {
  private readonly progressService = inject(GameProgressService);

  protected readonly gameId = GAME_ID;
  protected readonly definition = gameDefinition(GAME_ID);
  protected readonly operationLabels = MATH_OPERATION_LABELS;

  protected readonly challenge = signal<MathChallenge>(this.drawChallenge());
  protected readonly status = signal<AnswerStatus>('aguardando');
  protected readonly chosenOption = signal<number | null>(null);
  protected readonly typedAnswer = signal('');
  protected readonly feedbackMessage = signal('');
  protected readonly earnedPoints = signal(0);
  protected readonly isHintVisible = signal(false);
  protected readonly celebration = signal<CelebrationData | null>(null);

  protected readonly hasAnswered = computed(() => this.status() !== 'aguardando');
  protected readonly hasOptions = computed(() => this.challenge().options.length > 0);
  protected readonly canSubmitTyped = computed(
    () => !this.hasAnswered() && parseTypedAnswer(this.typedAnswer()) !== null,
  );

  /** Nome da faixa de conteúdo do nível, para a criança saber o que treina. */
  protected readonly levelTopic = computed(() => {
    const plan = mathPlanFor(this.progressService.progressOf(GAME_ID).level);

    return plan.operations.map((operation) => MATH_OPERATION_LABELS[operation]).join(' e ');
  });

  protected answerWithOption(value: number): void {
    if (this.hasAnswered()) {
      return;
    }

    this.chosenOption.set(value);
    this.settle(value === this.challenge().answer);
  }

  protected submitTypedAnswer(): void {
    const parsed = parseTypedAnswer(this.typedAnswer());

    if (this.hasAnswered() || parsed === null) {
      return;
    }

    this.settle(parsed === this.challenge().answer);
  }

  protected showHint(): void {
    this.isHintVisible.set(true);
  }

  protected next(): void {
    this.startNextChallenge();
  }

  protected continueAfterCelebration(): void {
    this.celebration.set(null);
    this.startNextChallenge();
  }

  protected optionState(option: number): 'certa' | 'errada' | 'neutra' {
    if (!this.hasAnswered()) {
      return 'neutra';
    }

    if (option === this.challenge().answer) {
      return 'certa';
    }

    return option === this.chosenOption() ? 'errada' : 'neutra';
  }

  /**
   * Fecha o desafio: conta o resultado uma vez só e guarda o que mostrar.
   *
   * A pontuação é pedida ao serviço, e não calculada aqui, para que o jogo
   * nunca tenha uma regra de pontos própria.
   */
  private settle(wasCorrect: boolean): void {
    this.status.set(wasCorrect ? 'certo' : 'errado');

    const outcome = this.progressService.registerChallenge(GAME_ID, wasCorrect);

    this.earnedPoints.set(outcome.earnedPoints);
    this.feedbackMessage.set(
      pickRandom(wasCorrect ? MATH_CELEBRATIONS : MATH_ENCOURAGEMENTS) ?? '',
    );

    if (outcome.didLevelUp) {
      this.celebration.set(celebrationFrom(outcome, this.definition.label));
    }
  }

  private startNextChallenge(): void {
    this.challenge.set(this.drawChallenge());
    this.status.set('aguardando');
    this.chosenOption.set(null);
    this.typedAnswer.set('');
    this.feedbackMessage.set('');
    this.earnedPoints.set(0);
    this.isHintVisible.set(false);
  }

  private drawChallenge(): MathChallenge {
    const progress = this.progressService.progressOf(GAME_ID);

    return buildChallenge(progress.level, progress.completedInLevel, Math.random, PROFILE.firstName);
  }
}
