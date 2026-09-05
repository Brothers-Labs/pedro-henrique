import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';

import {
  MATH_CELEBRATIONS,
  MATH_DEFAULT_AGE,
  MATH_ENCOURAGEMENTS,
  MATH_OPERATION_LABELS,
  MATH_PLAYABLE_AGES,
  MATH_TIER_LABELS,
} from '../../../core/data/math-game.data';
import type { MathAgeBand, MathStage, MathTrail } from '../../../core/models/math-game.model';
import {
  buildTrail,
  buildTrailSteps,
  completionPercentage,
  MAX_STARS,
  parseTypedAnswer,
  resolveAgeBand,
  starsForMisses,
} from './math-game.logic';
import { TrailMap } from './trail-map/trail-map';

/**
 * Situação da fase atual. `acertou` encerra a fase e libera o botão de avançar;
 * `errou` mantém tudo aberto para a criança tentar outra vez.
 */
type StageStatus = 'aguardando' | 'errou' | 'acertou';

@Component({
  selector: 'app-math-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrailMap],
  templateUrl: './math-game.html',
  styleUrl: './math-game.scss',
})
export class MathGame {
  private readonly nextButton = viewChild<ElementRef<HTMLButtonElement>>('nextButton');

  protected readonly ages = MATH_PLAYABLE_AGES;
  protected readonly maxStars = MAX_STARS;
  /** Uma posição por estrela, para desenhar as vazias junto das conquistadas. */
  protected readonly starSlots = Array.from({ length: MAX_STARS }, (_, index) => index + 1);
  protected readonly operationLabels = MATH_OPERATION_LABELS;
  protected readonly tierLabels = MATH_TIER_LABELS;

  protected readonly selectedAge = signal(MATH_DEFAULT_AGE);
  protected readonly band = signal<MathAgeBand | null>(null);
  protected readonly trail = signal<MathTrail | null>(null);
  protected readonly stageIndex = signal(0);
  /** Estrelas conquistadas por fase; zero significa fase ainda não concluída. */
  protected readonly stageStars = signal<readonly number[]>([]);
  protected readonly isTrailFinished = signal(false);

  protected readonly status = signal<StageStatus>('aguardando');
  protected readonly typedAnswer = signal('');
  protected readonly wrongOptions = signal<readonly number[]>([]);
  protected readonly missCount = signal(0);
  protected readonly isHintVisible = signal(false);

  /** Faixa correspondente à idade escolhida, mostrada antes de começar. */
  protected readonly previewBand = computed(() => resolveAgeBand(this.selectedAge()).band);

  protected readonly stages = computed<readonly MathStage[]>(() => this.trail()?.stages ?? []);
  protected readonly totalStages = computed(() => this.stages().length);
  protected readonly stage = computed<MathStage | null>(
    () => this.stages()[this.stageIndex()] ?? null,
  );

  protected readonly countingStage = computed(() => {
    const stage = this.stage();
    return stage?.kind === 'contagem' ? stage : null;
  });

  protected readonly expressionStage = computed(() => {
    const stage = this.stage();
    return stage?.kind === 'expressao' ? stage : null;
  });

  protected readonly hasOptions = computed(() => (this.stage()?.options.length ?? 0) > 0);
  protected readonly isSettled = computed(() => this.status() === 'acertou');
  protected readonly isLastStage = computed(() => this.stageIndex() === this.totalStages() - 1);
  protected readonly canSubmitTyped = computed(
    () => parseTypedAnswer(this.typedAnswer()) !== null && !this.isSettled(),
  );

  protected readonly completedStages = computed(
    () => this.stageStars().filter((stars) => stars > 0).length,
  );
  protected readonly progressPercentage = computed(() =>
    completionPercentage(this.completedStages(), this.totalStages()),
  );
  protected readonly totalStars = computed(() =>
    this.stageStars().reduce((sum, stars) => sum + stars, 0),
  );
  protected readonly maxTrailStars = computed(() => this.totalStages() * MAX_STARS);

  protected readonly steps = computed(() =>
    buildTrailSteps(this.stages(), this.stageStars(), this.stageIndex()),
  );

  /** Erros e dica pesam igual: cada ajuda tira uma estrela da fase. */
  private readonly stagePenalty = computed(
    () => this.missCount() + (this.isHintVisible() ? 1 : 0),
  );

  /** Estrelas que a fase atual vale se a criança acertar agora. */
  protected readonly starsAtStake = computed(() => starsForMisses(this.stagePenalty()));

  protected readonly feedbackMessage = computed(() => {
    const stageIndex = this.stageIndex();

    switch (this.status()) {
      case 'acertou':
        return MATH_CELEBRATIONS[stageIndex % MATH_CELEBRATIONS.length];
      case 'errou': {
        const attempt = Math.max(0, this.missCount() - 1);
        return MATH_ENCOURAGEMENTS[attempt % MATH_ENCOURAGEMENTS.length];
      }
      default:
        return '';
    }
  });

  protected readonly finalMessage = computed(() => {
    const perfectRun = this.totalStars() === this.maxTrailStars();
    if (perfectRun) {
      return 'Trilha perfeita! Você acertou tudo de primeira.';
    }

    return this.totalStars() >= this.maxTrailStars() / 2
      ? 'Muito bem! Você chegou até o final da trilha.'
      : 'Você conseguiu! Cada rodada fica mais fácil.';
  });

  constructor() {
    // Ao acertar, as alternativas são desabilitadas e o foco se perderia. Levá-lo
    // ao botão de avançar mantém o jogo utilizável só com o teclado.
    effect(() => {
      if (this.isSettled()) {
        this.nextButton()?.nativeElement.focus();
      }
    });
  }

  protected changeAge(value: string): void {
    this.selectedAge.set(Number(value));
  }

  protected startTrail(): void {
    const { band } = resolveAgeBand(this.selectedAge());

    this.band.set(band);
    this.openTrail(band);
  }

  /** Recomeça com contas novas, para a trilha nunca sair igual. */
  protected playAgain(): void {
    const band = this.band();
    if (band) {
      this.openTrail(band);
    }
  }

  protected changeAgeAgain(): void {
    this.band.set(null);
    this.trail.set(null);
    this.isTrailFinished.set(false);
  }

  protected goToStage(index: number): void {
    this.stageIndex.set(index);
    this.isTrailFinished.set(false);
    this.resetStageState();
  }

  protected answerWithOption(option: number): void {
    const stage = this.stage();
    if (!stage || this.isSettled() || this.wrongOptions().includes(option)) {
      return;
    }

    if (option === stage.answer) {
      this.registerVictory();
      return;
    }

    this.wrongOptions.update((options) => [...options, option]);
    this.registerMiss();
  }

  protected submitTypedAnswer(): void {
    const stage = this.stage();
    const answer = parseTypedAnswer(this.typedAnswer());
    if (!stage || answer === null || this.isSettled()) {
      return;
    }

    if (answer === stage.answer) {
      this.registerVictory();
      return;
    }

    this.registerMiss();
  }

  /** Aparência de cada alternativa: certa em verde, erradas riscadas. */
  protected optionState(option: number): 'certa' | 'errada' | 'idle' {
    if (this.isSettled() && option === this.stage()?.answer) {
      return 'certa';
    }

    return this.wrongOptions().includes(option) ? 'errada' : 'idle';
  }

  protected showHint(): void {
    this.isHintVisible.set(true);
  }

  protected nextStage(): void {
    if (this.isLastStage()) {
      this.isTrailFinished.set(true);
      return;
    }

    this.stageIndex.update((index) => index + 1);
    this.resetStageState();
  }

  private openTrail(band: MathAgeBand): void {
    const trail = buildTrail(band);

    this.trail.set(trail);
    this.stageStars.set(trail.stages.map(() => 0));
    this.stageIndex.set(0);
    this.isTrailFinished.set(false);
    this.resetStageState();
  }

  private registerVictory(): void {
    const earnedStars = this.starsAtStake();
    const currentIndex = this.stageIndex();

    this.stageStars.update((stars) =>
      stars.map((value, index) => (index === currentIndex ? Math.max(value, earnedStars) : value)),
    );
    this.status.set('acertou');
  }

  private registerMiss(): void {
    this.missCount.update((count) => count + 1);
    this.status.set('errou');
  }

  private resetStageState(): void {
    this.status.set('aguardando');
    this.typedAnswer.set('');
    this.wrongOptions.set([]);
    this.missCount.set(0);
    this.isHintVisible.set(false);
  }
}
