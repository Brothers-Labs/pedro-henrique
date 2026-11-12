import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { GameLoop } from '../../../pedro-maker/engine/game-loop';
import type { MakerSoundCue } from '../../../pedro-maker/models/session.model';
import { MakerAudioService } from '../../../pedro-maker/services/maker-audio.service';
import { PHYSICS } from '../../config/physics.config';
import type { PedrereScene } from '../../engine/scene';
import { type ControlState, createControlState, releaseAll } from '../../models/controls.model';
import type { GameEvent, HudEntry, SceneResult } from '../../models/scene.model';
import { PedrereTouchControls } from '../pedrere-touch-controls/pedrere-touch-controls';

type HostPhase = 'jogando' | 'pausado' | 'terminando' | 'erro';

/** Um instante para a criança ver a chegada antes de a tela de resultado aparecer. */
const RESULT_DELAY_MS = 900;

/** Som de cada acontecimento, com os efeitos que o Pedro Maker já sabe tocar. */
const EVENT_SOUNDS: Readonly<Record<GameEvent, MakerSoundCue>> = {
  countdown: 'button',
  start: 'powerup',
  jump: 'jump',
  bounce: 'spring',
  coin: 'coin',
  stomp: 'enemyHit',
  hurt: 'damage',
  fall: 'damage',
  checkpoint: 'checkpoint',
  finish: 'victory',
};

const KEY_BINDINGS: Readonly<Record<string, keyof ControlState>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
};

const PAUSE_KEYS: ReadonlySet<string> = new Set(['Escape', 'KeyP']);

/**
 * Roda um modo do Pedro Pedrerê em tela cheia: canvas, painel, controles e pausa.
 *
 * Não sabe qual modo está rodando — só conhece a cena. Para jogar de novo, a
 * página destrói este componente e cria outro: a partida sempre recomeça do
 * zero, sem sobrar nada da anterior.
 */
@Component({
  selector: 'app-pedrere-game-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PedrereTouchControls],
  templateUrl: './pedrere-game-host.html',
  styleUrl: './pedrere-game-host.scss',
  host: {
    '(document:keydown)': 'onKey($event, true)',
    '(document:keyup)': 'onKey($event, false)',
    '(document:visibilitychange)': 'onVisibilityChange()',
    '(window:blur)': 'pause()',
  },
})
export class PedrereGameHost {
  readonly createScene = input.required<() => PedrereScene>();

  readonly finished = output<SceneResult>();
  readonly exited = output<void>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly loop = new GameLoop((steps, _alpha, frameMs) => this.onFrame(steps, frameMs), PHYSICS.stepSeconds * 1000);
  private scene: PedrereScene | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resultTimer: ReturnType<typeof setTimeout> | null = null;
  private timeSeconds = 0;
  private hudSignature = '';

  protected readonly controls = createControlState();
  protected readonly isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  protected readonly phase = signal<HostPhase>('jogando');
  protected readonly hud = signal<readonly HudEntry[]>([]);
  protected readonly banner = signal<string | null>(null);
  protected readonly description = signal('');
  protected readonly controlLayout = signal<PedrereScene['controls']>('plataforma');

  constructor() {
    afterNextRender(() => this.start());

    inject(DestroyRef).onDestroy(() => {
      this.loop.stop();
      this.resizeObserver?.disconnect();

      if (this.resultTimer !== null) {
        clearTimeout(this.resultTimer);
      }
    });
  }

  protected onKey(event: KeyboardEvent, isPressed: boolean): void {
    if (isPressed && PAUSE_KEYS.has(event.code)) {
      this.togglePause();

      return;
    }

    const control = KEY_BINDINGS[event.code];

    if (control) {
      // Setas e espaço rolariam a página por baixo do jogo.
      event.preventDefault();
      this.controls[control] = isPressed;
    }
  }

  protected onVisibilityChange(): void {
    if (document.hidden) {
      this.pause();
    }
  }

  protected pause(): void {
    if (this.phase() !== 'jogando') {
      return;
    }

    this.loop.stop();
    releaseAll(this.controls);
    this.phase.set('pausado');
  }

  protected resume(): void {
    if (this.phase() !== 'pausado') {
      return;
    }

    this.phase.set('jogando');
    this.zone.runOutsideAngular(() => this.loop.start());
  }

  protected exit(): void {
    this.loop.stop();
    this.exited.emit();
  }

  private togglePause(): void {
    if (this.phase() === 'pausado') {
      this.resume();
    } else {
      this.pause();
    }
  }

  private start(): void {
    const canvas = this.canvas().nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      this.phase.set('erro');

      return;
    }

    try {
      this.scene = this.createScene()();
    } catch (error) {
      console.error('Pedro Pedrerê: não foi possível montar a partida.', error);
      this.phase.set('erro');

      return;
    }

    this.context = context;
    this.description.set(this.scene.description);
    this.controlLayout.set(this.scene.controls);
    this.resizeObserver = new ResizeObserver(() => this.fitCanvas());
    this.resizeObserver.observe(canvas);
    this.fitCanvas();
    this.zone.runOutsideAngular(() => this.loop.start());
  }

  private onFrame(steps: number, frameMs: number): void {
    const scene = this.scene;

    if (!scene) {
      return;
    }

    for (let step = 0; step < steps; step += 1) {
      for (const event of scene.step(this.controls)) {
        this.audio.play(EVENT_SOUNDS[event]);
      }
    }

    this.timeSeconds += frameMs / 1000;
    this.paint(scene);
    this.publishHud(scene);

    const result = scene.result();

    if (result && this.phase() === 'jogando') {
      this.finishWith(result);
    }
  }

  private finishWith(result: SceneResult): void {
    this.phase.set('terminando');
    releaseAll(this.controls);
    this.resultTimer = setTimeout(() => {
      this.loop.stop();
      this.zone.run(() => this.finished.emit(result));
    }, RESULT_DELAY_MS);
  }

  private paint(scene: PedrereScene): void {
    const context = this.context;

    if (!context) {
      return;
    }

    const canvas = context.canvas;
    const ratio = canvas.clientWidth > 0 ? canvas.width / canvas.clientWidth : 1;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    scene.paint(context, canvas.clientWidth, canvas.clientHeight, this.timeSeconds);
  }

  /** O painel só muda quando algum número muda, e não sessenta vezes por segundo. */
  private publishHud(scene: PedrereScene): void {
    const hud = scene.hud();
    const banner = scene.banner();
    const signature = hud.map((entry) => entry.value).join('|') + `|${banner ?? ''}`;

    if (signature === this.hudSignature) {
      return;
    }

    this.hudSignature = signature;
    this.hud.set(hud);
    this.banner.set(banner);
  }

  private fitCanvas(): void {
    const canvas = this.canvas().nativeElement;
    const ratio = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));

    if (this.scene && !this.loop.isRunning) {
      this.paint(this.scene);
    }
  }
}
