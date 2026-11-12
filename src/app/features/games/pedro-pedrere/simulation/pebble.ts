import { PHYSICS } from '../config/physics.config';
import { isSolidTerrain } from '../levels/level-layout';
import type { GridPoint } from '../models/level.model';
import { type Body, moveBody, type TerrainLookup } from './body';

/** Quanto tempo a pedrinha amassada continua na tela antes de sumir. */
export const SQUASHED_SECONDS = 0.4;

/**
 * Pedrinha brava: o bichinho que anda de um lado para o outro nas fases.
 *
 * Vira na parede e na beirada do chão, para nunca cair num buraco sozinha.
 * Pisar em cima amassa; encostar de lado machuca o Pedro.
 */
export class Pebble {
  readonly body: Body;
  direction: -1 | 1 = -1;
  squashedFor: number | null = null;

  constructor(spawn: GridPoint) {
    this.body = {
      x: spawn.column + (1 - PHYSICS.pebbleWidth) / 2,
      y: spawn.row + 1 - PHYSICS.pebbleHeight,
      vx: 0,
      vy: 0,
      width: PHYSICS.pebbleWidth,
      height: PHYSICS.pebbleHeight,
    };
  }

  get isActive(): boolean {
    return this.squashedFor === null;
  }

  /** Falso quando a pedrinha já foi amassada há tempo bastante para sair de cena. */
  get isVisible(): boolean {
    return this.squashedFor === null || this.squashedFor < SQUASHED_SECONDS;
  }

  squash(): void {
    this.squashedFor = 0;
    this.body.vx = 0;
  }

  step(terrainAt: TerrainLookup, seconds: number): void {
    if (this.squashedFor !== null) {
      this.squashedFor += seconds;

      return;
    }

    this.body.vx = this.direction * PHYSICS.pebbleSpeed;
    this.body.vy = Math.min(PHYSICS.maxFallSpeed, this.body.vy + PHYSICS.gravity * seconds);

    const move = moveBody(this.body, terrainAt, seconds);

    if (move.hitWall || (move.landedOn !== null && this.isBlockedAhead(terrainAt))) {
      this.direction = this.direction === 1 ? -1 : 1;
    }
  }

  /** Beirada ou espinho logo à frente: a pedrinha também não gosta de pontas. */
  private isBlockedAhead(terrainAt: TerrainLookup): boolean {
    const aheadColumn = Math.floor(this.direction === 1 ? this.body.x + this.body.width : this.body.x - 0.01);
    const bodyRow = Math.floor(this.body.y + this.body.height - 0.01);

    return !isSolidTerrain(terrainAt(aheadColumn, bodyRow + 1)) || terrainAt(aheadColumn, bodyRow) === 'spike';
  }
}
