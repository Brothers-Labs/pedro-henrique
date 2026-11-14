import type { ScreenMode } from '../config/screen.config';

export type MakerDifficulty = 'tranquilo' | 'aventura' | 'desafio';

/** Quando mostrar os botões de toque durante a fase. */
export type TouchControlsMode = 'automatico' | 'sempre' | 'nunca';

export interface MakerSettings {
  readonly sounds: boolean;
  readonly music: boolean;
  readonly vibration: boolean;
  readonly effects: boolean;
  readonly touchControls: TouchControlsMode;
  readonly difficulty: MakerDifficulty;
  /** Cara do quadro do jogo: retrô, 3D, HD ou 4K. */
  readonly screen: ScreenMode;
}

/** Regras concretas de cada dificuldade. Nenhuma delas pune de verdade. */
export interface DifficultyRules {
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
  readonly hearts: number;
  readonly enemySpeed: number;
  readonly invincibilityMs: number;
}
