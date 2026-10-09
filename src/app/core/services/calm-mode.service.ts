import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

import { AnalyticsService } from './analytics.service';

const STORAGE_KEY = 'pedro-henrique:calm-mode';
const DOCUMENT_ATTRIBUTE = 'data-calm';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const ENABLED_VALUE = 'on';
const DISABLED_VALUE = 'off';

/**
 * Traduz o valor cru do storage na preferência salva.
 *
 * Devolve `null` quando ninguém escolheu ainda, para que a decisão continue
 * sendo do sistema operacional em vez de assumir um padrão silencioso.
 */
export function parseCalmPreference(raw: string | null): boolean | null {
  if (raw === ENABLED_VALUE) {
    return true;
  }

  if (raw === DISABLED_VALUE) {
    return false;
  }

  return null;
}

/**
 * Modo calmo: reduz movimento, cores e contraste visual do site inteiro.
 *
 * O estado vive aqui e é publicado como o atributo `data-calm` no `<html>`,
 * de onde o CSS assume — assim nenhum componente precisa saber que o modo
 * existe para se adaptar a ele.
 *
 * Quem nunca escolheu herda a preferência do sistema (`prefers-reduced-motion`).
 * A partir da primeira escolha, ela é respeitada e guardada no dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class CalmModeService {
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);
  private readonly enabledState = signal(resolveInitialPreference());

  readonly isEnabled = this.enabledState.asReadonly();

  constructor() {
    effect(() => this.publishToDocument(this.enabledState()));
  }

  toggle(): void {
    this.setEnabled(!this.enabledState());
  }

  setEnabled(isEnabled: boolean): void {
    this.enabledState.set(isEnabled);
    this.persist(isEnabled);
    this.analytics.track({ name: 'calm_mode_changed', properties: { isEnabled } });
  }

  private publishToDocument(isEnabled: boolean): void {
    const root = this.document.documentElement;

    if (isEnabled) {
      root.setAttribute(DOCUMENT_ATTRIBUTE, ENABLED_VALUE);
      return;
    }

    root.removeAttribute(DOCUMENT_ATTRIBUTE);
  }

  private persist(isEnabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, isEnabled ? ENABLED_VALUE : DISABLED_VALUE);
    } catch {
      // Navegador em modo privado: a escolha vale só para a sessão atual.
    }
  }
}

function resolveInitialPreference(): boolean {
  return parseCalmPreference(readStoredPreference()) ?? prefersReducedMotion();
}

function readStoredPreference(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
}
