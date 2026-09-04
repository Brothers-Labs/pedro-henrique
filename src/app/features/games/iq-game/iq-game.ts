import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import {
  IQ_ACHIEVEMENTS,
  IQ_CORRECT_MESSAGES,
  IQ_DEFAULT_AGE,
  IQ_LEVEL_UP_MESSAGE,
  IQ_MAX_AGE,
  IQ_MIN_AGE,
  IQ_SKILL_LABELS,
  IQ_SUPER_POWER_LABELS,
  IQ_WRONG_MESSAGES,
} from '../../../core/data/iq-game.data';
import { PROFILE } from '../../../core/data/profile.data';
import type {
  IqAchievementId,
  IqAchievementProgress,
  IqAnswerRecord,
  IqChallenge,
  IqIslandId,
  IqLifetimeStats,
} from '../../../core/models/iq-game.model';
import { IqJourneyService } from '../../../core/services/iq-journey.service';
import { MotionPreferenceService } from '../../../core/services/motion-preference.service';
import { calculateAgeInYears } from '../../../core/utils/birthday';
import { AchievementList } from './achievement-list/achievement-list';
import {
  ChallengeView,
  type IqAnswerStatus,
  type IqChallengePhase,
} from './challenge-view/challenge-view';
import { GuardianReport } from './guardian-report/guardian-report';
import { createChallenge } from './iq-game.challenges';
import {
  buildGuardianReport,
  buildIslandProgress,
  CHALLENGE_ISLANDS,
  clampAge,
  countCorrectBySkill,
  initialAdaptiveState,
  isPlayableAge,
  MAX_SKILL_STARS,
  mergeLifetimeStats,
  nextAdaptiveState,
  resolveAgeBand,
  summarizeJourney,
  unlockedAchievementIds,
  xpForAnswer,
} from './iq-game.logic';
import { IslandMap } from './island-map/island-map';

/** Etapa da tela: escolha da idade, mapa, desafio em andamento e comemoração. */
type IqPhase = 'inicio' | 'mapa' | 'desafio' | 'resultado';

/**
 * Quem pede menos movimento também costuma precisar de mais tempo de leitura,
 * então a sequência da memória fica mais tempo na tela.
 */
const CALM_EXPOSURE_FACTOR = 1.5;

/**
 * Desafio da Mente: uma jornada de desafios cognitivos para crianças.
 *
 * A tela orquestra a aventura e delega o resto: a fábrica monta os desafios, o
 * motor cuida de progressão e pontuação, e os componentes filhos desenham o
 * mapa, o desafio e o relatório dos responsáveis.
 *
 * O resultado é educativo e gamificado. Não existe QI, diagnóstico nem
 * comparação com outras crianças em nenhum ponto da experiência.
 */
@Component({
  selector: 'app-iq-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IslandMap, ChallengeView, AchievementList, GuardianReport],
  templateUrl: './iq-game.html',
  styleUrl: './iq-game.scss',
})
export class IqGame {
  private readonly journeys = inject(IqJourneyService);
  private readonly motion = inject(MotionPreferenceService);

  private readonly continueButton = viewChild<ElementRef<HTMLButtonElement>>('continueButton');
  private readonly guardianDialog = viewChild<ElementRef<HTMLDialogElement>>('guardianDialog');

  protected readonly childName = PROFILE.firstName;
  protected readonly minAge = IQ_MIN_AGE;
  protected readonly maxAge = IQ_MAX_AGE;
  protected readonly skillLabels = IQ_SKILL_LABELS;
  protected readonly superPowerLabels = IQ_SUPER_POWER_LABELS;
  protected readonly levelUpMessage = IQ_LEVEL_UP_MESSAGE;
  /** Uma posição por estrela, para desenhar as vazias junto das conquistadas. */
  protected readonly starSlots = Array.from({ length: MAX_SKILL_STARS }, (_, i) => i + 1);

  protected readonly age = signal(clampAge(calculateAgeInYears(PROFILE.birthDate)));
  protected readonly phase = signal<IqPhase>('inicio');

  private readonly clearedCount = signal(0);
  private readonly clearedIslandIds = signal<readonly IqIslandId[]>([]);
  private readonly perfectMemoryRuns = signal(0);
  private readonly attentionRuns = signal(0);
  private readonly islandMisses = signal(0);
  private readonly achievementsAtStart = signal<ReadonlySet<IqAchievementId>>(new Set());
  private readonly isSaved = signal(false);
  private readonly finishedAt = signal<string | null>(null);
  private readonly reportOpenedAt = signal(new Date().toISOString());
  /** O relatório só é montado enquanto está aberto: fechado, não custa nada. */
  protected readonly isGuardianOpen = signal(false);

  /** Identificador crescente dos desafios sorteados, para não repetir chaves. */
  private challengeOrder = 0;
  private questionStartedAt = 0;
  private exposureTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly challengeNumber = signal(0);
  protected readonly currentChallenge = signal<IqChallenge | null>(null);
  protected readonly status = signal<IqAnswerStatus>('aguardando');
  protected readonly challengePhase = signal<IqChallengePhase>('respondendo');
  protected readonly chosenIndex = signal<number | null>(null);
  protected readonly streak = signal(0);
  protected readonly bestStreak = signal(0);
  protected readonly totalXp = signal(0);
  protected readonly lastEarnedXp = signal(0);
  protected readonly answers = signal<readonly IqAnswerRecord[]>([]);

  protected readonly band = computed(() => resolveAgeBand(this.age()));
  protected readonly adaptive = signal(initialAdaptiveState(resolveAgeBand(IQ_DEFAULT_AGE)));

  protected readonly canDecreaseAge = computed(() => isPlayableAge(this.age() - 1));
  protected readonly canIncreaseAge = computed(() => isPlayableAge(this.age() + 1));

  protected readonly currentIsland = computed(
    () => CHALLENGE_ISLANDS[Math.min(this.clearedCount(), CHALLENGE_ISLANDS.length - 1)],
  );
  protected readonly challengesPerIsland = computed(() => this.band().challengesPerIsland);
  protected readonly islands = computed(() =>
    buildIslandProgress(this.clearedCount(), this.phase() === 'desafio'),
  );

  protected readonly totalChallenges = computed(
    () => CHALLENGE_ISLANDS.length * this.challengesPerIsland(),
  );
  protected readonly journeyPercentage = computed(() =>
    Math.round((this.answers().length / this.totalChallenges()) * 100),
  );

  protected readonly isSettled = computed(() => this.status() !== 'aguardando');
  protected readonly isLastChallengeOfIsland = computed(
    () => this.challengeNumber() + 1 >= this.challengesPerIsland(),
  );

  protected readonly feedbackMessage = computed(() => {
    const order = this.challengeNumber();

    switch (this.status()) {
      case 'certo':
        return IQ_CORRECT_MESSAGES[order % IQ_CORRECT_MESSAGES.length];
      case 'errado':
        return IQ_WRONG_MESSAGES[order % IQ_WRONG_MESSAGES.length];
      default:
        return '';
    }
  });

  /** A subida de nível é comemorada; a descida acontece em silêncio. */
  protected readonly hasLevelledUp = computed(
    () => this.isSettled() && this.adaptive().hasLevelledUp,
  );

  protected readonly summary = computed(() =>
    summarizeJourney({
      band: this.band(),
      age: this.age(),
      answers: this.answers(),
      totalXp: this.totalXp(),
      bestStreak: this.bestStreak(),
    }),
  );

  /** Números desta jornada, no mesmo formato do que já está guardado. */
  private readonly journeyStats = computed<IqLifetimeStats>(() => ({
    totalXp: this.totalXp(),
    bestStreak: this.bestStreak(),
    correctBySkill: countCorrectBySkill(this.answers()),
    clearedIslandIds: this.clearedIslandIds(),
    perfectMemoryRuns: this.perfectMemoryRuns(),
    attentionRuns: this.attentionRuns(),
    journeysCompleted: this.phase() === 'resultado' ? 1 : 0,
  }));

  /** Acumulado já contando a jornada em andamento, sem dobrar depois de salvar. */
  private readonly lifetimeWithJourney = computed(() =>
    this.isSaved()
      ? this.journeys.lifetime()
      : mergeLifetimeStats(this.journeys.lifetime(), this.journeyStats()),
  );

  protected readonly unlockedAchievements = computed(() =>
    unlockedAchievementIds(this.lifetimeWithJourney()),
  );

  /** Conquistas prontas para a tela, com o "Nova!" desta jornada. */
  protected readonly achievementItems = computed<readonly IqAchievementProgress[]>(() => {
    const unlocked = this.unlockedAchievements();
    const atStart = this.achievementsAtStart();

    return IQ_ACHIEVEMENTS.map((achievement) => ({
      achievement,
      isUnlocked: unlocked.has(achievement.id),
      isNew: unlocked.has(achievement.id) && !atStart.has(achievement.id),
    }));
  });

  protected readonly guardianReport = computed(() =>
    buildGuardianReport({
      childName: this.childName,
      age: this.age(),
      evaluatedAt: this.finishedAt() ?? this.reportOpenedAt(),
      summary: this.summary(),
    }),
  );

  protected readonly history = this.journeys.history;

  constructor() {
    // Depois de responder, as alternativas ficam desabilitadas e o foco se
    // perderia. Levá-lo ao botão de continuar mantém a jornada jogável só com
    // o teclado, sem precisar navegar de volta desde o topo da página.
    effect(() => {
      if (this.isSettled()) {
        this.continueButton()?.nativeElement.focus();
      }
    });

    inject(DestroyRef).onDestroy(() => this.clearExposureTimer());
  }

  /* Idade ------------------------------------------------------------------ */

  protected decreaseAge(): void {
    this.changeAge(this.age() - 1);
  }

  protected increaseAge(): void {
    this.changeAge(this.age() + 1);
  }

  /** Idade sempre válida: valores fora da faixa são trazidos para dentro dela. */
  private changeAge(candidate: number): void {
    const nextAge = clampAge(candidate);
    if (nextAge === this.age()) {
      return;
    }

    this.age.set(nextAge);
    this.adaptive.set(initialAdaptiveState(resolveAgeBand(nextAge)));
  }

  /* Jornada ----------------------------------------------------------------- */

  protected startJourney(): void {
    this.resetJourney();
    this.achievementsAtStart.set(this.unlockedAchievements());
    this.phase.set('mapa');
  }

  protected enterIsland(): void {
    this.islandMisses.set(0);
    this.challengeNumber.set(0);
    this.phase.set('desafio');
    this.loadChallenge();
  }

  protected answer(index: number): void {
    const challenge = this.currentChallenge();
    // Enquanto a sequência da memória está na tela ninguém responde: sem essa
    // trava o tempo de resposta sairia negativo e a fase perderia o sentido.
    if (!challenge || this.isSettled() || this.challengePhase() === 'memorizando') {
      return;
    }

    const wasCorrect = index === challenge.correctIndex;
    const streak = wasCorrect ? this.streak() + 1 : 0;
    const earnedXp = xpForAnswer(challenge.difficulty, wasCorrect, streak);

    this.chosenIndex.set(index);
    this.status.set(wasCorrect ? 'certo' : 'errado');
    this.streak.set(streak);
    this.bestStreak.update((best) => Math.max(best, streak));
    this.totalXp.update((xp) => xp + earnedXp);
    this.lastEarnedXp.set(earnedXp);
    this.answers.update((list) => [
      ...list,
      buildAnswer(challenge, wasCorrect, Date.now() - this.questionStartedAt),
    ]);

    if (!wasCorrect) {
      this.islandMisses.update((misses) => misses + 1);
    }

    this.adaptive.set(nextAdaptiveState(this.adaptive(), wasCorrect));
  }

  protected continueJourney(): void {
    if (this.isLastChallengeOfIsland()) {
      this.finishIsland();
      return;
    }

    this.challengeNumber.update((number) => number + 1);
    this.loadChallenge();
  }

  protected playAgain(): void {
    this.resetJourney();
    this.achievementsAtStart.set(this.unlockedAchievements());
    this.phase.set('mapa');
  }

  protected backToStart(): void {
    this.resetJourney();
    this.phase.set('inicio');
  }

  /* Área dos responsáveis ---------------------------------------------------- */

  protected openGuardianReport(): void {
    this.reportOpenedAt.set(new Date().toISOString());
    this.isGuardianOpen.set(true);
    this.guardianDialog()?.nativeElement.showModal();
  }

  protected closeGuardianReport(): void {
    this.isGuardianOpen.set(false);
    this.guardianDialog()?.nativeElement.close();
  }

  /* Bastidores ---------------------------------------------------------------- */

  private loadChallenge(): void {
    const island = this.currentIsland();
    const type = island.types[this.challengeNumber() % island.types.length];

    this.challengeOrder += 1;
    const challenge = createChallenge(type, this.adaptive().difficulty, this.challengeOrder);

    this.currentChallenge.set(challenge);
    this.status.set('aguardando');
    this.chosenIndex.set(null);
    this.lastEarnedXp.set(0);

    if (challenge.format === 'memoria') {
      this.startExposure(challenge.exposureMs);
      return;
    }

    this.challengePhase.set('respondendo');
    this.startResponseTimer();
  }

  /** Mostra a sequência da memória e só então abre a pergunta. */
  private startExposure(exposureMs: number): void {
    this.clearExposureTimer();
    this.challengePhase.set('memorizando');

    const duration = this.motion.isAllowed() ? exposureMs : exposureMs * CALM_EXPOSURE_FACTOR;

    this.exposureTimer = setTimeout(() => {
      this.challengePhase.set('respondendo');
      this.startResponseTimer();
    }, duration);
  }

  private startResponseTimer(): void {
    this.questionStartedAt = Date.now();
  }

  private clearExposureTimer(): void {
    if (this.exposureTimer !== null) {
      clearTimeout(this.exposureTimer);
      this.exposureTimer = null;
    }
  }

  private finishIsland(): void {
    const island = this.currentIsland();

    this.clearedIslandIds.update((ids) => [...ids, island.id]);
    if (island.id === 'memoria' && this.islandMisses() === 0) {
      this.perfectMemoryRuns.set(1);
    }
    if (island.id === 'atencao') {
      this.attentionRuns.set(1);
    }

    this.clearedCount.update((cleared) => cleared + 1);

    if (this.clearedCount() >= CHALLENGE_ISLANDS.length) {
      this.finishJourney();
      return;
    }

    this.phase.set('mapa');
  }

  private finishJourney(): void {
    this.clearExposureTimer();
    this.phase.set('resultado');

    const completedAt = new Date().toISOString();
    this.finishedAt.set(completedAt);

    this.journeys.saveJourney(
      { completedAt, summary: this.summary() },
      mergeLifetimeStats(this.journeys.lifetime(), this.journeyStats()),
    );
    this.isSaved.set(true);
  }

  private resetJourney(): void {
    this.clearExposureTimer();

    this.clearedCount.set(0);
    this.clearedIslandIds.set([]);
    this.perfectMemoryRuns.set(0);
    this.attentionRuns.set(0);
    this.islandMisses.set(0);
    this.challengeNumber.set(0);
    this.currentChallenge.set(null);
    this.status.set('aguardando');
    this.challengePhase.set('respondendo');
    this.chosenIndex.set(null);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.totalXp.set(0);
    this.lastEarnedXp.set(0);
    this.answers.set([]);
    this.adaptive.set(initialAdaptiveState(this.band()));
    this.finishedAt.set(null);
    this.isSaved.set(false);
  }
}

/** Registro de uma resposta, no formato que o motor consome. */
function buildAnswer(
  challenge: IqChallenge,
  wasCorrect: boolean,
  responseMs: number,
): IqAnswerRecord {
  return {
    challengeId: challenge.id,
    skill: challenge.skill,
    difficulty: challenge.difficulty,
    wasCorrect,
    responseMs,
  };
}
