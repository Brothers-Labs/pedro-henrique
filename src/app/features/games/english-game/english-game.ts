import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ENGLISH_CHALLENGES } from '../../../core/data/english-quiz.data';
import {
  CORRECT_MESSAGES,
  ENCOURAGEMENT_MESSAGES,
  gameDefinition,
} from '../../../core/data/game-progress.data';
import { englishPlanFor } from '../../../core/games/difficulty';
import type {
  EnglishChallenge,
  EnglishChoiceChallenge,
  EnglishWritingChallenge,
} from '../../../core/models/english-quiz.model';
import type { GameId } from '../../../core/models/game-progress.model';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { pickRandom } from '../../../core/utils/shuffle';
import { GameHud } from '../shared/game-hud/game-hud';
import { celebrationFrom } from '../shared/level-up-celebration/celebration';
import type { CelebrationData } from '../shared/level-up-celebration/level-up-celebration';
import { LevelUpCelebration } from '../shared/level-up-celebration/level-up-celebration';
import { checkWritingAnswer, correctAnswerOf, speakableTextOf } from './english-game.logic';

const GAME_ID: GameId = 'ingles';

/** Velocidade da leitura em inglês: devagar o bastante para repetir junto. */
const SPEECH_RATE = 0.8;

type AnswerStatus = 'aguardando' | 'certo' | 'errado';

/**
 * Jogo de inglês por níveis.
 *
 * O nível define de quais bancos as fases são sorteadas e se a resposta é
 * escolhida ou escrita — é assim que o jogo endurece sem trocar a mecânica.
 *
 * A conferência da escrita continua generosa: uma criança aprendendo a
 * escrever erra acento e maiúscula sem que isso signifique não saber a palavra.
 */
@Component({
  selector: 'app-english-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameHud, LevelUpCelebration],
  templateUrl: './english-game.html',
  styleUrl: './english-game.scss',
})
export class EnglishGame {
  private readonly progressService = inject(GameProgressService);
  private askedIds = new Set<string>();

  protected readonly gameId = GAME_ID;
  protected readonly definition = gameDefinition(GAME_ID);
  protected readonly isAudioSupported = typeof speechSynthesis !== 'undefined';

  protected readonly challenge = signal<EnglishChallenge>(this.draw());
  protected readonly status = signal<AnswerStatus>('aguardando');
  protected readonly chosenIndex = signal<number | null>(null);
  protected readonly typedAnswer = signal('');
  protected readonly feedbackMessage = signal('');
  protected readonly earnedPoints = signal(0);
  protected readonly isHintVisible = signal(false);
  protected readonly celebration = signal<CelebrationData | null>(null);

  protected readonly hasAnswered = computed(() => this.status() !== 'aguardando');
  protected readonly canSubmitTyped = computed(
    () => !this.hasAnswered() && this.typedAnswer().trim().length > 0,
  );

  protected readonly choiceChallenge = computed<EnglishChoiceChallenge | null>(() => {
    const current = this.challenge();
    return current.kind === 'escolha' ? current : null;
  });

  protected readonly writingChallenge = computed<EnglishWritingChallenge | null>(() => {
    const current = this.challenge();
    return current.kind === 'escrita' ? current : null;
  });

  protected readonly correctAnswer = computed(() => correctAnswerOf(this.challenge()));

  /** Resumo do que o nível treina, para a criança saber onde está. */
  protected readonly levelTopic = computed(() => {
    const plan = englishPlanFor(this.progressService.progressOf(GAME_ID).level);
    const tiers: Record<string, string> = {
      facil: 'primeiras palavras',
      medio: 'frases do dia a dia',
      dificil: 'frases completas',
    };

    return plan.tiers.map((tier) => tiers[tier]).join(' e ');
  });

  protected answerWithOption(optionIndex: number): void {
    const current = this.choiceChallenge();

    if (this.hasAnswered() || !current) {
      return;
    }

    this.chosenIndex.set(optionIndex);
    this.settle(optionIndex === current.correctIndex);
  }

  protected submitTypedAnswer(): void {
    const current = this.writingChallenge();

    if (this.hasAnswered() || !current || !this.canSubmitTyped()) {
      return;
    }

    // "Quase" conta como acerto: o objetivo é a palavra, não a ortografia.
    const verdict = checkWritingAnswer(this.typedAnswer(), current.acceptedAnswers);

    this.settle(verdict !== 'errada');
  }

  protected showHint(): void {
    this.isHintVisible.set(true);
  }

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

  protected next(): void {
    this.startNextChallenge();
  }

  protected continueAfterCelebration(): void {
    this.celebration.set(null);
    this.startNextChallenge();
  }

  protected optionState(optionIndex: number): 'certa' | 'errada' | 'neutra' {
    const current = this.choiceChallenge();

    if (!this.hasAnswered() || !current) {
      return 'neutra';
    }

    if (optionIndex === current.correctIndex) {
      return 'certa';
    }

    return optionIndex === this.chosenIndex() ? 'errada' : 'neutra';
  }

  private settle(wasCorrect: boolean): void {
    this.status.set(wasCorrect ? 'certo' : 'errado');

    const outcome = this.progressService.registerChallenge(GAME_ID, wasCorrect);

    this.earnedPoints.set(outcome.earnedPoints);
    this.feedbackMessage.set(
      pickRandom(wasCorrect ? CORRECT_MESSAGES : ENCOURAGEMENT_MESSAGES) ?? '',
    );

    if (outcome.didLevelUp) {
      this.askedIds = new Set();
      this.celebration.set(celebrationFrom(outcome, this.definition.label));
    }
  }

  private startNextChallenge(): void {
    this.challenge.set(this.draw());
    this.status.set('aguardando');
    this.chosenIndex.set(null);
    this.typedAnswer.set('');
    this.feedbackMessage.set('');
    this.earnedPoints.set(0);
    this.isHintVisible.set(false);
  }

  /**
   * Sorteia a próxima fase dentro do que o nível permite.
   *
   * Quando o banco do nível se esgota antes do fim, o filtro de repetição é
   * liberado: repetir uma fase é melhor do que ficar sem fase nenhuma.
   */
  private draw(): EnglishChallenge {
    const plan = englishPlanFor(this.progressService.progressOf(GAME_ID).level);
    const pool = ENGLISH_CHALLENGES.filter(
      (candidate) =>
        plan.tiers.includes(candidate.level) && plan.kinds.includes(candidate.kind),
    );
    const available = pool.length > 0 ? pool : ENGLISH_CHALLENGES;
    const fresh = available.filter((candidate) => !this.askedIds.has(candidate.id));
    const chosen = pickRandom(fresh.length > 0 ? fresh : available) ?? ENGLISH_CHALLENGES[0];

    this.askedIds.add(chosen.id);

    return chosen;
  }
}
