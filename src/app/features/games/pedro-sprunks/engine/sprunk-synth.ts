import type { SprunkVoice } from '../models/sprunk.model';

/** Dó central (C4), a partir do qual as notas do catálogo são contadas. */
const MIDDLE_C_HERTZ = 261.63;

/**
 * Tudo o que um timbre precisa para tocar: o contexto, a saída (o volume geral
 * da banda) e um buffer de ruído branco reaproveitado por todas as batidas.
 */
export interface SynthTarget {
  readonly context: BaseAudioContext;
  readonly output: AudioNode;
  readonly noise: AudioBuffer;
}

export function semitonesToHertz(semitones: number): number {
  return MIDDLE_C_HERTZ * 2 ** (semitones / 12);
}

/** Um segundo de ruído branco: dá para batidas, chocalho e a corrente. */
export function createNoiseBuffer(context: BaseAudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = buffer.getChannelData(0);

  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

type VoicePlayer = (target: SynthTarget, hertz: number, startAt: number) => void;

/**
 * Cada timbre é uma receita curta de osciladores, ruído e filtros.
 *
 * Nenhum arquivo de áudio é baixado: o som nasce no aparelho, no instante do
 * toque, e não existe asset que possa falhar ou demorar.
 */
const VOICES: Readonly<Record<SprunkVoice, VoicePlayer>> = {
  kick: (target, _hertz, startAt) => tone(target, { wave: 'sine', from: 150, to: 45, startAt, duration: 0.3, peak: 0.9 }),
  snare: (target, _hertz, startAt) => {
    burst(target, { filter: 'bandpass', frequency: 1800, startAt, duration: 0.18, peak: 0.5 });
    tone(target, { wave: 'triangle', from: 190, to: 160, startAt, duration: 0.1, peak: 0.3 });
  },
  hat: (target, _hertz, startAt) => burst(target, { filter: 'highpass', frequency: 7000, startAt, duration: 0.05, peak: 0.25 }),
  // O prato é um chimbal que fica soando: o mesmo chiado agudo, só que longo.
  cymbal: (target, _hertz, startAt) => burst(target, { filter: 'highpass', frequency: 6000, startAt, duration: 0.7, peak: 0.18 }),
  clap: (target, _hertz, startAt) => {
    for (const offset of [0, 0.012, 0.024]) {
      burst(target, { filter: 'bandpass', frequency: 1200, startAt: startAt + offset, duration: 0.09, peak: 0.4 });
    }
  },
  tom: (target, _hertz, startAt) => tone(target, { wave: 'sine', from: 220, to: 110, startAt, duration: 0.25, peak: 0.6 }),
  shaker: (target, _hertz, startAt) => burst(target, { filter: 'highpass', frequency: 5000, startAt, duration: 0.07, peak: 0.18 }),
  chain: (target, _hertz, startAt) => {
    // Elos batendo: estalos metálicos curtos, cada um um pouco mais agudo.
    for (const [index, offset] of [0, 0.035, 0.07].entries()) {
      burst(target, { filter: 'bandpass', frequency: 3200 + index * 900, q: 12, startAt: startAt + offset, duration: 0.06, peak: 0.7 });
    }
  },
  blip: (target, hertz, startAt) => tone(target, { wave: 'square', from: hertz, to: hertz, startAt, duration: 0.08, peak: 0.12 }),
  boing: (target, _hertz, startAt) => tone(target, { wave: 'sine', from: 180, to: 720, startAt, duration: 0.32, peak: 0.45 }),
  whistle: (target, hertz, startAt) => tone(target, { wave: 'sine', from: hertz * 0.94, to: hertz, startAt, duration: 0.4, peak: 0.22 }),
  bass: (target, hertz, startAt) => tone(target, { wave: 'triangle', from: hertz, to: hertz, startAt, duration: 0.24, peak: 0.6 }),
  pluck: (target, hertz, startAt) => tone(target, { wave: 'triangle', from: hertz, to: hertz, startAt, duration: 0.22, peak: 0.35 }),
  lead: (target, hertz, startAt) =>
    tone(target, { wave: 'square', from: hertz, to: hertz, startAt, duration: 0.2, peak: 0.12, lowpass: 2400 }),
  bell: (target, hertz, startAt) => {
    tone(target, { wave: 'sine', from: hertz, to: hertz, startAt, duration: 0.9, peak: 0.25 });
    tone(target, { wave: 'sine', from: hertz * 2.76, to: hertz * 2.76, startAt, duration: 0.4, peak: 0.08 });
  },
  pad: (target, hertz, startAt) => {
    // Acorde maior (fundamental, terça, quinta) com uma leve desafinação que encorpa.
    for (const ratio of [1, 1.26, 1.5, 1.005]) {
      tone(target, { wave: 'sawtooth', from: hertz * ratio, to: hertz * ratio, startAt, duration: 1.4, peak: 0.05, attack: 0.25, lowpass: 1200 });
    }
  },
  flute: (target, hertz, startAt) =>
    tone(target, { wave: 'sine', from: hertz, to: hertz, startAt, duration: 0.32, peak: 0.25, attack: 0.04 }),
  'choir-ah': (target, hertz, startAt) => choir(target, hertz, startAt, [730, 1090]),
  'choir-oo': (target, hertz, startAt) => choir(target, hertz, startAt, [300, 870]),
};

export function playVoice(target: SynthTarget, voice: SprunkVoice, semitones: number, startAt: number): void {
  VOICES[voice](target, semitonesToHertz(semitones), startAt);
}

interface ToneOptions {
  readonly wave: OscillatorType;
  readonly from: number;
  /** Frequência final; igual à inicial quando o tom não desliza. */
  readonly to: number;
  readonly startAt: number;
  readonly duration: number;
  readonly peak: number;
  readonly attack?: number;
  readonly lowpass?: number;
}

/**
 * Uma nota com ataque e queda suaves.
 *
 * A rampa de volume não é enfeite: sem ela, ligar e desligar o oscilador
 * produz um estalo audível em qualquer aparelho.
 */
function tone(target: SynthTarget, options: ToneOptions): void {
  const { context } = target;
  const { startAt, duration } = options;
  const attack = options.attack ?? 0.01;
  const oscillator = context.createOscillator();

  oscillator.type = options.wave;
  oscillator.frequency.setValueAtTime(options.from, startAt);

  if (options.to !== options.from) {
    oscillator.frequency.exponentialRampToValueAtTime(options.to, startAt + duration);
  }

  const gain = envelope(context, startAt, attack, duration, options.peak);
  const filter = options.lowpass === undefined ? null : lowpass(context, options.lowpass);

  if (filter) {
    oscillator.connect(filter).connect(gain);
  } else {
    oscillator.connect(gain);
  }

  gain.connect(target.output);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.05);
}

interface BurstOptions {
  readonly filter: BiquadFilterType;
  readonly frequency: number;
  readonly q?: number;
  readonly startAt: number;
  readonly duration: number;
  readonly peak: number;
}

/** Um estalo de ruído filtrado: a base de toda batida sem altura definida. */
function burst(target: SynthTarget, options: BurstOptions): void {
  const { context } = target;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();

  source.buffer = target.noise;
  filter.type = options.filter;
  filter.frequency.value = options.frequency;
  filter.Q.value = options.q ?? 1;

  source
    .connect(filter)
    .connect(envelope(context, options.startAt, 0.002, options.duration, options.peak))
    .connect(target.output);
  source.start(options.startAt);
  source.stop(options.startAt + options.duration + 0.05);
}

/**
 * Uma voz cantando uma vogal: um timbre rico passa por dois filtros nas
 * frequências que fazem o ouvido reconhecer "a" ou "u".
 */
function choir(target: SynthTarget, hertz: number, startAt: number, formants: readonly number[]): void {
  const { context } = target;
  const duration = 0.6;
  const oscillator = context.createOscillator();
  const vibrato = context.createOscillator();
  const vibratoDepth = context.createGain();
  const gain = envelope(context, startAt, 0.08, duration, 0.5);

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(hertz, startAt);
  vibrato.frequency.value = 5.5;
  vibratoDepth.gain.value = hertz * 0.012;
  vibrato.connect(vibratoDepth).connect(oscillator.frequency);

  for (const frequency of formants) {
    const formant = context.createBiquadFilter();

    formant.type = 'bandpass';
    formant.frequency.value = frequency;
    formant.Q.value = 6;
    oscillator.connect(formant).connect(gain);
  }

  gain.connect(target.output);

  for (const source of [oscillator, vibrato]) {
    source.start(startAt);
    source.stop(startAt + duration + 0.05);
  }
}

function envelope(context: BaseAudioContext, startAt: number, attack: number, duration: number, peak: number): GainNode {
  const gain = context.createGain();

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.max(duration, attack + 0.01));

  return gain;
}

function lowpass(context: BaseAudioContext, frequency: number): BiquadFilterNode {
  const filter = context.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = frequency;

  return filter;
}
