import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import {
  IQ_CORRECT_MESSAGES,
  IQ_SKILL_LABELS,
  IQ_WRONG_MESSAGES,
} from '../../../core/data/iq-game.data';
import { gameDefinition } from '../../../core/data/game-progress.data';
import { PROFILE } from '../../../core/data/profile.data';
import { reasoningDifficultyFor } from '../../../core/games/difficulty';
import { levelFeedbackFor } from '../../../core/games/progression';
import type { GameId } from '../../../core/models/game-progress.model';
import type {
  IqAdaptiveState,
  IqAnswerRecord,
  IqChallenge,
  IqChallengeType,
} from '../../../core/models/iq-game.model';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { pickRandom } from '../../../core/utils/shuffle';
import { CelebrationEffects } from '../../../shared/components/celebration-effects/celebration-effects';
import { GameHud } from '../shared/game-hud/game-hud';
import { celebrationFrom } from '../shared/level-up-celebration/celebration';
import type { CelebrationData } from '../shared/level-up-celebration/level-up-celebration';
import { LevelUpCelebration } from '../shared/level-up-celebration/level-up-celebration';
import type { IqAnswerStatus, IqChallengePhase } from './challenge-view/challenge-view';
import { ChallengeView } from './challenge-view/challenge-view';
import { createChallenge, SKILL_BY_TYPE } from './iq-game.challenges';
import { buildSkillScores, nextAdaptiveState, starsForAccuracy } from './iq-game.logic';

const GAME_ID: GameId = 'qi';

/** Tipos sorteados na rodada, percorridos em ciclo para variar as categorias. */
const CHALLENGE_TYPES: readonly IqChallengeType[] = [
  'padrao',
  'sequencia',
  'atencao',
  'diferente',
  'memoria',
  'linguagem',
  'rotacao',
];

/** As categorias que a criança lê na abertura, antes de começar. */
export const REASONING_TOPICS: readonly { readonly emoji: string; readonly label: string }[] = [
  { emoji: '🔢', label: 'números' },
  { emoji: '🧩', label: 'padrões' },
  { emoji: '👀', label: 'atenção' },
  { emoji: '💭', label: 'lógica' },
  { emoji: '🔷', label: 'formas' },
];

type RunPhase = 'inicio' | 'desafio' | 'resultado';

/** Uma resposta guardada para a revisão do fim da rodada. */
interface ReviewEntry {
  readonly position: number;
  readonly prompt: string;
  readonly chosen: string;
  readonly correct: string;
  readonly wasCorrect: boolean;
}

/**
 * Desafio de raciocínio.
 *
 * É um jogo do site, e não uma avaliação: a tela mostra acertos, porcentagem e
 * pontos, e em nenhum momento traduz isso em um número de QI. Uma pontuação de
 * jogo não mede a inteligência de ninguém, e fingir que mede seria enganoso.
 *
 * A dificuldade começa no nível alcançado e continua se adaptando dentro da
 * rodada: dois acertos seguidos sobem um degrau, dois erros descem.
 */
@Component({
  selector: 'app-iq-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChallengeView, GameHud, LevelUpCelebration, CelebrationEffects],
  templateUrl: './iq-game.html',
  styleUrl: './iq-game.scss',
})
export class IqGame {
  private readonly progressService = inject(GameProgressService);
  private exposureTimer: ReturnType<typeof setTimeout> | null = null;
  private order = 0;

  protected readonly gameId = GAME_ID;
  protected readonly definition = gameDefinition(GAME_ID);
  protected readonly childName = PROFILE.firstName;
  protected readonly topics = REASONING_TOPICS;
  protected readonly skillLabels = IQ_SKILL_LABELS;
  protected readonly totalChallenges = this.definition.challengesPerLevel;

  protected readonly phase = signal<RunPhase>('inicio');
  protected readonly challenge = signal<IqChallenge | null>(null);
  protected readonly challengePhase = signal<IqChallengePhase>('respondendo');
  protected readonly status = signal<IqAnswerStatus>('aguardando');
  protected readonly chosenIndex = signal<number | null>(null);
  protected readonly feedbackMessage = signal('');
  protected readonly celebration = signal<CelebrationData | null>(null);

  /** Posição da rodada, de 1 a 10. */
  protected readonly position = signal(0);
  protected readonly correctCount = signal(0);
  protected readonly streak = signal(0);
  protected readonly bestStreak = signal(0);
  protected readonly earnedPoints = signal(0);
  protected readonly answers = signal<readonly IqAnswerRecord[]>([]);
  protected readonly review = signal<readonly ReviewEntry[]>([]);
  protected readonly isReviewOpen = signal(false);

  private adaptive: IqAdaptiveState = this.initialAdaptive();

  protected readonly progress = computed(() => this.progressService.progressOf(GAME_ID));
  protected readonly isSettled = computed(() => this.status() !== 'aguardando');
  protected readonly isLastChallenge = computed(() => this.position() >= this.totalChallenges);

  protected readonly runPercentage = computed(() =>
    Math.round((this.position() / this.totalChallenges) * 100),
  );

  protected readonly accuracy = computed(() =>
    Math.round((this.correctCount() / this.totalChallenges) * 100),
  );

  protected readonly resultMessage = computed(() =>
    levelFeedbackFor(this.correctCount(), this.totalChallenges),
  );

  /** Recorde pessoal: melhor rodada já feita, guardada junto do progresso. */
  protected readonly personalBest = computed(() => this.progress().bestLevelScore);
  protected readonly isNewRecord = computed(
    () => this.phase() === 'resultado' && this.correctCount() >= this.personalBest(),
  );

  protected readonly skillScores = computed(() => buildSkillScores(this.answers()));
  protected readonly starSlots = [1, 2, 3, 4, 5];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearExposureTimer());
  }

  protected start(): void {
    this.order = 0;
    this.adaptive = this.initialAdaptive();
    this.position.set(0);
    this.correctCount.set(0);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.earnedPoints.set(0);
    this.answers.set([]);
    this.review.set([]);
    this.isReviewOpen.set(false);
    this.phase.set('desafio');
    this.drawChallenge();
  }

  protected answer(optionIndex: number): void {
    const current = this.challenge();

    if (!current || this.isSettled()) {
      return;
    }

    const wasCorrect = optionIndex === current.correctIndex;

    this.chosenIndex.set(optionIndex);
    this.status.set(wasCorrect ? 'certo' : 'errado');
    this.feedbackMessage.set(
      pickRandom(wasCorrect ? IQ_CORRECT_MESSAGES : IQ_WRONG_MESSAGES) ?? '',
    );

    this.recordAnswer(current, optionIndex, wasCorrect);

    const outcome = this.progressService.registerChallenge(GAME_ID, wasCorrect);
    this.earnedPoints.update((total) => total + outcome.earnedPoints);

    if (outcome.didLevelUp) {
      this.celebration.set(celebrationFrom(outcome, this.definition.label));
    }

    this.adaptive = nextAdaptiveState(this.adaptive, wasCorrect);
  }

  protected next(): void {
    if (this.isLastChallenge()) {
      this.phase.set('resultado');
      return;
    }

    this.drawChallenge();
  }

  protected continueAfterCelebration(): void {
    this.celebration.set(null);

    if (this.isLastChallenge()) {
      this.phase.set('resultado');
    }
  }

  protected toggleReview(): void {
    this.isReviewOpen.update((isOpen) => !isOpen);
  }

  protected backToStart(): void {
    this.clearExposureTimer();
    this.phase.set('inicio');
  }

  private recordAnswer(current: IqChallenge, optionIndex: number, wasCorrect: boolean): void {
    if (wasCorrect) {
      this.correctCount.update((total) => total + 1);
      this.streak.update((streak) => streak + 1);
      this.bestStreak.update((best) => Math.max(best, this.streak()));
    } else {
      this.streak.set(0);
    }

    this.answers.update((records) => [
      ...records,
      {
        challengeId: current.id,
        skill: SKILL_BY_TYPE[current.type],
        difficulty: current.difficulty,
        wasCorrect,
        responseMs: 0,
      },
    ]);

    this.review.update((entries) => [
      ...entries,
      {
        position: this.position(),
        prompt: current.prompt,
        chosen: optionLabel(current, optionIndex),
        correct: optionLabel(current, current.correctIndex),
        wasCorrect,
      },
    ]);
  }

  /**
   * Sorteia o próximo desafio.
   *
   * Os tipos são percorridos em ciclo para que a rodada sempre passe por
   * categorias diferentes, em vez de sortear cinco vezes o mesmo formato.
   */
  private drawChallenge(): void {
    this.clearExposureTimer();

    const next = this.position() + 1;
    const type = CHALLENGE_TYPES[this.order % CHALLENGE_TYPES.length];
    const created = createChallenge(type, this.adaptive.difficulty, this.order);

    this.order += 1;
    this.position.set(next);
    this.challenge.set(created);
    this.status.set('aguardando');
    this.chosenIndex.set(null);
    this.feedbackMessage.set('');

    if (created.format !== 'memoria') {
      this.challengePhase.set('respondendo');
      return;
    }

    // A sequência da memória some sozinha antes de a pergunta aparecer.
    this.challengePhase.set('memorizando');
    this.exposureTimer = setTimeout(
      () => this.challengePhase.set('respondendo'),
      created.exposureMs,
    );
  }

  private initialAdaptive(): IqAdaptiveState {
    return {
      difficulty: reasoningDifficultyFor(this.progressService.progressOf(GAME_ID).level),
      correctStreak: 0,
      wrongStreak: 0,
      hasLevelledUp: false,
    };
  }

  private clearExposureTimer(): void {
    if (this.exposureTimer !== null) {
      clearTimeout(this.exposureTimer);
      this.exposureTimer = null;
    }
  }
}

/** Texto da alternativa, qualquer que seja o formato do desafio. */
function optionLabel(challenge: IqChallenge, index: number): string {
  switch (challenge.format) {
    case 'tokens':
    case 'memoria':
      return challenge.options[index]?.label ?? '—';
    case 'figuras':
      return challenge.options[index]?.label ?? '—';
    case 'atencao':
      return challenge.grid[index]?.label ?? '—';
  }
}

export { starsForAccuracy };
