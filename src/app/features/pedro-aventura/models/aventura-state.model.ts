import type { Difficulty } from '../config/difficulty.config';
import type { PlayerLevelProgress } from './campaign.model';
import type { Inventory, MissionProgress, SeasonProgress, Wallet } from './economy.model';

export type QualityPreference = 'auto' | 'alta' | 'media' | 'baixa';
export type TouchControlsPreference = 'auto' | 'sempre' | 'nunca';

export interface AventuraSettings {
  readonly quality: QualityPreference;
  /** De 0 a 1. */
  readonly musicVolume: number;
  readonly effectsVolume: number;
  readonly touchControls: TouchControlsPreference;
  /** Dificuldade escolhida para as próximas partidas. */
  readonly difficulty: Difficulty;
}

/**
 * Resultado de uma partida, calculado pela simulação.
 *
 * É a única entrada da economia vinda do jogo: moedas, XP e missões saem
 * daqui, nunca de um número escolhido pela tela.
 */
export interface RunResult {
  /** Chave de idempotência da tentativa: o mesmo resultado nunca paga duas vezes. */
  readonly attemptId: string;
  readonly levelId: string;
  readonly difficulty: Difficulty;
  readonly isVictory: boolean;
  readonly timeMs: number;
  readonly coins: number;
  readonly hearts: number;
  readonly crowns: number;
  readonly ramps: number;
  readonly damageTaken: number;
  readonly score: number;
}

/** Tudo o que o Pedro Aventura guarda no aparelho. */
export interface AventuraState {
  readonly version: number;
  readonly createdAt: string;
  readonly wallet: Wallet;
  readonly levels: Readonly<Record<string, PlayerLevelProgress>>;
  /** Regiões já comemoradas como desbloqueadas, para a missão contar uma vez só. */
  readonly unlockedRegions: readonly string[];
  readonly seasons: Readonly<Record<string, SeasonProgress>>;
  readonly missions: Readonly<Record<string, MissionProgress>>;
  readonly inventory: Inventory;
  readonly settings: AventuraSettings;
  /** Tentativas já aplicadas, para recusar o mesmo resultado duas vezes. */
  readonly appliedAttempts: readonly string[];
}
