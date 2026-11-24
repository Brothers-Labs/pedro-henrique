import { computed, DestroyRef, inject, Injectable } from '@angular/core';

import { CalmModeService } from '../../../../core/services/calm-mode.service';
import { seedFromText, SeededRandom } from '../levels/seeded-random';
import type { LevelTheme } from '../models/level.model';
import type { MakerSoundCue } from '../models/session.model';
import { MakerSettingsService } from './maker-settings.service';

type Waveform = OscillatorType;

interface Tone {
  readonly from: number;
  /** Frequência final; igual à inicial quando o tom não desliza. */
  readonly to: number;
  readonly delay: number;
  readonly duration: number;
  readonly wave: Waveform;
  readonly gain: number;
}

interface Cue {
  readonly tones: readonly Tone[];
  /** Estalo de ruído, para batidas e quebras. */
  readonly noise?: { readonly duration: number; readonly gain: number };
}

const tone = (from: number, delay: number, duration: number, wave: Waveform = 'triangle', gain = 0.16, to = from): Tone => ({
  from,
  to,
  delay,
  duration,
  wave,
  gain,
});

/**
 * Efeitos do Pedro Maker, compostos para o jogo.
 *
 * Nenhum desce de tom — a mesma regra dos sons do site: tom que desce soa como
 * erro, e aqui errar faz parte da brincadeira. Até o dano é um "tum" curto e
 * neutro, sem tristeza.
 */
const CUES: Readonly<Record<MakerSoundCue, Cue>> = {
  jump: { tones: [tone(330, 0, 0.14, 'square', 0.06, 620)] },
  coin: { tones: [tone(880, 0, 0.06), tone(1175, 0.05, 0.06), tone(1760, 0.1, 0.12, 'sine')] },
  crystal: {
    tones: [tone(1047, 0, 0.1, 'sine'), tone(1319, 0.07, 0.1, 'sine'), tone(1568, 0.14, 0.1, 'sine'), tone(2093, 0.21, 0.3, 'sine')],
  },
  damage: { tones: [tone(196, 0, 0.18, 'sine', 0.22)], noise: { duration: 0.08, gain: 0.08 } },
  enemyHit: { tones: [tone(520, 0, 0.09, 'sine', 0.18, 780)], noise: { duration: 0.05, gain: 0.06 } },
  checkpoint: { tones: [tone(784, 0, 0.1), tone(988, 0.09, 0.1), tone(1175, 0.18, 0.24, 'sine')] },
  powerup: { tones: [tone(392, 0, 0.36, 'triangle', 0.14, 1318)] },
  victory: {
    tones: [
      tone(523, 0, 0.14),
      tone(659, 0.13, 0.14),
      tone(784, 0.26, 0.14),
      tone(1047, 0.39, 0.22),
      tone(784, 0.6, 0.1),
      tone(1047, 0.7, 0.5, 'sine', 0.2),
    ],
  },
  boss: { tones: [tone(110, 0, 0.16, 'square', 0.08), tone(110, 0.22, 0.2, 'square', 0.08)], noise: { duration: 0.12, gain: 0.07 } },
  button: { tones: [tone(660, 0, 0.05, 'sine', 0.1)] },
  spring: { tones: [tone(250, 0, 0.22, 'sine', 0.18, 900)] },
  break: { tones: [tone(300, 0, 0.06, 'square', 0.05, 420)], noise: { duration: 0.14, gain: 0.12 } },
  secret: {
    tones: [tone(659, 0, 0.2, 'sine'), tone(831, 0.18, 0.2, 'sine'), tone(988, 0.36, 0.2, 'sine'), tone(1319, 0.54, 0.5, 'sine')],
  },
  fireball: { tones: [tone(440, 0, 0.09, 'square', 0.05, 990)], noise: { duration: 0.05, gain: 0.04 } },
  iceball: { tones: [tone(1320, 0, 0.08, 'sine', 0.08, 1760), tone(1760, 0.05, 0.08, 'sine', 0.06)] },
  freeze: { tones: [tone(1568, 0, 0.12, 'triangle', 0.1, 784), tone(2093, 0.08, 0.18, 'sine', 0.06)], noise: { duration: 0.08, gain: 0.03 } },
  slide: { tones: [tone(880, 0, 0.5, 'sine', 0.12, 330)] },
  tailSpin: { tones: [tone(300, 0, 0.16, 'triangle', 0.1, 700)], noise: { duration: 0.1, gain: 0.05 } },
  bubble: { tones: [tone(520, 0, 0.12, 'sine', 0.09, 1040), tone(780, 0.06, 0.1, 'sine', 0.06, 1300)] },
  explosion: { tones: [tone(150, 0, 0.42, 'sawtooth', 0.12, 45)], noise: { duration: 0.38, gain: 0.14 } },
};

/** Escala pentatônica maior: qualquer combinação dessas notas soa bem. */
const PENTATONIC = [0, 2, 4, 7, 9] as const;

const THEME_ROOTS: Readonly<Record<LevelTheme, number>> = {
  vale: 60,
  floresta: 62,
  caverna: 57,
  deserto: 58,
  gelo: 64,
  vulcao: 55,
  estrelas: 65,
  castelo: 53,
  'castelo-rei-slime': 52,
  // Meio tom acima do deserto: o mesmo clima, um pouco mais tenso no castelo.
  'castelo-rei-cacto': 59,
  praia: 61,
  classico: 60,
  // Mais grave que o vale, como a caverna: misterioso sem ficar triste.
  'dia-das-bruxas': 57,
};

/** Dó central, até a primeira trilha dizer o tom. */
const DEFAULT_NOTE_ROOT = 60;
/** A nota mais aguda do bloco musical: duas oitavas acima da mais grave. */
const MAX_NOTE_DEGREE = 9;

const MUSIC_TEMPO_BPM = 112;
const STEPS_PER_BAR = 16;
const MUSIC_GAIN = 0.045;
const SCHEDULE_AHEAD_SECONDS = 0.25;
const SCHEDULER_INTERVAL_MS = 90;

interface MusicStep {
  readonly melody: number | null;
  readonly bass: number | null;
}

/**
 * Som do Pedro Maker: efeitos e trilha, todos sintetizados na hora.
 *
 * Nenhum arquivo de áudio é baixado — não existe asset que possa falhar — e a
 * trilha de cada tema é composta por semente, sempre a mesma para o mesmo
 * tema. O modo calmo do site cala tudo, acima de qualquer preferência.
 */
@Injectable({ providedIn: 'root' })
export class MakerAudioService {
  private readonly settings = inject(MakerSettingsService);
  private readonly calmMode = inject(CalmModeService);

  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicPattern: readonly MusicStep[] = [];
  private nextStepTime = 0;
  private stepIndex = 0;
  /** Tônica do tema em jogo: as notas do bloco musical ficam no tom da trilha. */
  private noteRoot = DEFAULT_NOTE_ROOT;

  private readonly canPlaySounds = computed(() => this.settings.settings().sounds && !this.calmMode.isEnabled());
  private readonly canPlayMusic = computed(() => this.settings.settings().music && !this.calmMode.isEnabled());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopMusic());
  }

  play(cue: MakerSoundCue): void {
    if (!this.canPlaySounds()) {
      return;
    }

    const context = this.resolveContext();

    if (!context) {
      return;
    }

    const definition = CUES[cue];

    for (const note of definition.tones) {
      playTone(context, context.destination, note);
    }

    if (definition.noise) {
      playNoise(context, definition.noise.duration, definition.noise.gain);
    }
  }

  /** Uma nota do bloco musical: um sino curto, na escala da trilha do tema, uma oitava acima dela. */
  playNote(degree: number): void {
    if (!this.canPlaySounds() || !Number.isFinite(degree)) {
      return;
    }

    const context = this.resolveContext();

    if (!context) {
      return;
    }

    const step = Math.min(MAX_NOTE_DEGREE, Math.max(0, Math.round(degree)));
    const frequency = midiToHertz(this.noteRoot + 12 + scaleNote(step));

    playTone(context, context.destination, tone(frequency, 0, 0.42, 'sine', 0.18));
    playTone(context, context.destination, tone(frequency * 2, 0, 0.16, 'triangle', 0.05));
  }

  /** Começa a trilha do tema. Chamar de novo troca de trilha sem sobrepor. */
  startMusic(theme: LevelTheme): void {
    this.stopMusic();
    this.noteRoot = THEME_ROOTS[theme];

    if (!this.canPlayMusic()) {
      return;
    }

    const context = this.resolveContext();

    if (!context) {
      return;
    }

    this.musicGain = context.createGain();
    this.musicGain.gain.value = MUSIC_GAIN;
    this.musicGain.connect(context.destination);
    this.musicPattern = composePattern(theme);
    this.stepIndex = 0;
    this.nextStepTime = context.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(), SCHEDULER_INTERVAL_MS);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    this.musicGain?.disconnect();
    this.musicGain = null;
  }

  /**
   * Agenda as notas dos próximos instantes no relógio do áudio.
   *
   * O `setInterval` só acorda o agendador; quem garante o ritmo exato é o
   * relógio do `AudioContext`, que não atrasa quando a página engasga.
   */
  private scheduleMusic(): void {
    const context = this.context;
    const output = this.musicGain;

    if (!context || !output || this.musicPattern.length === 0) {
      return;
    }

    const stepDuration = 60 / MUSIC_TEMPO_BPM / 4;

    while (this.nextStepTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const step = this.musicPattern[this.stepIndex % this.musicPattern.length];
      const delay = this.nextStepTime - context.currentTime;

      if (step.melody !== null) {
        playTone(context, output, tone(midiToHertz(step.melody), Math.max(0, delay), stepDuration * 1.8, 'triangle', 1));
      }

      if (step.bass !== null) {
        playTone(context, output, tone(midiToHertz(step.bass), Math.max(0, delay), stepDuration * 3.5, 'sine', 1.4));
      }

      this.nextStepTime += stepDuration;
      this.stepIndex += 1;
    }
  }

  private resolveContext(): AudioContext | null {
    if (this.context) {
      // O navegador suspende o contexto quando a aba perde o foco.
      void this.context.resume().catch(() => undefined);

      return this.context;
    }

    if (typeof AudioContext !== 'function') {
      return null;
    }

    try {
      this.context = new AudioContext();
    } catch (error) {
      console.warn('Pedro Maker: áudio indisponível neste aparelho.', error);

      return null;
    }

    return this.context;
  }
}

/** Quatro compassos de melodia e baixo, compostos a partir do tema. */
function composePattern(theme: LevelTheme): readonly MusicStep[] {
  const random = new SeededRandom(seedFromText(`musica:${theme}`));
  const root = THEME_ROOTS[theme];
  const bars = 4;
  const chordDegrees = [0, 3, 4, 3] as const;
  let degree = 2;

  return Array.from({ length: bars * STEPS_PER_BAR }, (_, index) => {
    const bar = Math.floor(index / STEPS_PER_BAR);
    const beat = index % STEPS_PER_BAR;
    const playsMelody = beat % 2 === 0 ? random.chance(0.8) : random.chance(0.2);

    degree = Math.min(9, Math.max(0, degree + random.integer(-2, 2)));

    const melody = playsMelody ? root + 12 + scaleNote(degree) : null;
    const bass = beat % 8 === 0 ? root - 12 + scaleNote(chordDegrees[bar]) : null;

    return { melody, bass };
  });
}

function scaleNote(degree: number): number {
  const octave = Math.floor(degree / PENTATONIC.length);

  return octave * 12 + PENTATONIC[degree % PENTATONIC.length];
}

function midiToHertz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** Uma nota com ataque e queda suaves: sem a rampa, o oscilador estala. */
function playTone(context: AudioContext, output: AudioNode, note: Tone): void {
  const startAt = context.currentTime + note.delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = note.wave;
  oscillator.frequency.setValueAtTime(note.from, startAt);

  if (note.to !== note.from) {
    oscillator.frequency.exponentialRampToValueAtTime(note.to, startAt + note.duration);
  }

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(note.gain, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);

  oscillator.connect(gain).connect(output);
  oscillator.start(startAt);
  oscillator.stop(startAt + note.duration + 0.02);
}

function playNoise(context: AudioContext, duration: number, peak: number): void {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);

  for (let index = 0; index < length; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }

  const source = context.createBufferSource();
  const gain = context.createGain();

  source.buffer = buffer;
  gain.gain.value = peak;
  source.connect(gain).connect(context.destination);
  source.start();
}
