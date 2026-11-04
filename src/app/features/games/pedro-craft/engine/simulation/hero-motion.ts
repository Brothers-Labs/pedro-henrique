import { HERO_PHYSICS, MAX_PITCH, STEP_MS } from '../../config/craft-physics.config';
import type { PhysicsTerrain } from '../block-properties';
import type { CraftInputSnapshot } from '../input/craft-input';
import { PhysicsBody } from './physics-body';

const STEP_SECONDS = STEP_MS / 1000;

/** Altura do degrau que o pulo automático aceita subir. */
const AUTO_JUMP_STEP = 1.05;

/**
 * Corpo e olhar do herói.
 *
 * Guarda a posição do passo anterior para a câmera desenhar entre dois passos
 * (interpolação): a física roda a 60 por segundo, a tela pode rodar a 120.
 */
export class HeroMotion {
  readonly body: PhysicsBody;
  yaw: number;
  pitch = 0;
  previousX: number;
  previousY: number;
  previousZ: number;

  constructor(x: number, y: number, z: number, yaw: number) {
    this.body = new PhysicsBody(x, y, z, HERO_PHYSICS.halfWidth, HERO_PHYSICS.height);
    this.yaw = yaw;
    this.previousX = x;
    this.previousY = y;
    this.previousZ = z;
  }

  get eyeY(): number {
    return this.body.y + HERO_PHYSICS.eyeHeight;
  }

  /** Direção do olhar, unitária. */
  get lookDirection(): { readonly x: number; readonly y: number; readonly z: number } {
    const cosPitch = Math.cos(this.pitch);

    return { x: -Math.sin(this.yaw) * cosPitch, y: Math.sin(this.pitch), z: -Math.cos(this.yaw) * cosPitch };
  }

  look(deltaYaw: number, deltaPitch: number): void {
    this.yaw = (this.yaw + deltaYaw) % (Math.PI * 2);
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + deltaPitch));
  }

  teleport(x: number, y: number, z: number): void {
    this.body.teleport(x, y, z);
    this.previousX = x;
    this.previousY = y;
    this.previousZ = z;
  }

  /**
   * Levado por um trem: o corpo vai junto, sem gravidade nem colisão, e a
   * câmera continua deslizando entre o passo anterior e o atual.
   */
  carry(x: number, y: number, z: number): void {
    const body = this.body;

    this.previousX = body.x;
    this.previousY = body.y;
    this.previousZ = body.z;
    body.teleport(x, y, z);
  }

  /**
   * Um passo de movimento.
   *
   * Com `autoJump`, encostar num degrau de um bloco andando faz o herói subir
   * sozinho — no tablet, coordenar o polegar do analógico com o do pulo é
   * difícil para uma criança.
   */
  step(terrain: PhysicsTerrain, input: CraftInputSnapshot, autoJump: boolean, canFly = false): void {
    const body = this.body;

    this.previousX = body.x;
    this.previousY = body.y;
    this.previousZ = body.z;
    body.isInWater = body.touchesLiquid(terrain);

    const speed = body.isInWater ? HERO_PHYSICS.swimSpeed : HERO_PHYSICS.walkSpeed;
    const wish = this.wishVelocity(input, speed);
    const grip = body.isOnGround || body.isInWater ? HERO_PHYSICS.groundGrip : HERO_PHYSICS.airGrip;

    body.velocityX += (wish.x - body.velocityX) * grip;
    body.velocityZ += (wish.z - body.velocityZ) * grip;

    if (body.isInWater) {
      body.velocityY = Math.max(-HERO_PHYSICS.maxSinkSpeed, body.velocityY - HERO_PHYSICS.waterGravity * STEP_SECONDS);

      if (input.jumpHeld) {
        body.velocityY = HERO_PHYSICS.swimUpSpeed;
      }
    } else {
      body.velocityY = Math.max(-HERO_PHYSICS.maxFallSpeed, body.velocityY - HERO_PHYSICS.gravity * STEP_SECONDS);

      if (input.jumpHeld && body.isOnGround) {
        body.velocityY = HERO_PHYSICS.jumpSpeed;
      } else if (input.jumpHeld && canFly) {
        body.velocityY = HERO_PHYSICS.flySpeed;
      }
    }

    const result = body.move(terrain, body.velocityX * STEP_SECONDS, body.velocityY * STEP_SECONDS, body.velocityZ * STEP_SECONDS);
    const isBlocked = result.blockedX || result.blockedZ;

    if (isBlocked && body.isInWater && input.jumpHeld) {
      body.velocityY = HERO_PHYSICS.climbOutSpeed;
    } else if (isBlocked && autoJump && body.isOnGround && (wish.x !== 0 || wish.z !== 0) && this.canStepUp(terrain, wish)) {
      body.velocityY = HERO_PHYSICS.jumpSpeed;
    }
  }

  /** Velocidade desejada no plano, girada pelo olhar. */
  private wishVelocity(input: CraftInputSnapshot, speed: number): { readonly x: number; readonly z: number } {
    const length = Math.hypot(input.strafe, input.forward);

    if (length === 0) {
      return { x: 0, z: 0 };
    }

    const scale = (speed * Math.min(1, length)) / length;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);

    return {
      x: (input.strafe * cos - input.forward * sin) * scale,
      z: (-input.strafe * sin - input.forward * cos) * scale,
    };
  }

  /** O degrau à frente tem um bloco só, com espaço livre em cima para o corpo inteiro? */
  private canStepUp(terrain: PhysicsTerrain, wish: { readonly x: number; readonly z: number }): boolean {
    const length = Math.hypot(wish.x, wish.z);
    const probe = 0.35;
    const offsetX = (wish.x / length) * probe;
    const offsetZ = (wish.z / length) * probe;

    return this.body.collidesAt(terrain, offsetX, 0, offsetZ) && !this.body.collidesAt(terrain, offsetX, AUTO_JUMP_STEP, offsetZ);
  }
}
