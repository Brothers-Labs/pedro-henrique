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
import { CalmModeService } from '../../../../../core/services/calm-mode.service';
import { PetService } from '../../../../../core/services/pet.service';
import { CALM_SPEECH_RATE, DEFAULT_SPEECH_RATE, SpeechService } from '../../../../../core/services/speech.service';
import { LOADING_TIPS } from '../../config/rules.config';
import type { ScreenMode } from '../../config/screen.config';
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
  /** Corações a mais que a dificuldade dá, como no Testar do editor. */
  readonly bonusHearts = input(0);

  readonly completed = output<LevelRunResult>();
  readonly exited = output<void>();
  /** A fase secreta foi achada: a fase do Pedro escolhida na porta dourada, ou `null` na campanha. */
  readonly secretFound = output<string | null>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly settingsService = inject(MakerSettingsService);
  private readonly progress = inject(MakerProgressService);
  private readonly pets = inject(PetService);
  private readonly speech = inject(SpeechService);
  private readonly calmMode = inject(CalmModeService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly root = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private session: MakerGameSession | null = null;
  private lastMascotAt = Number.NEGATIVE_INFINITY;
  private powerUpKey = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** Estado dos botões de toque, lido pelo motor a cada quadro. */
  protected readonly virtualInput: VirtualInputState = { left: false, right: false, run: false, jump: false, action: false };

  protected readonly phase = signal<HostPhase>('loading');
  protected readonly loadingProgress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly hud = signal<HudState>({ hearts: 3, maxHearts: 3, coins: 0, crystalsFound: 0, crystalsTotal: 0, hasShield: false, keys: 0 });
  protected readonly boss = signal<BossHudState | null>(null);
  protected readonly powerUps = signal<readonly ActivePowerUp[]>([]);
  /** Tela da partida: a da aba Telas da fase, ou a dos ajustes; a pausa troca. */
  protected readonly screen = signal<ScreenMode>(this.settingsService.settings().screen);
  protected readonly mascotMessage = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  protected readonly tip = signal(LOADING_TIPS[0]);
  protected readonly isFullscreen = signal(false);
  protected readonly canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
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

    // Mudou a tela dos ajustes (em outra aba, por exemplo): a partida acompanha.
    // A primeira leitura não conta, para não passar por cima da tela da fase.
    let settingsScreen: ScreenMode | null = null;

    effect(() => {
      const screen = this.settingsService.settings().screen;

      untracked(() => {
        if (settingsScreen !== null && settingsScreen !== screen) {
          this.applyScreen(screen);
        }

        settingsScreen = screen;
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

  /** Tela escolhida na pausa: troca na hora, atrás do menu, e vira a dos ajustes. */
  protected chooseScreen(screen: ScreenMode): void {
    this.applyScreen(screen);
    this.settingsService.update({ screen });
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
        return;
      }

      await this.root.nativeElement.requestFullscreen({ navigationUI: 'hide' });
    } catch (error) {
      // Alguns navegadores (iPhone) não deixam: o jogo segue do mesmo tamanho.
      console.warn('Pedro Maker: tela cheia indisponível neste navegador.', error);
      return;
    }

    if (this.showsTouchControls()) {
      await lockLandscape();
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

      // A tela da aba Telas vale a cada começo; sem ela, a dos ajustes.
      this.screen.set(this.blueprint().screen ?? settings.screen);
      const pet = this.mascot();
      const rules = this.settingsService.difficultyRules();

      this.session = this.zone.runOutsideAngular(() =>
        launchMakerGame({
          parent: this.stage().nativeElement,
          blueprint: this.blueprint(),
          rules: { ...rules, hearts: rules.hearts + Math.max(0, Math.trunc(this.bonusHearts())) },
          character: this.progress.character(),
          // Modo calmo e movimento reduzido do sistema também apagam partículas e tremores.
          effectsEnabled: settings.effects && this.motion.isAllowed(),
          screen: this.screen(),
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
   * O som e as notas do bloco musical tocam direto, fora da zona: são os
   * eventos mais frequentes e não mudam nada na tela. O resto entra na zona
   * para a tela reagir.
   */
  private receive(event: GameSessionEvent): void {
    if (event.type === 'sound') {
      this.audio.play(event.cue);
      return;
    }

    if (event.type === 'note') {
      this.audio.playNote(event.degree);
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
      case 'p-switch':
        // Só avisa no primeiro aperto; outro botão com o efeito valendo só recomeça o relógio.
        if (!this.powerUps().some((power) => power.kind === 'p-switch')) {
          this.showToast('🅿️ BOTÃO P! Tijolo vira moeda!');
        }

        this.powerUpKey += 1;
        this.powerUps.update((list) => [
          ...list.filter((power) => power.kind !== 'p-switch'),
          { kind: 'p-switch', durationMs: event.durationMs, key: this.powerUpKey },
        ]);
        return;
      case 'p-switch-ended':
        this.powerUps.update((list) => list.filter((power) => power.kind !== 'p-switch'));
        return;
      case 'mascot':
        this.speak(event.text);
        return;
      case 'flower-speech':
        this.readFlower(event.text);
        return;
      case 'boss':
        this.boss.set(event.boss);
        return;
      case 'secret-found':
        this.showToast('🌟 FASE SECRETA LIBERADA!');
        this.secretFound.emit(event.secretLevel);
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
      case 'note':
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

  /** A frase da Flor Falante já aparece no balão em cima dela; aqui ela é lida em voz alta, para quem ainda não lê. */
  private applyScreen(screen: ScreenMode): void {
    this.screen.set(screen);
    this.session?.setScreen(screen);
  }

  private readFlower(text: string): void {
    // Os emojis não se leem bem em voz alta: fica só o texto (o seletor de variação some junto).
    const spoken = text.replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, '').trim();

    if (spoken !== '') {
      this.speech.speak(spoken, { language: 'pt-BR', rate: this.calmMode.isEnabled() ? CALM_SPEECH_RATE : DEFAULT_SPEECH_RATE });
    }
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

/** A trava de orientação só existe em parte dos navegadores e fora do padrão do TypeScript. */
interface LockableOrientation extends ScreenOrientation {
  lock?(orientation: 'landscape'): Promise<void>;
}

/**
 * Deita a tela do celular em tela cheia, onde o navegador permitir.
 *
 * Recusar é normal (tablet travado, navegador sem suporte): o aviso "vire o
 * celular" continua fazendo o trabalho, então a falha só vai para o console.
 */
async function lockLandscape(): Promise<void> {
  const orientation = screen.orientation as LockableOrientation | undefined;

  if (typeof orientation?.lock !== 'function') {
    return;
  }

  try {
    await orientation.lock('landscape');
  } catch (error) {
    console.warn('Pedro Maker: não foi possível deitar a tela automaticamente.', error);
  }
}
