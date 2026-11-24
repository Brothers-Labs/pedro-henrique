import { BUBBLE_PHYSICS, FIREBALL_PHYSICS, ICEBALL_PHYSICS } from '../../config/physics.config';
import { createBody, type PhysicsBody, type PhysicsWorld, stepBody } from './physics-body';

/** Do que é feita a bola: fogo da Flor de Fogo, gelo da Flor de Gelo ou bolha da Flor de Bolha. */
export type BallElement = 'fire' | 'ice' | 'bubble';

interface BallMotion {
  readonly size: number;
  readonly speed: number;
  readonly bounceVelocity: number;
  readonly lifeMs: number;
  /** A bola cai e quica no chão; a bolha, não: flutua reto. */
  readonly hasGravity: boolean;
}

const MOTIONS: Readonly<Record<BallElement, BallMotion>> = {
  fire: { ...FIREBALL_PHYSICS, hasGravity: true },
  ice: { ...ICEBALL_PHYSICS, size: FIREBALL_PHYSICS.size, lifeMs: FIREBALL_PHYSICS.lifeMs, hasGravity: true },
  bubble: { ...BUBBLE_PHYSICS, hasGravity: false },
};

export interface Fireball {
  readonly id: number;
  readonly element: BallElement;
  readonly body: PhysicsBody;
  readonly expiresAt: number;
}

/**
 * Bolas de fogo e de gelo das flores.
 *
 * Usam a mesma física dos outros corpos: caem, quicam no chão e se apagam ao
 * bater numa parede ou quando o tempo acaba. O gelo só voa mais devagar e
 * quica mais baixo. A bolha não cai: flutua reto, ondulando de leve, e estoura
 * na parede. Quem decide o que acontece com um inimigo atingido é a partida.
 */
export class FireballSystem {
  readonly fireballs: Fireball[] = [];

  private nextId = 1;

  get canThrow(): boolean {
    return this.fireballs.length < FIREBALL_PHYSICS.maxAlive;
  }

  /** Lança uma bola a partir do centro (x, y), para o lado em que o Pedro olha. */
  throw(x: number, y: number, direction: 1 | -1, element: BallElement, now: number): void {
    const motion = MOTIONS[element];
    const { size } = motion;
    const body = createBody(size, size, motion.hasGravity, FIREBALL_PHYSICS.maxFallSpeed);

    body.x = x - size / 2;
    body.y = y - size / 2;
    body.previousX = body.x;
    body.previousY = body.y;
    body.vx = direction * motion.speed;

    this.fireballs.push({ id: this.nextId, element, body, expiresAt: now + motion.lifeMs });
    this.nextId += 1;
  }

  /**
   * Move as bolas e apaga as que bateram, caíram da fase ou cansaram.
   *
   * `onExtinguished` recebe cada bola apagada, para a partida soltar a fumaça.
   */
  update(world: PhysicsWorld, seconds: number, now: number, onExtinguished: (fireball: Fireball) => void): void {
    const fallLimit = world.grid.heightPx;

    for (let index = this.fireballs.length - 1; index >= 0; index -= 1) {
      const fireball = this.fireballs[index];
      const body = fireball.body;
      const motion = MOTIONS[fireball.element];

      if (!motion.hasGravity) {
        body.vy = Math.sin((now / BUBBLE_PHYSICS.bobPeriodMs) * Math.PI * 2) * BUBBLE_PHYSICS.bobVelocity;
      }

      stepBody(body, world, seconds, false);

      if (body.blockedDown && motion.hasGravity) {
        body.vy = -motion.bounceVelocity;
      }

      const hitWall = body.blockedLeft || body.blockedRight;

      if (hitWall || now >= fireball.expiresAt || body.y > fallLimit) {
        this.fireballs.splice(index, 1);
        onExtinguished(fireball);
      }
    }
  }

  remove(fireball: Fireball): void {
    const index = this.fireballs.indexOf(fireball);

    if (index >= 0) {
      this.fireballs.splice(index, 1);
    }
  }
}
