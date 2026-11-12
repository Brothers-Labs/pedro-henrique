/**
 * O que os modos de jogo contam para a tela: os acontecimentos de cada passo
 * (para tocar um som ou mostrar um aviso) e o resultado final da partida.
 */

export type GameEvent =
  | 'countdown'
  | 'start'
  | 'jump'
  | 'bounce'
  | 'coin'
  | 'stomp'
  | 'hurt'
  | 'checkpoint'
  | 'finish'
  | 'fall';

export interface AdventureResult {
  readonly mode: 'aventura';
  readonly isVictory: boolean;
  readonly coins: number;
  readonly totalCoins: number;
  /** De uma a três quando o Pedro chega; zero quando as vidas acabam. */
  readonly stars: number;
}

export interface BounceResult {
  readonly mode: 'pula-pula';
  readonly heightMeters: number;
}

export interface RaceResult {
  readonly mode: 'corrida';
  /** Colocação do Pedro, começando em 1. */
  readonly placement: number;
  readonly runners: number;
  readonly timeMs: number;
}

export type SceneResult = AdventureResult | BounceResult | RaceResult;

export interface HudEntry {
  readonly id: string;
  readonly emoji: string;
  readonly label: string;
  readonly value: string;
}
