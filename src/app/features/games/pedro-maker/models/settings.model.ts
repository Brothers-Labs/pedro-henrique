import type { ScreenMode } from '../config/screen.config';
import type { HeroId } from './progress.model';

export type MakerDifficulty = 'tranquilo' | 'aventura' | 'desafio';

/** Quantas crianças jogam juntas na mesma tela, como no Pedro Craft. */
export type MakerPlayerCount = 1 | 2 | 3;

export const MAKER_PLAYER_COUNTS: readonly MakerPlayerCount[] = [1, 2, 3];

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
  /** 1 sozinho; 2 e 3 jogam juntos, na mesma tela. */
  readonly players: MakerPlayerCount;
  /** Herói do Jogador 2. O do Jogador 1 é o de "Meu personagem". */
  readonly partnerHero: HeroId;
  /** Herói do Jogador 3. */
  readonly thirdHero: HeroId;
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
