import { PHYSICS } from '../config/physics.config';
import type { TerrainKind } from '../levels/level-layout';
import type { Direction } from '../models/controls.model';
import { type Body, moveBody, type TerrainLookup } from './body';

export interface HeroIntent {
  readonly direction: Direction;
  readonly isJumpHeld: boolean;
}

export interface HeroStep {
  readonly didJump: boolean;
  readonly didBounce: boolean;
  readonly hitWall: boolean;
  readonly landedOn: TerrainKind | null;
}

/**
 * Como o Pedro corre e pula, igual na aventura e na corrida.
 *
 * Tem as duas gentilezas que deixam o pulo justo para uma criança: dá para
 * pular um instante depois de sair da beirada e um instante antes de pousar.
 */
export class HeroMotion {
  readonly body: Body;
  facing: -1 | 1 = 1;
  isGrounded = false;

  private coyoteLeft = 0;
  private bufferLeft = 0;
  private wasJumpHeld = false;
  private canCutJump = false;

  constructor(x: number, y: number) {
    this.body = { x, y, vx: 0, vy: 0, width: PHYSICS.heroWidth, height: PHYSICS.heroHeight };
  }

  step(intent: HeroIntent, terrainAt: TerrainLookup, seconds: number): HeroStep {
    this.steer(intent.direction, seconds);

    const pressedJump = intent.isJumpHeld && !this.wasJumpHeld;
    const releasedJump = !intent.isJumpHeld && this.wasJumpHeld;
    this.wasJumpHeld = intent.isJumpHeld;
    this.bufferLeft = pressedJump ? PHYSICS.jumpBufferSeconds : Math.max(0, this.bufferLeft - seconds);
    this.coyoteLeft = this.isGrounded ? PHYSICS.coyoteSeconds : Math.max(0, this.coyoteLeft - seconds);

    const didJump = this.bufferLeft > 0 && this.coyoteLeft > 0;

    if (didJump) {
      this.body.vy = -PHYSICS.jumpSpeed;
      this.bufferLeft = 0;
      this.coyoteLeft = 0;
      this.canCutJump = true;
    } else if (releasedJump && this.canCutJump && this.body.vy < 0) {
      this.body.vy *= PHYSICS.jumpCutFactor;
      this.canCutJump = false;
    }

    this.body.vy = Math.min(PHYSICS.maxFallSpeed, this.body.vy + PHYSICS.gravity * seconds);

    const move = moveBody(this.body, terrainAt, seconds);
    const didBounce = move.landedOn === 'trampoline';

    if (didBounce) {
      this.launch(PHYSICS.trampolineSpeed);
    } else {
      this.isGrounded = move.landedOn !== null;
    }

    return { didJump, didBounce, hitWall: move.hitWall, landedOn: move.landedOn };
  }

  /** Joga o Pedro para cima, como no pula-pula ou ao pisar numa pedrinha. */
  launch(speed: number): void {
    this.body.vy = -speed;
    this.isGrounded = false;
    this.coyoteLeft = 0;
    // Só o pulo do próprio Pedro encurta ao soltar o botão; o do pula-pula vai até o fim.
    this.canCutJump = false;
  }

  placeAt(x: number, y: number): void {
    this.body.x = x;
    this.body.y = y;
    this.body.vx = 0;
    this.body.vy = 0;
    this.isGrounded = false;
  }

  private steer(direction: Direction, seconds: number): void {
    if (direction !== 0) {
      this.facing = direction;
    }

    const target = direction * PHYSICS.runSpeed;
    const acceleration = (this.isGrounded ? PHYSICS.groundAcceleration : PHYSICS.airAcceleration) * seconds;
    const difference = target - this.body.vx;

    this.body.vx += Math.sign(difference) * Math.min(Math.abs(difference), acceleration);
  }
}
