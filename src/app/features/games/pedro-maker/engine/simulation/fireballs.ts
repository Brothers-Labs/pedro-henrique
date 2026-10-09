import { FIREBALL_PHYSICS } from '../../config/physics.config';
import { createBody, type PhysicsBody, type PhysicsWorld, stepBody } from './physics-body';

export interface Fireball {
  readonly id: number;
  readonly body: PhysicsBody;
  readonly expiresAt: number;
}

/**
 * Bolas de fogo da Flor de Fogo.
 *
 * Usam a mesma física dos outros corpos: caem, quicam no chão e se apagam ao
 * bater numa parede ou quando o tempo acaba. Quem decide o que acontece com
 * um inimigo atingido é a partida.
 */
export class FireballSystem {
  readonly fireballs: Fireball[] = [];

  private nextId = 1;

  get canThrow(): boolean {
    return this.fireballs.length < FIREBALL_PHYSICS.maxAlive;
  }

  /** Lança uma bola a partir do centro (x, y), para o lado em que o Pedro olha. */
  throw(x: number, y: number, direction: 1 | -1, now: number): void {
    const { size } = FIREBALL_PHYSICS;
    const body = createBody(size, size, true, FIREBALL_PHYSICS.maxFallSpeed);

    body.x = x - size / 2;
    body.y = y - size / 2;
    body.previousX = body.x;
    body.previousY = body.y;
    body.vx = direction * FIREBALL_PHYSICS.speed;

    this.fireballs.push({ id: this.nextId, body, expiresAt: now + FIREBALL_PHYSICS.lifeMs });
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

      stepBody(body, world, seconds, false);

      if (body.blockedDown) {
        body.vy = -FIREBALL_PHYSICS.bounceVelocity;
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
