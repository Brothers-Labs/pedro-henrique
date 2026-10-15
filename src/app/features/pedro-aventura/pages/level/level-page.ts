import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  NgZone,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';
import { formatNumber, formatStopwatch } from '../../components/format';
import { type Difficulty, difficultyById } from '../../config/difficulty.config';
import { findLevel, regionById } from '../../config/regions.config';
import type { LevelDefinition } from '../../models/campaign.model';
import type { RunLaunchOptions, RunSession, RunSessionEvent } from '../../engine/launch';
import type { RunCommand } from '../../engine/run-input';
import type { RunSummary } from '../../rules/aventura-game';
import { nextLevelOf, objectivesFor, scoreFor } from '../../rules/campaign';
import type { RunEvent, RunHud } from '../../simulation/run-simulation';
import { AventuraAudio, type AventuraSound } from '../../services/aventura-audio.service';
import { AventuraStore } from '../../services/aventura-store.service';
import { type RunDialogMode, RunResultDialog } from './run-result-dialog';
import { TouchControls } from './touch-controls';

/** Estados formais da fase, do ponto de vista da tela. */
export type LevelPhase = 'loading' | 'ready' | 'playing' | 'paused' | 'victory' | 'defeat' | 'error';

const COUNTDOWN_SECONDS = 3;
/** A comemoração dura um instante antes de a cena parar atrás do diálogo. */
const SETTLE_DELAY_MS = 1500;

const EVENT_SOUNDS: Partial<Record<RunEvent['type'], AventuraSound>> = {
  coin: 'coin',
  'gold-bar': 'gold-bar',
  diamond: 'diamond',
  turbo: 'turbo',
  slip: 'slip',
  heart: 'heart',
  crown: 'crown',
  jump: 'jump',
  ramp: 'ramp',
  hit: 'hit',
  break: 'break',
  checkpoint: 'checkpoint',
};

const ANNOUNCEMENTS: Partial<Record<RunEvent['type'], string>> = {
  hit: 'Ai! Perdeu um coração.',
  heart: 'Ganhou um coração!',
  crown: 'Pegou uma coroa!',
  'gold-bar': 'Barra de ouro: mais 10 moedas!',
  diamond: 'Pegou um diamante!',
  turbo: 'Turbo!',
  slip: 'Escorregou na banana!',
  checkpoint: 'Checkpoint!',
};

const EMPTY_HUD: RunHud = {
  phase: 'ready',
  lives: 3,
  maxLives: 3,
  progress: 0,
  timeMs: 0,
  coins: 0,
  goldBars: 0,
  diamonds: 0,
  hearts: 0,
  crowns: 0,
  ramps: 0,
  damageTaken: 0,
};

function newAttemptId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * A fase em si: a corrida 3D com painel, objetivos, controles e resultado.
 *
 * O resultado só vira moeda e XP pelo `AventuraStore`, com o id da
 * tentativa: um resultado nunca é pago duas vezes. Sair no meio da fase pela
 * pausa não guarda nada; terminar (vencendo ou perdendo) guarda o que foi pego.
 */
@Component({
  selector: 'app-level-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TouchControls, RunResultDialog],
  templateUrl: './level-page.html',
  styleUrl: './level-page.scss',
  host: { '(document:visibilitychange)': 'onVisibilityChange()' },
})
export class LevelPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);
  private readonly motion = inject(MotionPreferenceService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  private session: RunSession | null = null;
  private attemptId = newAttemptId();
  private isResultSubmitted = false;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;
  /** Fase que a sessão atual está correndo: o resultado é sempre dela, mesmo que a rota já tenha mudado. */
  private runningLevel: LevelDefinition | null = null;
  /** Dificuldade da partida em curso: mudar a configuração no meio não muda a corrida. */
  private runningDifficulty: Difficulty = 'facil';
  /** Último `levelId` visto: ir para a próxima fase reaproveita esta tela. */
  private observedLevelId: string | null = null;
  /** Cada abertura ganha um número; uma abertura atrasada (rede lenta) que perdeu a vez é descartada. */
  private startGeneration = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly phase = signal<LevelPhase>('loading');
  protected readonly hud = signal<RunHud>(EMPTY_HUD);
  protected readonly countdown = signal(0);
  protected readonly announcement = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isContextLost = signal(false);
  protected readonly summary = signal<RunSummary | null>(null);
  /** No celular a lista começa recolhida: a pista precisa da tela. */
  protected readonly isObjectivesOpen = signal(typeof matchMedia !== 'function' || !matchMedia('(max-width: 48rem)').matches);

  /** Vem da rota `fase/:levelId`; muda sem recriar a tela ao ir para a próxima fase. */
  protected readonly levelId = toSignal(this.route.paramMap.pipe(map((params) => params.get('levelId') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('levelId') ?? '',
  });

  protected readonly level = computed(() => findLevel(this.levelId()));
  protected readonly region = computed(() => {
    const level = this.level();

    return level ? regionById(level.regionId) : null;
  });

  /**
   * Confere o desbloqueio só quando a fase muda: um evento que acaba no meio da
   * corrida não pode trancar a fase debaixo do Pedro.
   */
  protected readonly isLocked = computed(() => {
    const level = this.level();

    return level !== null && untracked(() => !this.store.isLevelUnlocked(level));
  });

  protected readonly objectives = computed(() => {
    const level = this.level();
    const hud = this.hud();

    return level ? objectivesFor(level, { isVictory: this.phase() === 'victory', coins: hud.coins, ramps: hud.ramps, timeMs: hud.timeMs }) : [];
  });

  protected readonly dialogMode = computed<RunDialogMode | null>(() => {
    const phase = this.phase();

    return phase === 'paused' || phase === 'victory' || phase === 'defeat' ? phase : null;
  });

  protected readonly hearts = computed(() => {
    const { lives, maxLives } = this.hud();

    return Array.from({ length: maxLives }, (_, index) => index < lives);
  });

  protected readonly nextLevel = computed(() => {
    const level = this.level();
    const next = level ? nextLevelOf(level) : null;

    return next && this.store.isLevelUnlocked(next) ? next : null;
  });

  protected readonly showTouchControls = computed(() => {
    const preference = this.store.settings().touchControls;

    if (preference !== 'auto') {
      return preference === 'sempre';
    }

    return typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches;
  });

  protected readonly formatStopwatch = formatStopwatch;
  protected readonly formatNumber = formatNumber;
  protected readonly difficulty = computed(() => difficultyById(this.store.settings().difficulty));

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const levelId = this.levelId();

      untracked(() => {
        if (this.observedLevelId !== null && this.observedLevelId !== levelId) {
          this.restart();
        }

        this.observedLevelId = levelId;
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.isDestroyed = true;
      this.stopCountdown();
      this.clearSettleTimer();

      // Sair pela seta do navegador depois da derrota também guarda o que foi pego.
      if (this.phase() === 'defeat') {
        this.submitResult(false);
      }

      this.session?.destroy();
      this.session = null;
      this.audio.playMusic('lobby');
    });
  }

  protected press(command: RunCommand): void {
    this.session?.press(command);
  }

  protected pause(): void {
    if (this.phase() !== 'playing') {
      return;
    }

    this.session?.pause();
    this.audio.suspendMusic();
    this.phase.set('paused');
  }

  protected resume(): void {
    if (this.phase() !== 'paused') {
      return;
    }

    this.audio.resumeMusic();
    this.phase.set('playing');
    this.zone.runOutsideAngular(() => this.session?.resume());
  }

  protected continueFromCheckpoint(): void {
    if (this.phase() !== 'defeat') {
      return;
    }

    this.phase.set('playing');
    this.audio.resumeMusic();
    this.zone.runOutsideAngular(() => this.session?.continueFromCheckpoint());
  }

  /** Recomeça a fase do zero, com uma tentativa nova. A derrota é guardada antes. */
  protected restart(): void {
    if (this.phase() === 'defeat') {
      this.submitResult(false);
    }

    this.stopCountdown();
    this.clearSettleTimer();
    this.session?.destroy();
    this.session = null;
    this.runningLevel = null;
    this.attemptId = newAttemptId();
    this.isResultSubmitted = false;
    this.summary.set(null);
    this.hud.set(EMPTY_HUD);
    this.phase.set('loading');
    void this.start();
  }

  protected exitToMap(): void {
    if (this.phase() === 'defeat') {
      this.submitResult(false);
    }

    void this.router.navigate(['/pedro-aventura/mapa'], { queryParams: { regiao: this.level()?.regionId } });
  }

  protected goToNext(): void {
    const next = this.nextLevel();

    if (next) {
      void this.router.navigate(['/pedro-aventura/fase', next.id]);
    }
  }

  protected toggleObjectives(): void {
    this.isObjectivesOpen.update((isOpen) => !isOpen);
  }

  protected onVisibilityChange(): void {
    // Na contagem, a largada espera a criança voltar para a aba.
    if (this.phase() === 'ready') {
      if (document.hidden) {
        this.stopCountdown();
      } else if (this.countdownTimer === null) {
        this.startCountdown();
      }

      return;
    }

    if (document.hidden) {
      this.pause();
    }
  }

  private async start(): Promise<void> {
    const level = this.level();
    const region = this.region();
    const host = this.stage()?.nativeElement;

    if (!level || !region || !host || this.isLocked()) {
      return;
    }

    const generation = ++this.startGeneration;

    try {
      const { launchRun } = await import('../../engine/launch');

      if (this.isDestroyed || generation !== this.startGeneration) {
        return;
      }

      this.runningLevel = level;
      this.runningDifficulty = this.store.settings().difficulty;

      const equipped = this.store.equipped();
      const options: RunLaunchOptions = {
        parent: host,
        level,
        difficulty: this.runningDifficulty,
        theme: region.theme,
        look: { outfit: equipped.outfit, dog: equipped.dog },
        quality: this.store.settings().quality,
        isMotionAllowed: this.motion.isAllowed(),
        listener: (event) => this.zone.run(() => this.onSessionEvent(event)),
      };

      this.session = this.zone.runOutsideAngular(() => launchRun(options));
    } catch (error) {
      console.error('Pedro Aventura: a fase não abriu.', error);
      this.fail('Não foi possível abrir a fase. Verifique a internet e tente de novo.');
    }
  }

  private onSessionEvent(event: RunSessionEvent): void {
    switch (event.type) {
      case 'ready':
        this.phase.set('ready');
        this.startCountdown();
        return;
      case 'hud':
        this.hud.set(event.hud);
        return;
      case 'events':
        this.react(event.events);
        return;
      case 'finished':
        this.finish(event.phase);
        return;
      case 'pause-requested':
        this.pause();
        return;
      case 'context':
        this.isContextLost.set(event.isLost);

        if (event.isLost) {
          this.pause();
        }

        return;
      case 'error':
        this.fail(event.message);
        return;
    }
  }

  private startCountdown(): void {
    this.countdown.set(COUNTDOWN_SECONDS);
    this.countdownTimer = setInterval(() => {
      const next = this.countdown() - 1;

      this.countdown.set(next);

      if (next > 0) {
        this.audio.play('button');
        return;
      }

      this.stopCountdown();
      this.phase.set('playing');
      this.audio.play('checkpoint');
      this.audio.playMusic('run');
      this.zone.runOutsideAngular(() => this.session?.start());
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private react(events: readonly RunEvent[]): void {
    for (const event of events) {
      const sound = EVENT_SOUNDS[event.type];
      const text = ANNOUNCEMENTS[event.type];

      if (sound) {
        this.audio.play(sound);
      }

      if (text) {
        this.announcement.set(text);
      }
    }
  }

  private finish(phase: 'victory' | 'defeat'): void {
    this.audio.suspendMusic();
    this.phase.set(phase);

    // Atrás do diálogo a cena fica parada: desenhar a 60 quadros por segundo só gastaria bateria.
    this.clearSettleTimer();
    this.settleTimer = setTimeout(() => {
      if (this.phase() === 'victory' || this.phase() === 'defeat') {
        this.zone.runOutsideAngular(() => this.session?.pause());
      }
    }, SETTLE_DELAY_MS);

    if (phase === 'victory') {
      this.audio.play('victory');
      this.submitResult(true);
      this.announcement.set('Fase completa!');
    } else {
      this.audio.play('defeat');
      this.announcement.set('Acabaram os corações. Quer continuar do checkpoint?');
    }
  }

  private clearSettleTimer(): void {
    if (this.settleTimer !== null) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  private submitResult(isVictory: boolean): void {
    const level = this.runningLevel;

    if (!level || !this.session || this.isResultSubmitted) {
      return;
    }

    const result = { levelId: level.id, difficulty: this.runningDifficulty, isVictory, ...this.session.stats() };
    const summary = this.store.submitRun({ ...result, attemptId: this.attemptId, score: scoreFor(level, result) });

    this.isResultSubmitted = true;

    if (summary) {
      this.summary.set(summary);

      if (summary.unlockedRegions.length > 0 || summary.seasonLevelAfter > summary.seasonLevelBefore) {
        this.audio.play('unlock');
      }
    }
  }

  private fail(message: string): void {
    this.stopCountdown();
    this.errorMessage.set(message);
    this.phase.set('error');
  }
}

