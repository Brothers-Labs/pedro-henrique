import { inject, Injectable, signal } from '@angular/core';

import { CalmModeService } from '../../../../core/services/calm-mode.service';
import { isHeroId } from '../../pedro-maker/config/hero.config';
import {
  type CraftButtonSize,
  type CraftDifficulty,
  type CraftPlayerCount,
  type CraftSettings,
  type CraftTouchMode,
  LOOK_SENSITIVITY_RANGE,
} from '../models/craft-settings.model';

const STORAGE_KEY = 'pedro-henrique:pedro-craft:settings:v1';

const TOUCH_MODES: readonly CraftTouchMode[] = ['automatico', 'sempre', 'nunca'];
const BUTTON_SIZES: readonly CraftButtonSize[] = ['normal', 'grande'];
const DIFFICULTIES: readonly CraftDifficulty[] = ['facil', 'normal'];
const PLAYER_COUNTS: readonly CraftPlayerCount[] = [1, 2, 3];

/**
 * Preferências do PedroCraft, guardadas no aparelho.
 *
 * Ficam separadas dos mundos de propósito: apagar um mundo não desliga o
 * Modo Paz que alguém escolheu. Quem nunca escolheu herda o modo calmo do
 * site — com ele ligado, o jogo começa sem inimigos.
 */
@Injectable({ providedIn: 'root' })
export class CraftSettingsService {
  private readonly calmMode = inject(CalmModeService);
  private readonly state = signal<CraftSettings>(loadSettings(this.calmMode.isEnabled()));

  readonly settings = this.state.asReadonly();

  update(changes: Partial<CraftSettings>): void {
    this.state.update((current) => sanitize({ ...current, ...changes }, current));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch (error) {
      console.warn('PedroCraft: não foi possível gravar as configurações.', error);
    }
  }
}

function defaults(isCalm: boolean): CraftSettings {
  return {
    peaceful: isCalm,
    difficulty: 'normal',
    lookSensitivity: 1,
    autoJump: true,
    touchControls: 'automatico',
    buttonSize: 'normal',
    readAloud: false,
    hasSeenFirstSteps: false,
    players: 1,
    hero: 'pedro',
    partnerHero: 'gui',
    // Um terceiro herói diferente dos outros dois: as três crianças se reconhecem logo na tela.
    thirdHero: 'mario',
  };
}

function loadSettings(isCalm: boolean): CraftSettings {
  const fallback = defaults(isCalm);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? sanitize(JSON.parse(raw) as unknown, fallback) : fallback;
  } catch {
    // Preferência ilegível não vale um aviso: o padrão serve perfeitamente.
    return fallback;
  }
}

/** Aceita só o que tem o tipo certo; o resto volta ao valor de antes. */
export function sanitize(value: unknown, fallback: CraftSettings): CraftSettings {
  if (typeof value !== 'object' || value === null) {
    return fallback;
  }

  const stored = value as Partial<Record<keyof CraftSettings, unknown>>;
  const sensitivity = typeof stored.lookSensitivity === 'number' && Number.isFinite(stored.lookSensitivity) ? stored.lookSensitivity : null;

  return {
    peaceful: typeof stored.peaceful === 'boolean' ? stored.peaceful : fallback.peaceful,
    difficulty: DIFFICULTIES.find((difficulty) => difficulty === stored.difficulty) ?? fallback.difficulty,
    lookSensitivity:
      sensitivity === null
        ? fallback.lookSensitivity
        : Math.min(LOOK_SENSITIVITY_RANGE.max, Math.max(LOOK_SENSITIVITY_RANGE.min, sensitivity)),
    autoJump: typeof stored.autoJump === 'boolean' ? stored.autoJump : fallback.autoJump,
    touchControls: TOUCH_MODES.find((mode) => mode === stored.touchControls) ?? fallback.touchControls,
    buttonSize: BUTTON_SIZES.find((size) => size === stored.buttonSize) ?? fallback.buttonSize,
    readAloud: typeof stored.readAloud === 'boolean' ? stored.readAloud : fallback.readAloud,
    hasSeenFirstSteps: typeof stored.hasSeenFirstSteps === 'boolean' ? stored.hasSeenFirstSteps : fallback.hasSeenFirstSteps,
    players: PLAYER_COUNTS.find((count) => count === stored.players) ?? fallback.players,
    hero: isHeroId(stored.hero) ? stored.hero : fallback.hero,
    partnerHero: isHeroId(stored.partnerHero) ? stored.partnerHero : fallback.partnerHero,
    // Preferências de antes do Jogador 3 não têm este campo: vale o herói padrão.
    thirdHero: isHeroId(stored.thirdHero) ? stored.thirdHero : fallback.thirdHero,
  };
}
