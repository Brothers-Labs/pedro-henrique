import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { PROFILE } from '../../../../../core/data/profile.data';
import { formatPlacement, formatRaceTime } from '../../../pedro-kart/race-format';
import type { MakerSoundCue } from '../../../pedro-maker/models/session.model';
import { MakerAudioService } from '../../../pedro-maker/services/maker-audio.service';
import { MakerProgressService } from '../../../pedro-maker/services/maker-progress.service';
import { difficultyOption } from '../../config/runner.config';
import { flashTheme } from '../../config/theme.config';
import type { CourseDefinition } from '../../models/course.model';
import { createVirtualRunState, type RunSession, type RunSessionEvent } from '../../models/run-session.model';
import type { BossId, RunMode } from '../../models/runner.model';
import { FlashProgressService } from '../../services/flash-progress.service';
import type { RunnerPower } from '../../simulation/runner';
import type { RunEvent, RunHud, RunResult } from '../../simulation/run-simulation';
import { FlashTouchControls } from '../flash-touch-controls/flash-touch-controls';

type HostPhase = 'carregando' | 'correndo' | 'pausado' | 'erro';

const TOAST_MS = 1500;
/** O "JÁ!" fica um instante na tela depois da largada. */
const GO_MESSAGE_MS = 700;
/** Raios em fileira chegam a doze por segundo: o som de cada um tocaria em cima do outro. */
const RAIO_SOUND_GAP_MS = 70;

const POWER_MESSAGES: Readonly<Record<RunnerPower, string>> = {
  escudo: '🛡️ Escudo!',
  ima: '🧲 Ímã de raios!',
  energia: '⚡ Energia extra!',
};

/** Som de cada acontecimento, com os efeitos que o Pedro Maker já sabe tocar. */
const EVENT_SOUNDS: Readonly<Partial<Record<RunEvent['type'], MakerSoundCue>>> = {
  contagem: 'button',
  largada: 'powerup',
  pulo: 'jump',
  ataque: 'spring',
  impulso: 'spring',
  caixa: 'powerup',
  mola: 'spring',
  turbo: 'spring',
  rampa: 'jump',
  relampago: 'powerup',
  'escudo-quebrou': 'break',
  dano: 'damage',
  tropecou: 'damage',
  batida: 'break',
  caiu: 'damage',
  'inimigo-derrotado': 'enemyHit',
  'chefe-chegou': 'boss',
  'chefe-cansado': 'secret',
  'chefe-ataque': 'fireball',
  'chefe-atingido': 'enemyHit',
  'chefe-derrotado': 'victory',
  chegada: 'victory',
};

/**
 * A partida na tela: o motor 3D por baixo e o painel por cima.
 *
 * Ocupa a tela inteira enquanto existe. Para correr de novo, a página
 * destrói este componente e cria outro: a partida sempre recomeça do zero,
 * sem sobrar nada da anterior.
 */
@Component({
  selector: 'app-flash-run-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlashTouchControls],
  templateUrl: './flash-run-host.html',
  styleUrl: './flash-run-host.scss',
  host: {
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class FlashRunHost {
  readonly course = input.required<CourseDefinition>();
  readonly mode = input.required<RunMode>();
  readonly boss = input<BossId | null>(null);

  readonly finished = output<RunResult>();
  readonly exited = output<void>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly character = inject(MakerProgressService).character;
  private readonly flashProgress = inject(FlashProgressService);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private session: RunSession | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRaioSoundAt = 0;
  private isDestroyed = false;

  protected readonly runState = createVirtualRunState();
  protected readonly isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  protected readonly phase = signal<HostPhase>('carregando');
  protected readonly hud = signal<RunHud | null>(null);
  protected readonly countdown = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly formatTime = formatRaceTime;
  protected readonly formatPlacement = formatPlacement;
  /** Cada metade da barra de energia é uma carga do modo relâmpago, de 0 a 100% cheia. */
  protected readonly energyFill = computed(() => {
    const energy = this.hud()?.energy ?? 0;

    return [segmentFill(energy, 0), segmentFill(energy, 1)];
  });
  protected readonly bossHearts = computed(() => {
    const boss = this.hud()?.boss;

    return boss ? Array.from({ length: boss.hitsNeeded }, (_, index) => index < boss.hitsLeft) : [];
  });

  constructor() {
    afterNextRender(() => void this.start());

    inject(DestroyRef).onDestroy(() => {
      this.isDestroyed = true;
      this.clearToast();

      if (this.countdownTimer !== null) {
        clearTimeout(this.countdownTimer);
      }

      this.audio.stopMusic();
      this.session?.destroy();
      this.session = null;
    });
  }

  protected pause(): void {
    if (this.phase() !== 'correndo') {
      return;
    }

    this.session?.pause();
    this.audio.stopMusic();
    this.phase.set('pausado');
  }

  protected resume(): void {
    if (this.phase() !== 'pausado') {
      return;
    }

    this.phase.set('correndo');
    this.audio.startMusic(flashTheme(this.course().theme).music);
    this.zone.runOutsideAngular(() => this.session?.resume());
  }

  protected exit(): void {
    this.exited.emit();
  }

  protected onVisibilityChange(): void {
    if (document.hidden) {
      this.pause();
    }
  }

  private async start(): Promise<void> {
    try {
      const { launchFlashRun } = await import('../../engine/launch-run');

      if (this.isDestroyed) {
        return;
      }

      this.session = this.zone.runOutsideAngular(() =>
        launchFlashRun({
          parent: this.stage().nativeElement,
          setup: {
            course: this.course(),
            mode: this.mode(),
            playerSetup: this.flashProgress.setup(),
            playerName: PROFILE.firstName,
            tuning: difficultyOption(this.flashProgress.difficulty()).tuning,
            boss: this.boss() ?? undefined,
          },
          look: this.character(),
          input: this.runState,
          listener: (event) => this.zone.run(() => this.onSessionEvent(event)),
        }),
      );
    } catch (error) {
      console.error('Pedro Flash: a partida não abriu.', error);
      this.fail('Não foi possível abrir a fase. Tente de novo daqui a pouco.');
    }
  }

  private onSessionEvent(event: RunSessionEvent): void {
    switch (event.type) {
      case 'pronto':
        this.phase.set('correndo');
        this.audio.startMusic(flashTheme(this.course().theme).music);
        return;
      case 'painel':
        this.hud.set(event.hud);
        return;
      case 'pausa-pedida':
        this.pause();
        return;
      case 'erro':
        this.fail(event.message);
        return;
      case 'partida':
        this.onRunEvent(event.event);
        return;
    }
  }

  private onRunEvent(event: RunEvent): void {
    this.playSound(event);

    switch (event.type) {
      case 'contagem':
        this.countdown.set(String(event.value));
        return;
      case 'largada':
        this.countdown.set('JÁ!');
        this.countdownTimer = setTimeout(() => this.countdown.set(null), GO_MESSAGE_MS);
        return;
      case 'chegada':
        this.audio.stopMusic();
        this.finished.emit(event.result);
        return;
      default: {
        const message = toastFor(event);

        if (message) {
          this.showToast(message);
        }
      }
    }
  }

  private playSound(event: RunEvent): void {
    if (event.type === 'raio') {
      const now = performance.now();

      if (now - this.lastRaioSoundAt >= RAIO_SOUND_GAP_MS) {
        this.lastRaioSoundAt = now;
        this.audio.play('coin');
      }

      return;
    }

    const sound = EVENT_SOUNDS[event.type];

    if (sound) {
      this.audio.play(sound);
    }
  }

  private showToast(message: string): void {
    this.clearToast();
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(null), TOAST_MS);
  }

  private clearToast(): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  private fail(message: string): void {
    this.audio.stopMusic();
    this.errorMessage.set(message);
    this.phase.set('erro');
  }
}

function segmentFill(energy: number, segment: number): number {
  return Math.min(100, Math.max(0, (energy - segment * 50) * 2));
}

/** O aviso de cada acontecimento; nunca soa como bronca. `null` para os que não precisam de aviso. */
function toastFor(event: RunEvent): string | null {
  switch (event.type) {
    case 'caixa':
      return POWER_MESSAGES[event.power];
    case 'turbo':
      return 'Turbo! 💨';
    case 'rampa':
      return 'Manobra radical! 🤸';
    case 'relampago':
      return 'Modo relâmpago! ⚡';
    case 'escudo-quebrou':
      return 'O escudo segurou! 🛡️';
    case 'dano':
      return event.lost === 1 ? 'Ai! Perdeu 1 raio' : `Ai! Perdeu ${event.lost} raios`;
    case 'tropecou':
      return 'Opa, tropeçou! 🌀';
    case 'caiu':
      return 'Caiu no buraco! Pule na beirada 🕳️';
    case 'inimigo-derrotado':
      return 'Robô derrotado! 💥';
    case 'chefe-chegou':
      return `${event.name} chegou! 🤖`;
    case 'chefe-cansado':
      return 'O robô cansou! Pule nele! 👊';
    case 'chefe-ataque':
      return event.attack === 'bomba' ? 'Bomba! Desvie para o lado 💣' : 'Onda! Pule por cima 🌊';
    case 'chefe-atingido':
      return event.hitsLeft > 0 ? `Acertou! Faltam ${event.hitsLeft} 💥` : null;
    case 'chefe-derrotado':
      return 'Você venceu o chefão! 🏆';
    default:
      return null;
  }
}
