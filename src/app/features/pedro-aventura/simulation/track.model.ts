import type { ObstacleKind } from '../models/campaign.model';

/**
 * Pista pronta para correr: tudo o que a simulação e a cena 3D precisam.
 *
 * O eixo `z` é a distância percorrida em metros (0 na largada); `x` é o lado
 * (faixa da esquerda negativa); `y` é a altura a partir do chão.
 */

export type Lane = -1 | 0 | 1;

export const LANES: readonly Lane[] = [-1, 0, 1];

/** Distância entre o centro de duas faixas, em metros. */
export const LANE_WIDTH = 2.4;

export interface ObstacleSpec {
  readonly id: number;
  readonly kind: ObstacleKind;
  readonly lane: Lane;
  readonly z: number;
}

/**
 * O que se pega na pista.
 *
 * - `coin`: 1 moeda; `gold-bar`: 10 moedas; `diamond`: 1 diamante.
 * - `heart`: +1 coração; `crown`: item especial (3 por fase).
 * - `turbo`: alguns segundos de supervelocidade atravessando obstáculos.
 */
export type PickupKind = 'coin' | 'gold-bar' | 'diamond' | 'heart' | 'crown' | 'turbo';

export interface PickupSpec {
  readonly id: number;
  readonly kind: PickupKind;
  readonly lane: Lane;
  readonly z: number;
  readonly y: number;
}

export interface RampSpec {
  readonly id: number;
  readonly lane: Lane;
  readonly z: number;
}

export interface TrackLayout {
  readonly levelId: string;
  readonly length: number;
  readonly checkpoints: readonly number[];
  readonly obstacles: readonly ObstacleSpec[];
  readonly pickups: readonly PickupSpec[];
  readonly ramps: readonly RampSpec[];
  readonly totals: {
    readonly coins: number;
    readonly goldBars: number;
    readonly diamonds: number;
    readonly hearts: number;
    readonly crowns: number;
    readonly turbos: number;
    readonly ramps: number;
  };
}

/** Caixa de colisão de cada obstáculo. `bottom` é a altura onde ele começa. */
export interface ObstacleSize {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly bottom: number;
}

export const OBSTACLE_SIZE: Readonly<Record<ObstacleKind, ObstacleSize>> = {
  barrier: { width: 2.0, height: 1.0, depth: 0.5, bottom: 0 },
  'high-bar': { width: 2.2, height: 0.5, depth: 0.4, bottom: 1.15 },
  crate: { width: 1.3, height: 1.3, depth: 1.3, bottom: 0 },
  cone: { width: 0.7, height: 0.8, depth: 0.7, bottom: 0 },
  'parked-car': { width: 2.0, height: 1.6, depth: 4.2, bottom: 0 },
  'traffic-car': { width: 2.0, height: 1.6, depth: 4.2, bottom: 0 },
  sweeper: { width: 1.8, height: 1.0, depth: 0.6, bottom: 0 },
  banana: { width: 0.7, height: 0.25, depth: 0.6, bottom: 0 },
  animal: { width: 0.9, height: 0.8, depth: 0.9, bottom: 0 },
};

/** Comprimento da rampa e altura da ponta. */
export const RAMP_SIZE = { length: 3.2, height: 0.9, width: 2.0 } as const;

/**
 * Posição lateral da faixa no mundo 3D.
 *
 * A câmera olha para +z, e nesse referencial o x positivo aparece à esquerda
 * da tela. O sinal invertido é o que faz a faixa -1 ficar à esquerda de quem
 * joga: apertar "esquerda" leva o Pedro para a esquerda da tela.
 */
export function laneX(lane: Lane): number {
  return -lane * LANE_WIDTH;
}
