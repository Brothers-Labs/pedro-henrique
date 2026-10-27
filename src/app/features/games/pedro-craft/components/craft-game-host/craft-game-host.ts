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

import { MotionPreferenceService } from '../../../../../core/services/motion-preference.service';
import { MakerAudioService } from '../../../pedro-maker/services/maker-audio.service';
import type { CraftCatalog } from '../../content/craft-catalog';
import { createVirtualCraftInput } from '../../engine/input/craft-input';
import type { CraftEngineSettings, CraftGameSession, CraftSessionEvent } from '../../models/craft-session.model';
import { CraftSettingsService } from '../../services/craft-settings.service';
import { CraftTouchControls } from '../craft-touch-controls/craft-touch-controls';

type HostPhase = 'loading' | 'playing' | 'paused' | 'error';

/**
 * Um mundo do PedroCraft em tela cheia.
 *
 * Carrega o motor só quando o mundo abre, cria o jogo fora da zona do
 * Angular (60 quadros por segundo não podem disparar detecção de mudanças) e
 * traduz os eventos do motor em signals. Ao sair da tela, o jogo é destruído
 * junto com o canvas.
 */
@Component({
  selector: 'app-craft-game-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftTouchControls],
  templateUrl: './craft-game-host.html',
  styleUrl: './craft-game-host.scss',
  host: {
    '(document:visibilitychange)': 'pauseWhenHidden()',
    '(document:fullscreenchange)': 'syncFullscreen()',
    '(document:pointerlockchange)': 'syncPointerLock()',
  },
})
export class CraftGameHost {
  readonly catalog = input.required<CraftCatalog>();
  readonly seed = input.required<number>();
  readonly worldName = input.required<string>();

  readonly exited = output<void>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly settingsService = inject(CraftSettingsService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly root = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private session: CraftGameSession | null = null;
  private lookPointer: { readonly id: number; x: number; y: number } | null = null;

  /** Estado dos controles de toque, lido pelo motor a cada passo. */
  protected readonly virtualInput = createVirtualCraftInput();

  protected readonly phase = signal<HostPhase>('loading');
  protected readonly loadingProgress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly isFullscreen = signal(false);
  protected readonly isPointerLocked = signal(false);
  protected readonly canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  protected readonly buttonSize = computed(() => this.settingsService.settings().buttonSize);

  protected readonly showsTouchControls = computed(() => {
    const mode = this.settingsService.settings().touchControls;

    return mode === 'sempre' || (mode === 'automatico' && isTouchDevice());
  });

  protected readonly showsMouseHint = computed(
    () => this.phase() === 'playing' && !this.showsTouchControls() && !this.isPointerLocked(),
  );

  private readonly engineSettings = computed<CraftEngineSettings>(() => {
    const settings = this.settingsService.settings();

    return {
      lookSensitivity: settings.lookSensitivity,
      autoJump: settings.autoJump,
      // Modo calmo e movimento reduzido do sistema também apagam partículas e tremores.
      effectsEnabled: this.motion.isAllowed(),
    };
  });

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const settings = this.engineSettings();

      untracked(() => this.session?.updateSettings(settings));
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

  protected resume(): void {
    if (this.phase() !== 'paused') {
      return;
    }

    this.audio.play('button');
    this.session?.resume();
    this.phase.set('playing');
  }

  protected exit(): void {
    this.audio.play('button');
    this.exited.emit();
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
      console.warn('PedroCraft: tela cheia indisponível neste navegador.', error);
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

  protected syncPointerLock(): void {
    this.isPointerLocked.set(document.pointerLockElement !== null);
  }

  /* Olhar arrastando o dedo -------------------------------------------------------- */

  protected startLook(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || this.lookPointer || this.phase() !== 'playing') {
      return;
    }

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  protected moveLook(event: PointerEvent): void {
    const pointer = this.lookPointer;

    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    this.virtualInput.lookDeltaX += event.clientX - pointer.x;
    this.virtualInput.lookDeltaY += event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  protected endLook(event: PointerEvent): void {
    if (this.lookPointer?.id === event.pointerId) {
      this.lookPointer = null;
    }
  }

  /* Motor ---------------------------------------------------------------------------- */

  private async start(): Promise<void> {
    try {
      const { launchCraftGame } = await import('../../engine/launch-craft');

      this.session = this.zone.runOutsideAngular(() =>
        launchCraftGame({
          parent: this.stage().nativeElement,
          catalog: this.catalog(),
          seed: this.seed(),
          settings: this.engineSettings(),
          input: this.virtualInput,
          listener: (event) => this.receive(event),
        }),
      );
    } catch (error) {
      console.error('PedroCraft: o motor do jogo não pôde ser carregado.', error);
      this.errorMessage.set('Não foi possível carregar o jogo. Verifique a internet e tente de novo.');
      this.phase.set('error');
    }
  }

  /** Som toca direto, fora da zona: é o evento mais frequente e não muda nada na tela. */
  private receive(event: CraftSessionEvent): void {
    if (event.type === 'sound') {
      this.audio.play(event.cue);
      return;
    }

    this.zone.run(() => this.handle(event));
  }

  private handle(event: Exclude<CraftSessionEvent, { readonly type: 'sound' }>): void {
    switch (event.type) {
      case 'loading':
        this.loadingProgress.set(Math.round(event.progress * 100));
        return;
      case 'ready':
        this.phase.set('playing');
        return;
      case 'pause-requested':
        this.pause();
        return;
      case 'error':
        this.errorMessage.set(event.message);
        this.phase.set('error');
        return;
    }
  }

  private teardown(): void {
    this.session?.destroy();
    this.session = null;

    if (document.fullscreenElement === this.root.nativeElement) {
      void document.exitFullscreen().catch((error: unknown) =>
        console.warn('PedroCraft: não foi possível sair da tela cheia.', error),
      );
    }
  }
}

function isTouchDevice(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}
