import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

import { SoundService } from '../../../../core/services/sound.service';
import { createNoiseBuffer, playVoice, type SynthTarget } from '../engine/sprunk-synth';
import { SPRUNK_STEPS_PER_BAR, type SprunkAction, type SprunkSound, type SprunkVoice } from '../models/sprunk.model';

const TEMPO_BPM = 112;
const STEP_SECONDS = 60 / TEMPO_BPM / 4;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const SCHEDULER_INTERVAL_MS = 25;
const DEFAULT_VOLUME = 0.6;

interface ActionNote {
  readonly voice: SprunkVoice;
  readonly semitones: number;
  readonly delay: number;
}

/** O efeito de cada ação especial, tocado por cima da música. Todos sobem de tom. */
const ACTION_CUES: Readonly<Record<SprunkAction, readonly ActionNote[]>> = {
  jump: [{ voice: 'boing', semitones: 0, delay: 0 }],
  spin: [
    { voice: 'blip', semitones: 12, delay: 0 },
    { voice: 'blip', semitones: 16, delay: 0.07 },
    { voice: 'blip', semitones: 19, delay: 0.14 },
    { voice: 'blip', semitones: 24, delay: 0.21 },
  ],
  shake: [
    { voice: 'shaker', semitones: 0, delay: 0 },
    { voice: 'shaker', semitones: 0, delay: 0.1 },
    { voice: 'shaker', semitones: 0, delay: 0.2 },
    { voice: 'shaker', semitones: 0, delay: 0.3 },
  ],
  stretch: [{ voice: 'whistle', semitones: 19, delay: 0 }],
  lunge: [
    { voice: 'chain', semitones: 0, delay: 0 },
    { voice: 'tom', semitones: 0, delay: 0.2 },
    { voice: 'chain', semitones: 0, delay: 0.3 },
  ],
};

/** Duração de uma batida (semínima), para a dança acompanhar a música. */
export const SPRUNK_BEAT_SECONDS = STEP_SECONDS * 4;

/**
 * A banda do Pedro Sprunks: um relógio só para todos os bonecos.
 *
 * Cada boneco no palco toca o seu compasso em cima do mesmo relógio, então
 * quem entra no meio da música entra no tempo certo, sem atravessar ninguém.
 * O agendamento olha um pouco à frente (o padrão do Web Audio), o que mantém
 * o ritmo firme mesmo quando a tela engasga.
 *
 * O serviço é da página, não do site: quando o Pedro sai do jogo, a música
 * para junto. E respeita o som do site — com o modo calmo ou o som desligado,
 * a banda fica em silêncio.
 */
@Injectable()
export class SprunkAudioService {
  private readonly sound = inject(SoundService);

  private context: AudioContext | null = null;
  private target: SynthTarget | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private stepIndex = 0;
  private band: readonly SprunkSound[] = [];

  private readonly volumeState = signal(DEFAULT_VOLUME);

  readonly volume = this.volumeState.asReadonly();
  readonly isAudible = this.sound.isAudible;

  constructor() {
    effect(() => {
      if (!this.isAudible()) {
        this.stopClock();
        return;
      }

      // O som voltou com a banda já no palco: ela retoma sem pedir outro toque.
      if (this.band.length > 0) {
        this.startClock();
      }
    });

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /** Troca quem está tocando. O relógio liga com o primeiro boneco e para com o último. */
  setBand(band: readonly SprunkSound[]): void {
    this.band = band;

    if (band.length === 0) {
      this.stopClock();
      return;
    }

    this.startClock();
  }

  /** Volume geral, de 0 a 1. */
  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));

    this.volumeState.set(clamped);

    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(clamped, this.context.currentTime, 0.02);
    }
  }

  /**
   * Toca o compasso de um som uma vez, já: é a "fala" do boneco quando o
   * Pedro toca nele, e a prévia no criador de personagens.
   */
  playPhrase(sound: SprunkSound): void {
    const target = this.resolveTarget();

    if (!target) {
      return;
    }

    const startAt = target.context.currentTime + 0.02;

    sound.steps.forEach((semitones, index) => {
      if (semitones !== null) {
        playVoice(target, sound.voice, semitones, startAt + index * STEP_SECONDS);
      }
    });
  }

  /** O efeito da ação especial de um boneco, quando o Pedro toca nele no palco. */
  playAction(action: SprunkAction): void {
    const target = this.resolveTarget();

    if (!target) {
      return;
    }

    const startAt = target.context.currentTime + 0.01;

    for (const note of ACTION_CUES[action]) {
      playVoice(target, note.voice, note.semitones, startAt + note.delay);
    }
  }

  private startClock(): void {
    if (this.timer !== null) {
      return;
    }

    const target = this.resolveTarget();

    if (!target) {
      return;
    }

    this.stepIndex = 0;
    this.nextStepTime = target.context.currentTime + 0.05;
    this.timer = setInterval(() => this.scheduleAhead(target), SCHEDULER_INTERVAL_MS);
  }

  private stopClock(): void {
    if (this.timer === null) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  private scheduleAhead(target: SynthTarget): void {
    const horizon = target.context.currentTime + SCHEDULE_AHEAD_SECONDS;

    while (this.nextStepTime < horizon) {
      for (const sound of this.band) {
        const semitones = sound.steps[this.stepIndex];

        if (semitones !== null) {
          playVoice(target, sound.voice, semitones, this.nextStepTime);
        }
      }

      this.nextStepTime += STEP_SECONDS;
      this.stepIndex = (this.stepIndex + 1) % SPRUNK_STEPS_PER_BAR;
    }
  }

  /**
   * O contexto de áudio só nasce no primeiro toque, que é o que os navegadores
   * exigem para tocar algo. Devolve `null` quando o som do site está desligado
   * ou o aparelho não tem áudio — o jogo continua, só que mudo.
   */
  private resolveTarget(): SynthTarget | null {
    if (!this.isAudible()) {
      return null;
    }

    if (this.target && this.context) {
      // O navegador suspende o contexto quando a aba perde o foco.
      void this.context.resume().catch(() => undefined);

      return this.target;
    }

    if (typeof AudioContext !== 'function') {
      return null;
    }

    try {
      this.context = new AudioContext();
    } catch {
      // Sem permissão ou sem saída de áudio: o jogo continua igual, mudo.
      return null;
    }

    // Sete bonecos somados passariam do limite; o compressor segura os picos.
    const compressor = this.context.createDynamicsCompressor();

    this.master = this.context.createGain();
    this.master.gain.value = this.volumeState();
    this.master.connect(compressor).connect(this.context.destination);
    this.target = { context: this.context, output: this.master, noise: createNoiseBuffer(this.context) };

    return this.target;
  }

  private dispose(): void {
    this.stopClock();
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.target = null;
    this.master = null;
  }
}
