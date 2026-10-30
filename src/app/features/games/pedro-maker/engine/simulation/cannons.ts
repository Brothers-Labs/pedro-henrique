import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import type { Enemy } from './enemy';

export const CANNON_RELOAD_MS = 2400;

interface Cannon {
  readonly x: number;
  readonly y: number;
  nextShotAt: number;
  bullet: Enemy | null;
}

/** Cada canhão mantém no máximo uma bala em voo, inclusive longe da câmera. */
export class CannonSystem {
  private readonly cannons: Cannon[];

  constructor(objects: readonly LevelObject[]) {
    this.cannons = objects.filter((object) => object.type === 'cannon')
      .map((object) => ({ x: object.x, y: object.y, nextShotAt: 0, bullet: null }));
  }

  update(now: number, targetX: number, shoot: (cellX: number, cellY: number, direction: 1 | -1) => Enemy): void {
    for (const cannon of this.cannons) {
      const x = (cannon.x + 0.5) * TILE_SIZE;
      if (Math.abs(targetX - x) > 1000 || now < cannon.nextShotAt || (cannon.bullet && !cannon.bullet.isDefeated)) continue;
      const direction = targetX >= x ? 1 : -1;
      cannon.bullet = shoot(cannon.x + direction, cannon.y, direction);
      cannon.nextShotAt = now + CANNON_RELOAD_MS;
    }
  }
}
