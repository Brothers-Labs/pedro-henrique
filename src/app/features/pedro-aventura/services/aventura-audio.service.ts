import { computed, DestroyRef, effect, inject, Injectable } from '@angular/core';

import { CalmModeService } from '../../../core/services/calm-mode.service';
import { AventuraStore } from './aventura-store.service';

export type AventuraSound =
  | 'coin'
  | 'heart'
  | 'crown'
  | 'jump'
  | 'ramp'
  | 'hit'
  | 'break'
  | 'checkpoint'
  | 'victory'
  | 'defeat'
  | 'unlock'
  | 'claim'
  | 'button';

export type MusicTrack = 'lobby' | 'run';

interface Tone {
  readonly hertz: number;
  readonly delay: number;
  readonly duration: number;
  readonly wave: OscillatorType;
}

const tone = (hertz: number, delay: number, duration: number, wave: OscillatorType = 'triangle'): Tone => ({
  hertz,
  delay,
  duration,
  wave,
});

/** Efeitos curtos, em notas da escala maior: só a batida e a derrota descem. */
const SOUNDS: Readonly<Record<AventuraSound, readonly Tone[]>> = {
  coin: [tone(988, 0, 0.06, 'square'), tone(1319, 0.05, 0.1, 'square')],
  heart: [tone(659, 0, 0.1), tone(880, 0.08, 0.16)],
  crown: [tone(784, 0, 0.1), tone(988, 0.09, 0.1), tone(1319, 0.18, 0.24)],
  jump: [tone(392, 0, 0.08), tone(587, 0.05, 0.08)],
  ramp: [tone(440, 0, 0.1), tone(660, 0.08, 0.1), tone(880, 0.16, 0.14)],
  hit: [tone(196, 0, 0.14, 'sawtooth'), tone(147, 0.1, 0.18, 'sawtooth')],
  break: [tone(220, 0, 0.06, 'square'), tone(330, 0.04, 0.08, 'square')],
  checkpoint: [tone(523, 0, 0.12), tone(784, 0.1, 0.2)],
  victory: [tone(523, 0, 0.14), tone(659, 0.13, 0.14), tone(784, 0.26, 0.14), tone(1047, 0.39, 0.4)],
  defeat: [tone(392, 0, 0.2), tone(330, 0.18, 0.2), tone(262, 0.36, 0.36)],
  unlock: [tone(587, 0, 0.1), tone(880, 0.1, 0.1), tone(1175, 0.2, 0.3)],
  claim: [tone(880, 0, 0.08), tone(1175, 0.07, 0.08), tone(1568, 0.14, 0.2)],
  button: [tone(660, 0, 0.05)],
};

/** Trilhas em loop: acorde de base e uma melodia curta, compostas aqui mesmo. */
const MUSIC: Readonly<Record<MusicTrack, { readonly bpm: number; readonly bass: readonly number[]; readonly lead: readonly number[] }>> = {
  lobby: {
    bpm: 88,
    bass: [110, 110, 87.3, 87.3, 98, 98, 82.4, 82.4],
    lead: [440, 0, 523, 0, 494, 440, 392, 0, 349, 0, 440, 0, 392, 330, 294, 0],
  },
  run: {
    bpm: 132,
    bass: [130.8, 130.8, 98, 98, 110, 110, 87.3, 98],
    lead: [523, 659, 784, 659, 587, 698, 880, 698, 659, 784, 988, 784, 698, 587, 523, 587],
  },
};

const PEAK_GAIN = 0.18;
const MUSIC_GAIN = 0.06;
/** O agendador olha um pouco à frente para a música nunca engasgar. */
const SCHEDULE_AHEAD_SECONDS = 0.3;
const SCHEDULER_INTERVAL_MS = 100;

/**
 * Som do Pedro Aventura, todo sintetizado com Web Audio.
 *
 * Nada de arquivo de áudio: zero licença de terceiros e zero bytes a baixar.
 * O navegador só deixa tocar depois de um gesto, então tudo espera o
 * primeiro toque (`unlock`). No modo calmo a música não toca.
 */
@Injectable({ providedIn: 'root' })
export class AventuraAudio {
  private readonly store = inject(AventuraStore);
  private readonly calmMode = inject(CalmModeService);
  private context: AudioContext | null = null;
  private track: MusicTrack | null = null;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beat = 0;
  /** Música em pausa junto com o jogo: mexer no volume não pode fazê-la voltar sozinha. */
  private isSuspended = false;

  private readonly musicVolume = computed(() => (this.calmMode.isEnabled() ? 0 : this.store.settings().musicVolume));
  private readonly effectsVolume = computed(() => this.store.settings().effectsVolume);

  constructor() {
    // Volume zerado ou modo calmo ligado param o agendador; voltar retoma a trilha.
    effect(() => {
      if (this.musicVolume() === 0) {
        this.stopScheduler();
      } else if (this.track && this.context && !this.isSuspended) {
        this.startScheduler();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.stopScheduler();
      void this.context?.close();
    });
  }

  /** Liga o áudio no primeiro gesto da criança. Chamar de novo não faz nada. */
  unlock(): void {
    if (typeof AudioContext === 'undefined') {
      return;
    }

    this.context ??= new AudioContext();

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }

    if (this.track && !this.isSuspended) {
      this.startScheduler();
    }
  }

  play(sound: AventuraSound): void {
    const context = this.context;
    const volume = this.effectsVolume();

    if (!context || volume === 0) {
      return;
    }

    const start = context.currentTime;

    for (const note of SOUNDS[sound]) {
      this.playTone(context, note, start, PEAK_GAIN * volume);
    }
  }

  playMusic(track: MusicTrack): void {
    if (this.track === track) {
      // Mesma trilha depois de uma pausa (fase seguinte, jogar de novo): só volta a tocar.
      this.resumeMusic();
      return;
    }

    this.track = track;
    this.beat = 0;
    this.isSuspended = false;
    this.stopScheduler();

    if (this.context) {
      this.startScheduler();
    }
  }

  stopMusic(): void {
    this.track = null;
    this.stopScheduler();
  }

  /** Pausa só a música (pausa do jogo, aba escondida); os efeitos continuam disponíveis. */
  suspendMusic(): void {
    this.isSuspended = true;
    this.stopScheduler();
  }

  resumeMusic(): void {
    this.isSuspended = false;

    if (this.track && this.context) {
      this.startScheduler();
    }
  }

  private startScheduler(): void {
    const context = this.context;

    if (!context || this.scheduler !== null || this.musicVolume() === 0) {
      return;
    }

    this.nextBeatTime = context.currentTime + 0.05;
    this.scheduler = setInterval(() => this.scheduleBeats(), SCHEDULER_INTERVAL_MS);
  }

  private stopScheduler(): void {
    if (this.scheduler !== null) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
  }

  private scheduleBeats(): void {
    const context = this.context;
    const track = this.track;

    if (!context || !track) {
      return;
    }

    const music = MUSIC[track];
    const beatSeconds = 60 / music.bpm / 2;
    const gain = MUSIC_GAIN * this.musicVolume();

    while (this.nextBeatTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const leadNote = music.lead[this.beat % music.lead.length];
      const bassNote = music.bass[Math.floor(this.beat / 2) % music.bass.length];

      if (leadNote > 0) {
        this.playTone(context, tone(leadNote, 0, beatSeconds * 0.9, 'triangle'), this.nextBeatTime, gain);
      }

      if (this.beat % 2 === 0) {
        this.playTone(context, tone(bassNote, 0, beatSeconds * 1.8, 'sine'), this.nextBeatTime, gain * 1.6);
      }

      this.nextBeatTime += beatSeconds;
      this.beat += 1;
    }
  }

  private playTone(context: AudioContext, note: Tone, start: number, peak: number): void {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const begin = start + note.delay;
    const end = begin + note.duration;

    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.hertz, begin);
    envelope.gain.setValueAtTime(0.0001, begin);
    envelope.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), begin + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope).connect(context.destination);
    oscillator.start(begin);
    oscillator.stop(end + 0.02);
  }
}
