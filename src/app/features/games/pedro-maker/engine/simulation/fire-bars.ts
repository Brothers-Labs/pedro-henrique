import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import type { PhysicsBody } from './physics-body';

/**
 * Bastão de fogo: uma fila de bolas de fogo presa num bloco, girando em volta
 * dele como o ponteiro de um relógio. O curto tem 4 bolas; o comprido, 6.
 */
export const FIRE_BAR = {
  /** Raio de cada bola, em pixels: um pouco menor que o desenho, para o toque ser justo. */
  ballRadius: 10,
  /** Distância entre o centro de uma bola e o da seguinte. */
  spacing: 22,
  /** Uma volta a cada 4 segundos: dá para ver chegando e passar no vão. */
  turnsPerSecond: 0.25,
  shortLength: 4,
  longLength: 6,
  minLength: 2,
  maxLength: 8,
} as const;

export interface FireBar {
  /** Centro do bloco, em pixels do mundo. */
  readonly x: number;
  readonly y: number;
  /** Quantas bolas de fogo, contando a partir do bloco. */
  readonly length: number;
}

export interface FireBall {
  readonly x: number;
  readonly y: number;
}

/**
 * Os bastões de fogo da fase.
 *
 * Não têm estado: o ângulo sai do relógio da partida, então a pausa congela o
 * giro e o mesmo instante sempre mostra o mesmo desenho — na tela e no teste.
 */
export class FireBarSystem {
  readonly bars: readonly FireBar[];

  constructor(objects: readonly LevelObject[]) {
    this.bars = objects
      .filter((object) => object.type === 'fire-bar')
      .map((object) => ({
        x: (object.x + 0.5) * TILE_SIZE,
        y: (object.y + 0.5) * TILE_SIZE,
        length: clampLength(object.properties?.range ?? FIRE_BAR.shortLength),
      }));
  }

  /** Ângulo do bastão agora, em radianos; cresce no sentido do relógio (o y do mundo desce). */
  angleAt(now: number): number {
    return (now / 1000) * FIRE_BAR.turnsPerSecond * Math.PI * 2;
  }

  /** As bolas de um bastão neste instante, da mais perto do bloco à da ponta. */
  ballsOf(bar: FireBar, now: number): readonly FireBall[] {
    const angle = this.angleAt(now);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return Array.from({ length: bar.length }, (_, index) => {
      const distance = (index + 1) * FIRE_BAR.spacing;

      return { x: bar.x + cos * distance, y: bar.y + sin * distance };
    });
  }

  /** O bastão que está encostando no corpo agora; `null` se nenhum encosta. */
  touching(now: number, body: PhysicsBody): FireBar | null {
    return this.bars.find((bar) => this.ballsOf(bar, now).some((ball) => circleTouchesBox(ball, body))) ?? null;
  }
}

function clampLength(length: number): number {
  return Math.min(FIRE_BAR.maxLength, Math.max(FIRE_BAR.minLength, Math.round(length)));
}

function circleTouchesBox(ball: FireBall, body: PhysicsBody): boolean {
  const nearestX = Math.max(body.x, Math.min(ball.x, body.x + body.width));
  const nearestY = Math.max(body.y, Math.min(ball.y, body.y + body.height));

  return Math.hypot(ball.x - nearestX, ball.y - nearestY) < FIRE_BAR.ballRadius;
}
