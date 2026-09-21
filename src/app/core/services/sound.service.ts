import { computed, inject, Injectable, signal } from '@angular/core';

import { CalmModeService } from './calm-mode.service';

const STORAGE_KEY = 'pedro-henrique:sound';
const ENABLED_VALUE = 'on';
const DISABLED_VALUE = 'off';

/** Intervalo mínimo entre dois sons, para nenhuma sequência virar barulho. */
const MIN_INTERVAL_IN_MS = 320;

/** Volume de pico de cada nota. Baixo de propósito: é um detalhe, não um alarme. */
const PEAK_GAIN = 0.12;

/** Efeitos sonoros disponíveis. */
export type SoundCue = 'xp' | 'nivel' | 'evolucao' | 'conquista' | 'carinho' | 'item';

interface Note {
  /** Frequência em hertz. */
  readonly hertz: number;
  /** Atraso em relação ao início do efeito, em segundos. */
  readonly delay: number;
  readonly duration: number;
}

/**
 * Melodias curtas, em notas da escala maior.
 *
 * Todas sobem: nenhum som do site desce de tom, porque tom que desce soa como
 * erro — e aqui não existe erro que mereça trilha triste.
 */
const CUES: Readonly<Record<SoundCue, readonly Note[]>> = {
  xp: [{ hertz: 880, delay: 0, duration: 0.12 }],
  nivel: [
    { hertz: 659, delay: 0, duration: 0.14 },
    { hertz: 880, delay: 0.12, duration: 0.2 },
  ],
  evolucao: [
    { hertz: 523, delay: 0, duration: 0.16 },
    { hertz: 659, delay: 0.14, duration: 0.16 },
    { hertz: 784, delay: 0.28, duration: 0.16 },
    { hertz: 1047, delay: 0.42, duration: 0.34 },
  ],
  conquista: [
    { hertz: 784, delay: 0, duration: 0.14 },
    { hertz: 1047, delay: 0.13, duration: 0.24 },
  ],
  carinho: [
    { hertz: 698, delay: 0, duration: 0.1 },
    { hertz: 880, delay: 0.09, duration: 0.14 },
  ],
  item: [
    { hertz: 587, delay: 0, duration: 0.1 },
    { hertz: 880, delay: 0.1, duration: 0.18 },
  ],
};

/**
 * Efeitos sonoros do site.
 *
 * As notas são sintetizadas na hora, sem nenhum arquivo de áudio: o som sai
 * junto com o toque, não depende de download e não pesa no carregamento.
 *
 * O modo calmo cala tudo, e quem preferir silêncio pode desligar o som por
 * conta própria — a escolha fica guardada no aparelho. O contexto de áudio só
 * nasce no primeiro toque, que é o que os navegadores exigem para tocar algo.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly calmMode = inject(CalmModeService);
  private readonly preference = signal(readStoredPreference());

  private context: AudioContext | null = null;
  private lastPlayedAt = 0;

  /** Preferência da pessoa, independente do modo calmo. */
  readonly isEnabled = this.preference.asReadonly();

  /** Se algum som pode tocar agora. O modo calmo vence a preferência. */
  readonly isAudible = computed(() => this.preference() && !this.calmMode.isEnabled());

  toggle(): void {
    const next = !this.preference();

    this.preference.set(next);

    try {
      localStorage.setItem(STORAGE_KEY, next ? ENABLED_VALUE : DISABLED_VALUE);
    } catch {
      // Navegador em modo privado: a escolha vale só para a sessão atual.
    }
  }

  /**
   * Toca um efeito. Silencioso e seguro quando o navegador não tem áudio.
   *
   * Sons colados uns nos outros são ignorados: dois avisos no mesmo instante
   * viram um só, em vez de uma salva de bipes.
   */
  play(cue: SoundCue): void {
    if (!this.isAudible()) {
      return;
    }

    const now = performance.now();

    if (now - this.lastPlayedAt < MIN_INTERVAL_IN_MS) {
      return;
    }

    const context = this.resolveContext();

    if (!context) {
      return;
    }

    this.lastPlayedAt = now;

    for (const note of CUES[cue]) {
      playNote(context, note);
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
    } catch {
      // Sem permissão ou sem saída de áudio: o site continua igual, mudo.
      return null;
    }

    return this.context;
  }
}

/**
 * Uma nota com ataque e queda suaves.
 *
 * A rampa de volume não é enfeite: sem ela, ligar e desligar o oscilador
 * produz um estalo audível em qualquer aparelho.
 */
function playNote(context: AudioContext, note: Note): void {
  const startAt = context.currentTime + note.delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(note.hertz, startAt);

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + note.duration + 0.02);
}

function readStoredPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== DISABLED_VALUE;
  } catch {
    return true;
  }
}
