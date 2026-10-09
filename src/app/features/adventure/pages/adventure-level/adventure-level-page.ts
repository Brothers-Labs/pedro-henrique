import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { PROFILE } from '../../../../core/data/profile.data';
import { GameProgressService } from '../../../../core/services/game-progress.service';
import { PetService } from '../../../../core/services/pet.service';
import { SoundService } from '../../../../core/services/sound.service';
import { AchievementToast } from '../../../games/shared/achievement-toast/achievement-toast';
import { PetCelebrations } from '../../../pet/pet-celebrations/pet-celebrations';
import { LevelIntro } from '../../components/level-intro/level-intro';
import { LevelQuestion } from '../../components/level-question/level-question';
import { LevelResult, type RunGains } from '../../components/level-result/level-result';
import { COMPANION_LINES, fillLine, pickLine } from '../../config/companion-lines.config';
import { nextLevelOf } from '../../engine/adventure-progression';
import { type AdventureQuestion, buildLevelQuestions } from '../../engine/question-factory';
import type { LevelCompletion } from '../../models/adventure.model';
import { AdventureService } from '../../services/adventure.service';
import type { AdventureMapNavigationState } from '../adventure-map/adventure-map-page';

type Phase = 'intro' | 'playing' | 'result';

/** Pontos e XP no começo da partida, para medir o que ela rendeu. */
interface Baseline {
  readonly points: number;
  readonly petXp: number;
}

/**
 * Uma fase da Aventura: abertura, perguntas e conclusão.
 *
 * A mesma instância atende "Próxima fase" e "Jogar novamente" — o Angular
 * reaproveita a página quando só o parâmetro muda —, por isso todo o estado
 * da partida nasce em `reset` e nada sobra da fase anterior.
 */
@Component({
  selector: 'app-adventure-level-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LevelIntro, LevelQuestion, LevelResult, AchievementToast, PetCelebrations],
  templateUrl: './adventure-level-page.html',
  styleUrl: './adventure-level-page.scss',
})
export class AdventureLevelPage {
  private readonly adventure = inject(AdventureService);
  private readonly games = inject(GameProgressService);
  private readonly pets = inject(PetService);
  private readonly sound = inject(SoundService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly worldId = signal('');
  private readonly levelId = signal('');
  private baseline: Baseline = { points: 0, petXp: 0 };

  protected readonly childName = PROFILE.firstName;
  protected readonly phase = signal<Phase>('intro');
  protected readonly questions = signal<readonly AdventureQuestion[]>([]);
  protected readonly index = signal(0);
  protected readonly selected = signal<string | null>(null);
  protected readonly correctCount = signal(0);
  protected readonly answerLine = signal<string | null>(null);
  protected readonly completion = signal<LevelCompletion | null>(null);
  protected readonly gains = signal<RunGains>({ points: 0, petXp: 0 });

  protected readonly world = computed(() => this.adventure.world(this.worldId()));
  protected readonly view = computed(() => this.adventure.levelView(this.worldId(), this.levelId()));
  protected readonly question = computed(() => this.questions()[this.index()] ?? null);
  protected readonly petName = computed(() => this.pets.pet()?.name ?? 'Seu mascote');

  protected readonly nextLevel = computed(() => {
    const world = this.world();

    return world ? nextLevelOf(world, this.levelId()) : null;
  });

  /** Textos da fase com os nomes de verdade no lugar dos marcadores. */
  protected readonly texts = computed(() => {
    const level = this.view()?.level;
    const values = { nome: this.pets.pet()?.name ?? 'seu mascote', crianca: this.childName };

    return {
      title: fillLine(level?.title ?? '', values),
      story: fillLine(level?.story ?? '', values),
      objective: fillLine(level?.objective ?? '', values),
    };
  });

  protected readonly introLine = computed(() => {
    const template = this.view()?.level.guardian ? COMPANION_LINES.beforeGuardian : pickLine(COMPANION_LINES.beforeLevel);

    return fillLine(template, { crianca: this.childName });
  });

  protected readonly resultLine = computed(() => {
    const completion = this.completion();

    if (completion?.unlockedWorld) {
      return COMPANION_LINES.worldUnlocked;
    }

    return completion?.stars === 3 ? COMPANION_LINES.perfect : fillLine(COMPANION_LINES.completed, { crianca: this.childName });
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.worldId.set(params.get('worldId') ?? '');
        this.levelId.set(params.get('levelId') ?? '');
        this.reset();
      });
  }

  protected start(): void {
    const view = this.view();

    if (!view) {
      return;
    }

    this.baseline = this.measure();
    this.questions.set(buildLevelQuestions(view.level, Math.random, this.childName));
    this.index.set(0);
    this.selected.set(null);
    this.correctCount.set(0);
    this.answerLine.set(null);
    this.completion.set(null);
    this.enter('playing');
  }

  protected choose(option: string): void {
    const question = this.question();

    // A resposta trava no primeiro toque: um segundo toque não conta de novo.
    if (!question || this.selected() !== null) {
      return;
    }

    const isCorrect = option === question.answer;

    this.selected.set(option);
    this.answerLine.set(pickLine(isCorrect ? COMPANION_LINES.correct : COMPANION_LINES.wrong));

    if (isCorrect) {
      this.correctCount.update((count) => count + 1);
      this.sound.play('xp');
    }

    this.adventure.recordAnswer(this.worldId(), isCorrect);
  }

  protected advance(): void {
    if (this.selected() === null) {
      return;
    }

    if (this.index() + 1 >= this.questions().length) {
      this.finish();
      return;
    }

    this.index.update((index) => index + 1);
    this.selected.set(null);
    this.answerLine.set(null);
    this.focusPhase();
  }

  protected backToMap(): void {
    const state: AdventureMapNavigationState = { arrivedFromLevelId: this.levelId() };

    void this.router.navigate(['/aventura'], { state });
  }

  private finish(): void {
    // Duplo clique em "Ver resultado" não pode fechar a fase duas vezes.
    if (this.completion() !== null) {
      return;
    }

    const completion = this.adventure.completeLevel(this.worldId(), this.levelId(), {
      correct: this.correctCount(),
      total: this.questions().length,
    });
    const now = this.measure();

    this.completion.set(completion);
    this.gains.set({ points: now.points - this.baseline.points, petXp: now.petXp - this.baseline.petXp });
    this.sound.play(completion.completedWorld || completion.stars === 3 ? 'conquista' : 'nivel');
    this.enter('result');
  }

  private reset(): void {
    this.questions.set([]);
    this.index.set(0);
    this.selected.set(null);
    this.correctCount.set(0);
    this.answerLine.set(null);
    this.completion.set(null);
    this.enter('intro');
  }

  private measure(): Baseline {
    return { points: this.games.summary().totalScore, petXp: this.pets.pet()?.totalXp ?? 0 };
  }

  private enter(phase: Phase): void {
    this.phase.set(phase);
    this.focusPhase();
  }

  /** Leva o foco ao título da etapa nova, para o leitor de tela anunciar a mudança. */
  private focusPhase(): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>('[data-autofocus]')?.focus(), {
      injector: this.injector,
    });
  }
}
