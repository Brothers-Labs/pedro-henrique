import { DestroyRef, inject, Injectable, signal } from '@angular/core';

const SPEECH_LANGUAGE = 'pt-BR';
const LANGUAGE_PREFIX = 'pt';

export const DEFAULT_SPEECH_RATE = 1;
/** Velocidade reduzida usada quando o modo calmo está ligado. */
export const CALM_SPEECH_RATE = 0.85;

export interface SpeakOptions {
  readonly rate?: number;
}

/**
 * Voz do site, sobre a Web Speech API do próprio navegador.
 *
 * É o que faz a prancha de comunicação funcionar sem backend e sem áudio
 * gravado. Navegadores sem suporte simplesmente não falam: quem usa a prancha
 * ainda monta e enxerga a frase, então a página nunca fica inutilizável.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly synthesis = readSynthesis();
  private readonly speakingState = signal(false);
  private voice: SpeechSynthesisVoice | null = null;

  readonly isSupported = this.synthesis !== null;
  readonly isSpeaking = this.speakingState.asReadonly();

  constructor() {
    const synthesis = this.synthesis;

    if (!synthesis) {
      return;
    }

    // A lista de vozes costuma chegar depois do primeiro acesso, e em alguns
    // navegadores só depois do evento.
    this.selectVoice();
    synthesis.addEventListener('voiceschanged', this.selectVoice);

    inject(DestroyRef).onDestroy(() => {
      synthesis.removeEventListener('voiceschanged', this.selectVoice);
      this.stop();
    });
  }

  speak(text: string, options: SpeakOptions = {}): void {
    const content = text.trim();

    if (!this.synthesis || !content) {
      return;
    }

    // Cada toque interrompe o anterior: numa prancha, a fala mais recente é
    // sempre a que a criança quis dizer.
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = SPEECH_LANGUAGE;
    utterance.rate = options.rate ?? DEFAULT_SPEECH_RATE;

    if (this.voice) {
      utterance.voice = this.voice;
    }

    utterance.addEventListener('start', () => this.speakingState.set(true));
    utterance.addEventListener('end', () => this.speakingState.set(false));
    utterance.addEventListener('error', () => this.speakingState.set(false));

    this.synthesis.speak(utterance);
  }

  stop(): void {
    this.synthesis?.cancel();
    this.speakingState.set(false);
  }

  /**
   * Escolhe a melhor voz em português disponível no dispositivo.
   * Arrow function para manter a mesma referência no add/removeEventListener.
   */
  private readonly selectVoice = (): void => {
    const voices = this.synthesis?.getVoices() ?? [];

    this.voice =
      voices.find((voice) => voice.lang.replace('_', '-') === SPEECH_LANGUAGE) ??
      voices.find((voice) => voice.lang.startsWith(LANGUAGE_PREFIX)) ??
      null;
  };
}

function readSynthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}
