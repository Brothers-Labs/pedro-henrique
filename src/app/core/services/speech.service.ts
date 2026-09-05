import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { AppLanguage } from '../models/language.model';

export const DEFAULT_SPEECH_RATE = 1;
/** Velocidade reduzida usada quando o modo calmo está ligado. */
export const CALM_SPEECH_RATE = 0.85;

export interface SpeakOptions {
  readonly language: AppLanguage;
  readonly rate?: number;
}

/**
 * Voz do site, sobre a Web Speech API do próprio navegador.
 *
 * É o que faz a prancha de comunicação funcionar sem backend e sem áudio
 * gravado. Navegadores sem suporte simplesmente não falam: quem usa a prancha
 * ainda monta e enxerga a frase, então a página nunca fica inutilizável.
 *
 * O idioma vem de quem chama, e não de uma configuração interna: é a mesma
 * frase que pode ser falada em português ou em inglês conforme o seletor da
 * tela, e o serviço não precisa saber que esse seletor existe.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly synthesis = readSynthesis();
  private readonly speakingState = signal(false);
  private readonly voicesState = signal<readonly SpeechSynthesisVoice[]>([]);

  readonly isSupported = this.synthesis !== null;
  readonly isSpeaking = this.speakingState.asReadonly();

  constructor() {
    const synthesis = this.synthesis;

    if (!synthesis) {
      return;
    }

    // A lista de vozes costuma chegar depois do primeiro acesso, e em alguns
    // navegadores só depois do evento.
    this.loadVoices();
    synthesis.addEventListener('voiceschanged', this.loadVoices);

    inject(DestroyRef).onDestroy(() => {
      synthesis.removeEventListener('voiceschanged', this.loadVoices);
      this.stop();
    });
  }

  speak(text: string, options: SpeakOptions): void {
    const content = text.trim();

    if (!this.synthesis || !content) {
      return;
    }

    // Cada toque interrompe o anterior: numa prancha, a fala mais recente é
    // sempre a que a criança quis dizer.
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = options.language;
    utterance.rate = options.rate ?? DEFAULT_SPEECH_RATE;

    const voice = findVoice(this.voicesState(), options.language);

    if (voice) {
      utterance.voice = voice;
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
   * Diz que o aparelho não tem nenhuma voz no idioma pedido.
   *
   * Enquanto a lista de vozes não chega, responde `false`: avisar que falta uma
   * voz sem ter como saber assustaria quem só está esperando o navegador
   * terminar de carregar.
   */
  isVoiceMissingFor(language: AppLanguage): boolean {
    const voices = this.voicesState();

    return voices.length > 0 && findVoice(voices, language) === null;
  }

  /** Arrow function para manter a mesma referência no add/removeEventListener. */
  private readonly loadVoices = (): void => {
    this.voicesState.set(this.synthesis?.getVoices() ?? []);
  };
}

/**
 * Melhor voz disponível para um idioma.
 *
 * A variante exata vem primeiro; depois qualquer voz da mesma língua, porque
 * um inglês britânico lendo inglês americano é muito melhor do que a voz
 * padrão do aparelho lendo inglês com sotaque português.
 */
function findVoice(
  voices: readonly SpeechSynthesisVoice[],
  language: AppLanguage,
): SpeechSynthesisVoice | null {
  const wanted = language.toLowerCase();
  const prefix = wanted.slice(0, 2);

  return (
    voices.find((voice) => normalizeLanguageTag(voice.lang) === wanted) ??
    voices.find((voice) => normalizeLanguageTag(voice.lang).startsWith(prefix)) ??
    null
  );
}

/** Alguns sistemas reportam `pt_BR` em vez de `pt-BR`. */
function normalizeLanguageTag(tag: string): string {
  return tag.replace('_', '-').toLowerCase();
}

function readSynthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}
