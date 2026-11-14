import { computed, Injectable, signal } from '@angular/core';

import { DEFAULT_SETTINGS, DIFFICULTY_ORDER, DIFFICULTY_RULES } from '../config/rules.config';
import { isScreenMode } from '../config/screen.config';
import type { MakerSettings, TouchControlsMode } from '../models/settings.model';

const STORAGE_KEY = 'pedro-henrique:pedro-maker:settings:v1';

const TOUCH_MODES: readonly TouchControlsMode[] = ['automatico', 'sempre', 'nunca'];

/**
 * Preferências do Pedro Maker, guardadas no aparelho.
 *
 * Ficam separadas do progresso de propósito: apagar a aventura para começar
 * de novo não deve desligar o som que alguém escolheu deixar desligado.
 */
@Injectable({ providedIn: 'root' })
export class MakerSettingsService {
  private readonly state = signal<MakerSettings>(loadSettings());

  readonly settings = this.state.asReadonly();
  readonly difficultyRules = computed(() => DIFFICULTY_RULES[this.state().difficulty]);

  update(changes: Partial<MakerSettings>): void {
    this.state.update((current) => ({ ...current, ...changes }));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch (error) {
      console.warn('Pedro Maker: não foi possível gravar as configurações.', error);
    }
  }

  toggle(key: 'sounds' | 'music' | 'vibration' | 'effects'): void {
    this.update({ [key]: !this.state()[key] });
  }
}

function loadSettings(): MakerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? sanitize(JSON.parse(raw) as unknown) : DEFAULT_SETTINGS;
  } catch {
    // Preferência ilegível não vale um aviso: o padrão serve perfeitamente.
    return DEFAULT_SETTINGS;
  }
}

function sanitize(value: unknown): MakerSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_SETTINGS;
  }

  const stored = value as Partial<MakerSettings>;

  return {
    sounds: flag(stored.sounds, DEFAULT_SETTINGS.sounds),
    music: flag(stored.music, DEFAULT_SETTINGS.music),
    vibration: flag(stored.vibration, DEFAULT_SETTINGS.vibration),
    effects: flag(stored.effects, DEFAULT_SETTINGS.effects),
    touchControls: TOUCH_MODES.find((mode) => mode === stored.touchControls) ?? DEFAULT_SETTINGS.touchControls,
    difficulty: DIFFICULTY_ORDER.find((level) => level === stored.difficulty) ?? DEFAULT_SETTINGS.difficulty,
    screen: isScreenMode(stored.screen) ? stored.screen : DEFAULT_SETTINGS.screen,
  };
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
