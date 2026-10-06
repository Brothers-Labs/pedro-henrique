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

import type { MakerSoundCue } from '../../../pedro-maker/models/session.model';
import { paletteFor } from '../../../pedro-maker/config/character.config';
import { MakerAudioService } from '../../../pedro-maker/services/maker-audio.service';
import { MakerProgressService } from '../../../pedro-maker/services/maker-progress.service';
import { PROFILE } from '../../../../../core/data/profile.data';
import { difficultyOption } from '../../config/kart.config';
import { trackTheme } from '../../config/theme.config';
import { createVirtualDriveState, type RaceSession, type RaceSessionEvent } from '../../models/race-session.model';
import type { TrackDefinition } from '../../models/track.model';
import { formatPlacement, formatRaceTime } from '../../race-format';
import { KartProgressService } from '../../services/kart-progress.service';
import type { KartItem } from '../../simulation/kart';
import type { RaceEvent, RaceHud, RaceResult } from '../../simulation/race-simulation';
import { KartTouchControls } from '../kart-touch-controls/kart-touch-controls';

type HostPhase = 'carregando' | 'correndo' | 'pausado' | 'erro';

const TOAST_MS = 1400;
/** O "JÁ!" fica um instante na tela depois da largada. */
const GO_MESSAGE_MS = 700;

const ITEM_LABELS: Readonly<Record<KartItem, { readonly emoji: string; readonly label: string }>> = {
  turbo: { emoji: '🍄', label: 'Turbo' },
  estrela: { emoji: '⭐', label: 'Estrela' },
  casca: { emoji: '🍌', label: 'Casca' },
};

/** Som de cada acontecimento, com os efeitos que o Pedro Maker já sabe tocar. */
const EVENT_SOUNDS: Readonly<Partial<Record<RaceEvent['type'], MakerSoundCue>>> = {
  contagem: 'button',
  largada: 'powerup',
  volta: 'checkpoint',
  item: 'coin',
  'item-usado': 'spring',
  turbo: 'spring',
  rodou: 'damage',
  batida: 'enemyHit',
  chegada: 'victory',
};

/**
 * A corrida na tela: o motor 3D por baixo e o painel por cima.
 *
 * Ocupa a tela inteira enquanto existe. Para correr de novo, a página
 * destrói este componente e cria outro: a corrida sempre recomeça do zero,
 * sem sobrar nada da anterior.
 */
@Component({
  selector: 'app-kart-race-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KartTouchControls],
  templateUrl: './kart-race-host.html',
  styleUrl: './kart-race-host.scss',
  host: {
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class KartRaceHost {
  readonly track = input.required<TrackDefinition>();

  readonly finished = output<RaceResult>();
  readonly exited = output<void>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly look = inject(MakerProgressService).look;
  private readonly kartProgress = inject(KartProgressService);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly minimap = viewChild.required<ElementRef<HTMLCanvasElement>>('minimap');
  private session: RaceSession | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  protected readonly driveState = createVirtualDriveState();
  protected readonly isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  protected readonly phase = signal<HostPhase>('carregando');
  protected readonly hud = signal<RaceHud | null>(null);
  protected readonly countdown = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly itemLabels = ITEM_LABELS;
  protected readonly formatTime = formatRaceTime;
  protected readonly formatPlacement = formatPlacement;

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
    this.audio.startMusic(trackTheme(this.track().theme).music);
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
      const { launchKartRace } = await import('../../engine/launch-race');

      if (this.isDestroyed) {
        return;
      }

      this.session = this.zone.runOutsideAngular(() =>
        launchKartRace({
          parent: this.stage().nativeElement,
          track: this.track(),
          kart: this.kartProgress.setup(),
          driver: paletteFor(this.look()),
          playerName: PROFILE.firstName,
          rivalPace: difficultyOption(this.kartProgress.difficulty()).rivalPace,
          input: this.driveState,
          minimap: this.minimap().nativeElement,
          listener: (event) => this.zone.run(() => this.onSessionEvent(event)),
        }),
      );
    } catch (error) {
      console.error('Pedro Kart: a corrida não abriu.', error);
      this.fail('Não foi possível abrir a corrida. Tente de novo daqui a pouco.');
    }
  }

  private onSessionEvent(event: RaceSessionEvent): void {
    switch (event.type) {
      case 'pronto':
        this.phase.set('correndo');
        this.audio.startMusic(trackTheme(this.track().theme).music);
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
      case 'corrida':
        this.onRaceEvent(event.event);
        return;
    }
  }

  private onRaceEvent(event: RaceEvent): void {
    const sound = EVENT_SOUNDS[event.type];

    if (sound) {
      this.audio.play(sound);
    }

    switch (event.type) {
      case 'contagem':
        this.countdown.set(String(event.value));
        return;
      case 'largada':
        this.countdown.set('JÁ!');
        this.countdownTimer = setTimeout(() => this.countdown.set(null), GO_MESSAGE_MS);
        return;
      case 'volta':
        this.showToast(event.lap === event.totalLaps ? 'Última volta! 🏁' : `Volta ${event.lap} de ${event.totalLaps}`);
        return;
      case 'item':
        this.showToast(`${ITEM_LABELS[event.item].emoji} ${ITEM_LABELS[event.item].label}!`);
        return;
      case 'turbo':
        this.showToast('Turbo! 💨');
        return;
      case 'rodou':
        this.showToast('Opa, escorregou! 🌀');
        return;
      case 'chegada':
        this.audio.stopMusic();
        this.finished.emit(event.result);
        return;
      case 'item-usado':
      case 'batida':
        return;
    }
  }

  private showToast(message: string | null): void {
    this.clearToast();
    this.toast.set(message);

    if (message) {
      this.toastTimer = setTimeout(() => this.toast.set(null), TOAST_MS);
    }
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
