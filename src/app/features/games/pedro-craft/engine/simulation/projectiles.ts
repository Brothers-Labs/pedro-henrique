import { STEP_MS } from '../../config/craft-physics.config';
import type { PhysicsTerrain } from '../block-properties';
import type { Creature } from './creatures';
import type { PhysicsBody } from './physics-body';

const STEP_SECONDS = STEP_MS / 1000;

/** A flecha cai devagar: o arco da trajetória dá para ver, sem ficar difícil de acertar. */
const GRAVITY = 12;

/** Flecha que não acertou nada some sozinha. */
const LIFETIME_MS = 4000;

/** Meia espessura da ponta da flecha, para o teste de acerto. */
const TIP_RADIUS = 0.1;

export type ProjectileOwner = 'hero' | 'creature';

export interface Projectile {
  readonly id: number;
  readonly owner: ProjectileOwner;
  readonly damage: number;
  x: number;
  y: number;
  z: number;
  previousX: number;
  previousY: number;
  previousZ: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  ageMs: number;
}

export type ProjectileHit =
  | { readonly target: 'hero'; readonly projectile: Projectile }
  | { readonly target: 'creature'; readonly projectile: Projectile; readonly creature: Creature };

export interface ProjectileLaunch {
  readonly owner: ProjectileOwner;
  readonly damage: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Direção unitária do disparo. */
  readonly directionX: number;
  readonly directionY: number;
  readonly directionZ: number;
  /** Blocos por segundo. */
  readonly speed: number;
}

/**
 * Flechas voando.
 *
 * A do esqueleto só acerta o herói; a do herói só acerta os bichos. Bateu
 * num bloco, a flecha some — não fica espetada para a criança recolher.
 */
export class Projectiles {
  private readonly projectiles: Projectile[] = [];
  private nextId = 1;

  get list(): readonly Projectile[] {
    return this.projectiles;
  }

  launch(launch: ProjectileLaunch): void {
    this.projectiles.push({
      id: this.nextId++,
      owner: launch.owner,
      damage: launch.damage,
      x: launch.x,
      y: launch.y,
      z: launch.z,
      previousX: launch.x,
      previousY: launch.y,
      previousZ: launch.z,
      velocityX: launch.directionX * launch.speed,
      velocityY: launch.directionY * launch.speed,
      velocityZ: launch.directionZ * launch.speed,
      ageMs: 0,
    });
  }

  clear(): void {
    this.projectiles.length = 0;
  }

  /** Move as flechas um passo e devolve quem foi acertado; as que acertaram saem da lista. */
  step(terrain: PhysicsTerrain, hero: PhysicsBody, creatures: readonly Creature[]): readonly ProjectileHit[] {
    const hits: ProjectileHit[] = [];

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];

      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      projectile.previousZ = projectile.z;
      projectile.velocityY -= GRAVITY * STEP_SECONDS;
      projectile.x += projectile.velocityX * STEP_SECONDS;
      projectile.y += projectile.velocityY * STEP_SECONDS;
      projectile.z += projectile.velocityZ * STEP_SECONDS;
      projectile.ageMs += STEP_MS;

      const hit = this.findHit(projectile, hero, creatures);

      if (hit) {
        hits.push(hit);
      }

      if (hit || projectile.ageMs > LIFETIME_MS || isInsideBlock(terrain, projectile)) {
        this.projectiles.splice(index, 1);
      }
    }

    return hits;
  }

  private findHit(projectile: Projectile, hero: PhysicsBody, creatures: readonly Creature[]): ProjectileHit | null {
    if (projectile.owner === 'creature') {
      return touches(hero, projectile) ? { target: 'hero', projectile } : null;
    }

    const creature = creatures.find((candidate) => touches(candidate.body, projectile));

    return creature ? { target: 'creature', projectile, creature } : null;
  }
}

function touches(body: PhysicsBody, projectile: Projectile): boolean {
  const { x, y, z } = projectile;

  return body.occupies(x - TIP_RADIUS, y - TIP_RADIUS, z - TIP_RADIUS, x + TIP_RADIUS, y + TIP_RADIUS, z + TIP_RADIUS);
}

function isInsideBlock(terrain: PhysicsTerrain, projectile: Projectile): boolean {
  const cellY = Math.floor(projectile.y);
  const height = terrain.collisionHeight(Math.floor(projectile.x), cellY, Math.floor(projectile.z));

  return height > 0 && projectile.y < cellY + height;
}
