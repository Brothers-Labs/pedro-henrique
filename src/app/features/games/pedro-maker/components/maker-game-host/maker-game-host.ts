import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { PROFILE } from '../../../../../core/data/profile.data';
import { MotionPreferenceService } from '../../../../../core/services/motion-preference.service';
import { PetService } from '../../../../../core/services/pet.service';
import { LOADING_TIPS } from '../../config/rules.config';
import type { LevelBlueprint } from '../../models/level.model';
import type { LevelRunResult } from '../../models/progress.model';
import type {
  BossHudState,
  GameSessionEvent,
  HudState,
  MakerGameSession,
  VirtualInputState,
} from '../../models/session.model';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';
import { MakerSettingsService } from '../../services/maker-settings.service';
import { type ActivePowerUp, MakerHud } from '../maker-hud/maker-hud';
import { MakerPauseMenu, type PauseChoice } from '../maker-pause-menu/maker-pause-menu';
import { TouchControls } from '../touch-controls/touch-controls';

type HostPhase = 'loading' | 'playing' | 'paused' | 'defeated' | 'finished' | 'error';

/** Tempo que uma fala do mascote fica na tela. */
const MASCOT_VISIBLE_MS = 3600;

/**
 * Silêncio mínimo entre falas do mascote.
 *
 * Ele comenta pouco de propósito: um companheiro que fala a cada moeda vira
 * ruído e atrapalha quem está pulando.
 */
const MASCOT_QUIET_MS = 7000;

const TOAST_VISIBLE_MS = 1600;
const TIP_INTERVAL_MS = 2600;
const DAMAGE_VIBRATION_MS = 80;

/**
 * A partida em tela cheia.
 *
 * Carrega o motor só quando a fase abre, cria o jogo fora da zona do Angular
 * (60 quadros por segundo não podem disparar detecção de mudanças) e traduz os
 * eventos do motor em signals: HUD, falas do mascote, pausa, o "quase!" e o
 * fim da fase. Ao sair da tela, o jogo é destruído junto com o canvas.
 */
@Component({
  selector: 'app-maker-game-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MakerHud, TouchControls, MakerPauseMenu],
  templateUrl: './maker-game-host.html',
  styleUrl: './maker-game-host.scss',
  host: {
    '(document:visibilitychange)': 'pauseWhenHidden()',
    '(document:fullscreenchange)': 'syncFullscreen()',
    '(document:keydown.escape)': 'resumeWithKeyboard()',
  },
})
export class MakerGameHost {
  readonly blueprint = input.required<LevelBlueprint>();
  readonly label = input.required<string>();
  readonly exitLabel = input('Voltar ao mapa');

  readonly completed = output<LevelRunResult>();
  readonly exited = output<void>();
  readonly secretFound = output<void>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly settingsService = inject(MakerSettingsService);
  private readonly progress = inject(MakerProgressService);
  private readonly pets = inject(PetService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly root = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private session: MakerGameSession | null = null;
  private lastMascotAt = Number.NEGATIVE_INFINITY;
  private powerUpKey = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** Estado dos botões de toque, lido pelo motor a cada quadro. */
  protected readonly virtualInput: VirtualInputState = { left: false, right: false, jump: false, action: false };

  protected readonly phase = signal<HostPhase>('loading');
  protected readonly loadingProgress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly hud = signal<HudState>({ hearts: 3, maxHearts: 3, coins: 0, crystalsFound: 0, crystalsTotal: 0, hasShield: false });
  protected readonly boss = signal<BossHudState | null>(null);
  protected readonly powerUps = signal<readonly ActivePowerUp[]>([]);
  protected readonly mascotMessage = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  protected readonly tip = signal(LOADING_TIPS[0]);
  protected readonly isFullscreen = signal(false);
  protected readonly isPortraitDismissed = signal(false);
  protected readonly isSaved = this.progress.isSavedNoticeVisible;

  protected readonly showsTouchControls = computed(() => {
    const mode = this.settingsService.settings().touchControls;

    return mode === 'sempre' || (mode === 'automatico' && isTouchDevice());
  });

  protected readonly mascot = computed(() => {
    const pet = this.pets.pet();
    const type = this.pets.type();

    return pet && type ? { emoji: type.emoji, name: pet.name } : { emoji: PROFILE.avatarEmoji, name: 'Dino' };
  });

  constructor() {
    afterNextRender(() => void this.start());

    // Música ligada ou desligada na pausa vale na hora, sem esperar a próxima fase.
    effect(() => {
      const isMusicOn = this.settingsService.settings().music;

      untracked(() => {
        if (this.phase() === 'loading') {
          return;
        }

        if (isMusicOn) {
          this.audio.startMusic(this.blueprint().theme);
        } else {
          this.audio.stopMusic();
        }
      });
    });

    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /* Comandos da tela ------------------------------------------------------------ */

  protected pause(): void {
    if (this.phase() !== 'playing') {
      return;
    }

    this.session?.pause();
    this.phase.set('paused');
    this.audio.play('button');
  }

  protected choosePause(choice: PauseChoice): void {
    this.audio.play('button');

    switch (choice) {
      case 'continuar':
        this.session?.resume();
        this.phase.set('playing');
        return;
      case 'recomecar':
        this.clearRunState();
        this.session?.restart();
        this.phase.set('playing');
        return;
      case 'sair':
        this.exited.emit();
        return;
    }
  }

  protected retry(): void {
    this.audio.play('button');
    this.powerUps.set([]);
    this.session?.retryFromCheckpoint();
    this.phase.set('playing');
  }

  protected exit(): void {
    this.audio.play('button');
    this.exited.emit();
  }

  protected dismissPortraitHint(): void {
    this.isPortraitDismissed.set(true);
  }

  protected async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await this.root.nativeElement.requestFullscreen();
      }
    } catch (error) {
      // Alguns navegadores (iPhone) não deixam: o jogo segue do mesmo tamanho.
      console.warn('Pedro Maker: tela cheia indisponível neste navegador.', error);
    }
  }

  protected pauseWhenHidden(): void {
    if (document.hidden) {
      this.pause();
    }
  }

  protected syncFullscreen(): void {
    this.isFullscreen.set(document.fullscreenElement !== null);
  }

  protected resumeWithKeyboard(): void {
    if (this.phase() === 'paused') {
      this.choosePause('continuar');
    }
  }

  /* Motor ---------------------------------------------------------------------------- */

  private async start(): Promise<void> {
    this.rotateTips();

    try {
      const { launchMakerGame } = await import('../../engine/launch-game');
      const settings = this.settingsService.settings();
      const pet = this.mascot();

      this.session = this.zone.runOutsideAngular(() =>
        launchMakerGame({
          parent: this.stage().nativeElement,
          blueprint: this.blueprint(),
          rules: this.settingsService.difficultyRules(),
          look: this.progress.look(),
          // Modo calmo e movimento reduzido do sistema também apagam partículas e tremores.
          effectsEnabled: settings.effects && this.motion.isAllowed(),
          isTouch: this.showsTouchControls(),
          petEmoji: this.pets.hasPet() ? pet.emoji : null,
          input: this.virtualInput,
          listener: (event) => this.receive(event),
        }),
      );
    } catch (error) {
      console.error('Pedro Maker: o motor do jogo não pôde ser carregado.', error);
      this.errorMessage.set('Não foi possível carregar o jogo. Verifique a internet e tente de novo.');
      this.phase.set('error');
    }
  }

  /**
   * Evento do motor.
   *
   * O som toca direto, fora da zona: é o evento mais frequente e não muda
   * nada na tela. O resto entra na zona para a tela reagir.
   */
  private receive(event: GameSessionEvent): void {
    if (event.type === 'sound') {
      this.audio.play(event.cue);
      return;
    }

    this.zone.run(() => this.handle(event));
  }

  private handle(event: GameSessionEvent): void {
    switch (event.type) {
      case 'loading':
        this.loadingProgress.set(Math.round(event.progress * 100));
        return;
      case 'ready':
        this.phase.set('playing');
        this.audio.startMusic(this.blueprint().theme);
        return;
      case 'hud':
        this.hud.set(event.hud);
        return;
      case 'damage':
        this.vibrate();
        return;
      case 'checkpoint':
        this.showToast('✨ CHECKPOINT!');
        this.speak('Boa! A bandeira guardou o seu lugar.');
        return;
      case 'power-up':
        this.powerUpKey += 1;
        this.powerUps.update((list) => [
          ...list.filter((power) => power.kind !== event.kind),
          { kind: event.kind, durationMs: event.durationMs, key: this.powerUpKey },
        ]);
        return;
      case 'power-up-ended':
        this.powerUps.update((list) => list.filter((power) => power.kind !== event.kind));
        return;
      case 'mascot':
        this.speak(event.text);
        return;
      case 'boss':
        this.boss.set(event.boss);
        return;
      case 'secret-found':
        this.showToast('🌟 FASE SECRETA LIBERADA!');
        this.secretFound.emit();
        return;
      case 'pause-requested':
        this.pause();
        return;
      case 'defeated':
        this.session?.pause();
        this.phase.set('defeated');
        return;
      case 'completed':
        this.phase.set('finished');
        this.audio.stopMusic();
        this.completed.emit(event.result);
        return;
      case 'error':
        this.errorMessage.set(event.message);
        this.phase.set('error');
        return;
      case 'sound':
        return;
    }
  }

  private speak(text: string): void {
    const now = performance.now();

    if (now - this.lastMascotAt < MASCOT_QUIET_MS) {
      return;
    }

    this.lastMascotAt = now;
    this.mascotMessage.set(text);
    this.later(MASCOT_VISIBLE_MS, () => this.mascotMessage.set(null));
  }

  private showToast(text: string): void {
    this.toast.set(text);
    this.later(TOAST_VISIBLE_MS, () => this.toast.set(null));
  }

  private rotateTips(): void {
    let index = 0;

    const next = (): void => {
      if (this.phase() !== 'loading') {
        return;
      }

      index = (index + 1) % LOADING_TIPS.length;
      this.tip.set(LOADING_TIPS[index]);
      this.later(TIP_INTERVAL_MS, next);
    };

    this.later(TIP_INTERVAL_MS, next);
  }

  private vibrate(): void {
    if (this.settingsService.settings().vibration && typeof navigator.vibrate === 'function') {
      navigator.vibrate(DAMAGE_VIBRATION_MS);
    }
  }

  private clearRunState(): void {
    this.powerUps.set([]);
    this.boss.set(null);
    this.mascotMessage.set(null);
  }

  private later(delayMs: number, action: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      action();
    }, delayMs);

    this.timers.add(timer);
  }

  private teardown(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.audio.stopMusic();
    this.session?.destroy();
    this.session = null;

    if (document.fullscreenElement === this.root.nativeElement) {
      void document.exitFullscreen().catch((error: unknown) =>
        console.warn('Pedro Maker: não foi possível sair da tela cheia.', error),
      );
    }
  }
}

function isTouchDevice(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}
