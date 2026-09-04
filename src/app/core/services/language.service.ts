import { Injectable, signal } from '@angular/core';

import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from '../models/language.model';

const STORAGE_KEY = 'pedro-henrique:idioma';
const ENGLISH_PREFIX = 'en';

/**
 * Decide em que idioma a prancha abre.
 *
 * A escolha salva vence sempre; sem ela, vale o idioma do navegador, e o
 * português é o padrão de casa. É função pura para que a regra possa ser
 * testada sem depender do navegador de teste.
 */
export function resolveLanguage(storedValue: string | null, browserLanguage: string): AppLanguage {
  if (isAppLanguage(storedValue)) {
    return storedValue;
  }

  return browserLanguage.toLowerCase().startsWith(ENGLISH_PREFIX) ? 'en-US' : DEFAULT_LANGUAGE;
}

/**
 * Idioma escolhido para a prancha de falar.
 *
 * Vive no núcleo, e não dentro da página, porque o idioma decide duas coisas
 * que moram em lugares diferentes: o texto que aparece nos cartões e a voz que
 * o navegador usa para falar. A escolha é guardada no dispositivo — quem abre
 * a prancha de novo encontra o idioma em que estava.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly currentState = signal(
    resolveLanguage(readStoredPreference(), readBrowserLanguage()),
  );

  readonly current = this.currentState.asReadonly();

  select(language: AppLanguage): void {
    this.currentState.set(language);
    this.persist(language);
  }

  private persist(language: AppLanguage): void {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Navegador em modo privado: a escolha vale só para a sessão atual.
    }
  }
}

function readStoredPreference(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readBrowserLanguage(): string {
  return typeof navigator !== 'undefined' ? navigator.language : '';
}
