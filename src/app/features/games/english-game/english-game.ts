import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { challengesOfLevel, ENGLISH_LEVELS } from '../../../core/data/english-quiz.data';
import type {
  EnglishChoiceChallenge,
  EnglishLevel,
  EnglishLevelId,
  EnglishWritingChallenge,
} from '../../../core/models/english-quiz.model';
import { EnglishProgressService } from '../../../core/services/english-progress.service';
import {
  calculateEarnedXp,
  checkWritingAnswer,
  correctAnswerOf,
  speakableTextOf,
  STREAK_BONUS_THRESHOLD,
} from './english-game.logic';
import { LevelPicker } from './level-picker/level-picker';

/**
 * Situação da fase atual. `quase` e `errou` deixam a criança tentar de novo;
 * `acertou` e `revelou` encerram a fase e liberam o botão de avançar.
 */
type ChallengeStatus = 'aguardando' | 'quase' | 'errou' | 'acertou' | 'revelou';

/** Depois de dois erros na escrita, oferecemos a resposta para não travar. */
const MISSES_BEFORE_REVEAL = 2;

/** Velocidade da leitura em inglês: devagar o bastante para repetir junto. */
const SPEECH_RATE = 0.8;

@Component({
  selector: 'app-english-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LevelPicker],
  templateUrl: './english-game.html',
  styleUrl: './english-game.scss',
})
export class EnglishGame {
  protected readonly progress = inject(EnglishProgressService);

  private readonly nextButton = viewChild<ElementRef<HTMLButtonElement>>('nextButton');

  protected readonly levels = ENGLISH_LEVELS;
  protected readonly streakBonusThreshold = STREAK_BONUS_THRESHOLD;
  protected readonly isAudioSupported = typeof speechSynthesis !== 'undefined';

  protected readonly levelId = signal<EnglishLevelId>('facil');
  protected readonly challengeIndex = signal(0);
  protected readonly isLevelFinished = signal(false);

  protected readonly status = signal<ChallengeStatus>('aguardando');
  protected readonly typedAnswer = signal('');
  protected readonly wrongOptionIndexes = signal<readonly number[]>([]);
  protected readonly isHintVisible = signal(false);
  protected readonly missCount = signal(0);
  protected readonly lastEarnedXp = signal(0);
  protected readonly streak = signal(0);

  private readonly levelIndex = computed(() =>
    ENGLISH_LEVELS.findIndex((level) => level.id === this.levelId()),
  );

  protected readonly level = computed(() => ENGLISH_LEVELS[this.levelIndex()]);
  protected readonly challenges = computed(() => challengesOfLevel(this.levelId()));
  protected readonly challenge = computed(() => this.challenges()[this.challengeIndex()]);
  protected readonly totalChallenges = computed(() => this.challenges().length);
  protected readonly correctAnswer = computed(() => correctAnswerOf(this.challenge()));

  protected readonly choiceChallenge = computed<EnglishChoiceChallenge | null>(() => {
    const challenge = this.challenge();
    return challenge.kind === 'escolha' ? challenge : null;
  });

  protected readonly writingChallenge = computed<EnglishWritingChallenge | null>(() => {
    const challenge = this.challenge();
    return challenge.kind === 'escrita' ? challenge : null;
  });

  protected readonly isSettled = computed(
    () => this.status() === 'acertou' || this.status() === 'revelou',
  );
  protected readonly isLastChallenge = computed(
    () => this.challengeIndex() === this.totalChallenges() - 1,
  );
  protected readonly canSubmitWriting = computed(
    () => this.typedAnswer().trim().length > 0 && !this.isSettled(),
  );
  protected readonly canRevealAnswer = computed(
    () =>
      this.writingChallenge() !== null &&
      this.missCount() >= MISSES_BEFORE_REVEAL &&
      !this.isSettled(),
  );

  protected readonly easierLevel = computed<EnglishLevel | null>(() => {
    const index = this.levelIndex();
    return index > 0 ? ENGLISH_LEVELS[index - 1] : null;
  });

  protected readonly harderLevel = computed<EnglishLevel | null>(() => {
    const index = this.levelIndex();
    return index < ENGLISH_LEVELS.length - 1 ? ENGLISH_LEVELS[index + 1] : null;
  });

  /** Fases deste nível que a criança já concluiu acertando, em qualquer rodada. */
  protected readonly masteredInLevel = computed(() => {
    const mastered = this.progress.masteredIds();
    return this.challenges().filter((challenge) => mastered.has(challenge.id)).length;
  });

  protected readonly levelCompletionPercentage = computed(() =>
    Math.round((this.masteredInLevel() / this.totalChallenges()) * 100),
  );

  protected readonly feedbackTitle = computed(() => {
    switch (this.status()) {
      case 'acertou':
        return '🎉 Boa! Você acertou!';
      case 'revelou':
        return '👀 A resposta certa é esta:';
      case 'quase':
        return '🤏 Quase! Faltou pouquinho.';
      case 'errou':
        return '🙃 Ainda não. Tente outra vez!';
      default:
        return '';
    }
  });

  protected readonly finalMessage = computed(() => {
    const mastered = this.masteredInLevel();

    if (mastered === this.totalChallenges()) {
      return `Você dominou todas as fases do nível ${this.level().label}!`;
    }
    if (mastered >= this.totalChallenges() / 2) {
      return 'Muito bem! Volte para as fases que ficaram faltando.';
    }

    return 'Bom começo! Cada rodada fica mais fácil.';
  });

  constructor() {
    // Quando a fase termina, as alternativas ficam desabilitadas e o foco se
    // perderia. Levá-lo ao botão de avançar mantém o jogo utilizável só com o
    // teclado, sem precisar navegar de volta desde o topo da página.
    effect(() => {
      if (this.isSettled()) {
        this.nextButton()?.nativeElement.focus();
      }
    });
  }

  /** Aparência de cada alternativa: certa em verde, erradas riscadas em vermelho. */
  protected optionState(optionIndex: number): 'certa' | 'errada' | 'idle' {
    const challenge = this.choiceChallenge();

    if (challenge && this.isSettled() && optionIndex === challenge.correctIndex) {
      return 'certa';
    }

    return this.wrongOptionIndexes().includes(optionIndex) ? 'errada' : 'idle';
  }

  protected selectLevel(levelId: EnglishLevelId): void {
    if (levelId === this.levelId()) {
      return;
    }

    this.levelId.set(levelId);
    this.challengeIndex.set(0);
    this.isLevelFinished.set(false);
    this.resetChallengeState();
  }

  protected goToEasierLevel(): void {
    const easier = this.easierLevel();
    if (easier) {
      this.selectLevel(easier.id);
    }
  }

  protected goToHarderLevel(): void {
    const harder = this.harderLevel();
    if (harder) {
      this.selectLevel(harder.id);
    }
  }

  protected goToChallenge(index: number): void {
    this.challengeIndex.set(index);
    this.isLevelFinished.set(false);
    this.resetChallengeState();
  }

  protected chooseOption(optionIndex: number): void {
    const challenge = this.choiceChallenge();
    if (!challenge || this.isSettled() || this.wrongOptionIndexes().includes(optionIndex)) {
      return;
    }

    if (optionIndex === challenge.correctIndex) {
      this.registerVictory();
      return;
    }

    this.wrongOptionIndexes.update((indexes) => [...indexes, optionIndex]);
    this.missCount.update((count) => count + 1);
    this.status.set('errou');
  }

  protected submitWriting(): void {
    const challenge = this.writingChallenge();
    if (!challenge || !this.canSubmitWriting()) {
      return;
    }

    const verdict = checkWritingAnswer(this.typedAnswer(), challenge.acceptedAnswers);
    if (verdict === 'certa') {
      this.registerVictory();
      return;
    }

    this.missCount.update((count) => count + 1);
    this.status.set(verdict === 'quase' ? 'quase' : 'errou');
  }

  protected showHint(): void {
    this.isHintVisible.set(true);
  }

  /** Entrega a resposta depois de várias tentativas: aprender vale mais que o XP. */
  protected revealAnswer(): void {
    if (this.isSettled()) {
      return;
    }

    this.streak.set(0);
    this.lastEarnedXp.set(0);
    this.status.set('revelou');
  }

  protected skipChallenge(): void {
    this.streak.set(0);
    this.advance();
  }

  protected nextChallenge(): void {
    this.advance();
  }

  protected restartLevel(): void {
    this.challengeIndex.set(0);
    this.isLevelFinished.set(false);
    this.resetChallengeState();
  }

  /** Lê a resposta em inglês em voz alta, para a criança ouvir a pronúncia. */
  protected speakAnswer(): void {
    if (!this.isAudioSupported) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(speakableTextOf(this.challenge()));
    utterance.lang = 'en-US';
    utterance.rate = SPEECH_RATE;

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  private registerVictory(): void {
    const streak = this.streak() + 1;
    const earnedXp = calculateEarnedXp({
      baseXp: this.level().xpPerChallenge,
      usedHint: this.isHintVisible(),
      missCount: this.missCount(),
      streak,
    });

    this.streak.set(streak);
    this.lastEarnedXp.set(earnedXp);
    this.status.set('acertou');
    this.progress.registerVictory(this.challenge().id, earnedXp, streak);
  }

  private advance(): void {
    if (this.isLastChallenge()) {
      this.isLevelFinished.set(true);
      return;
    }

    this.challengeIndex.update((index) => index + 1);
    this.resetChallengeState();
  }

  private resetChallengeState(): void {
    this.status.set('aguardando');
    this.typedAnswer.set('');
    this.wrongOptionIndexes.set([]);
    this.isHintVisible.set(false);
    this.missCount.set(0);
    this.lastEarnedXp.set(0);
  }
}
