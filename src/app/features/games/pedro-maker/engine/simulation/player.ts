import { PLAYER_PHYSICS, POWER_UP_DURATION_MS } from '../../config/physics.config';
import type { PowerUpKind } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import type { InputSnapshot } from '../input/input-snapshot';
import { bottom, centerX, createBody, type PhysicsBody, placeFeet } from './physics-body';
import type { VisualEventQueue } from './visual-events';

export type PlayerMode = 'IDLE' | 'RUN' | 'JUMP' | 'FALL' | 'HIT' | 'DEAD' | 'WIN';

/** O que o jogador precisa da partida, sem conhecer a partida inteira. */
export interface PlayerHost {
  readonly effects: VisualEventQueue;
  playSound(cue: MakerSoundCue): void;
  onPowerUpEnded(kind: PowerUpKind): void;
}

/** Viagem até o centro do portal, desenhada pela tela a partir destes pontos. */
export interface Celebration {
  readonly startedAt: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

/** Duração do "ai!" depois de um toque. */
const HIT_POSE_MS = 320;

/** Velocidade de queda a partir da qual o pouso levanta poeira. */
const DUST_LANDING_SPEED = 420;

/** Correndo, uma nuvenzinha de poeira a cada tantos milissegundos. */
const RUN_DUST_INTERVAL_MS = 220;
const RUN_DUST_SPEED = 200;

/**
 * O Pedro em movimento.
 *
 * Aqui mora a sensação do controle: aceleração e freio suaves, gelo
 * escorregadio, pulo que perdoa o botão apertado um pouquinho cedo ou tarde,
 * pulo curto ao soltar o botão, pulo duplo com a Asa e a piscada de
 * invencibilidade depois de um toque.
 *
 * Todo tempo aqui é o relógio da partida, e não o do navegador — assim a pausa
 * não consome power-up nem invencibilidade.
 */
export class Player {
  readonly body: PhysicsBody = createBody(PLAYER_PHYSICS.bodyWidth, PLAYER_PHYSICS.bodyHeight, true, PLAYER_PHYSICS.maxFallSpeed);

  mode: PlayerMode = 'IDLE';
  /** 1 olhando para a direita, -1 para a esquerda. */
  facing: 1 | -1 = 1;
  hasShield = false;
  celebration: Celebration | null = null;

  private readonly timedPowerUps = new Map<PowerUpKind, number>();
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private lastJumpPressedAt = Number.NEGATIVE_INFINITY;
  private isJumpCut = true;
  private hasUsedDoubleJump = false;
  private invincibleUntil = 0;
  private hitPoseUntil = 0;
  private wasGrounded = false;
  private previousFallSpeed = 0;
  private lastRunDustAt = 0;

  constructor(
    feetX: number,
    feetY: number,
    private readonly host: PlayerHost,
  ) {
    placeFeet(this.body, feetX, feetY);
  }

  get isGrounded(): boolean {
    return this.body.blockedDown;
  }

  get isActive(): boolean {
    return this.mode !== 'DEAD' && this.mode !== 'WIN';
  }

  isInvincible(now: number): boolean {
    return now < this.invincibleUntil;
  }

  hasPowerUp(kind: PowerUpKind): boolean {
    return kind === 'shield' ? this.hasShield : this.timedPowerUps.has(kind);
  }

  placeFeetAt(feetX: number, feetY: number): void {
    placeFeet(this.body, feetX, feetY);
  }

  /** Decide a velocidade deste passo; a física move o corpo logo depois. */
  control(now: number, deltaMs: number, input: InputSnapshot, isOnIce: boolean): void {
    this.expirePowerUps(now);

    if (!this.isActive) {
      return;
    }

    const grounded = this.isGrounded;

    if (grounded) {
      this.lastGroundedAt = now;
      this.hasUsedDoubleJump = false;
    }

    this.handleLanding(grounded);
    this.moveHorizontally(deltaMs / 1000, input, grounded, isOnIce);
    this.kickUpDust(now, grounded);
    this.handleJump(now, input, grounded);
    this.updateMode(now, grounded);

    this.wasGrounded = grounded;
    this.previousFallSpeed = this.body.vy;
  }

  /**
   * Impulso para cima vindo de fora: mola ou pisão em inimigo.
   *
   * A mola nunca é cortada; o pisão vira pulo alto só se o botão de pular
   * estiver apertado, e um quiquinho se não estiver.
   */
  bounce(velocity: number, canBeCut: boolean): void {
    this.body.vy = -velocity;
    this.body.riding = null;
    this.isJumpCut = !canBeCut;
    this.hasUsedDoubleJump = false;
  }

  grantPowerUp(kind: PowerUpKind, now: number): void {
    if (kind === 'shield') {
      this.hasShield = true;
      return;
    }

    this.timedPowerUps.set(kind, now + POWER_UP_DURATION_MS[kind]);
  }

  clearPowerUps(): void {
    this.timedPowerUps.clear();
    this.hasShield = false;
  }

  makeInvincible(now: number, durationMs: number): void {
    this.invincibleUntil = now + durationMs;
  }

  showHitPose(now: number, knockbackDirection: number): void {
    this.hitPoseUntil = now + HIT_POSE_MS;
    this.body.vx = knockbackDirection * 220;
    this.body.vy = -380;
    this.body.riding = null;
    this.mode = 'HIT';
  }

  defeat(): void {
    this.mode = 'DEAD';
    this.body.vx = 0;
    this.body.vy = 0;
  }

  /** Vitória: o Pedro para e viaja girando até o centro do portal. */
  celebrate(now: number, portalX: number, portalY: number): void {
    this.mode = 'WIN';
    this.body.vx = 0;
    this.body.vy = 0;
    this.celebration = {
      startedAt: now,
      fromX: centerX(this.body),
      fromY: bottom(this.body),
      toX: portalX,
      toY: portalY,
    };
  }

  /** Volta ao jogo depois de um checkpoint: parado, visível e com gravidade. */
  revive(now: number, invincibilityMs: number): void {
    this.mode = 'IDLE';
    this.celebration = null;
    this.body.vx = 0;
    this.body.vy = 0;
    this.wasGrounded = false;
    this.previousFallSpeed = 0;
    this.makeInvincible(now, invincibilityMs);
  }

  private moveHorizontally(seconds: number, input: InputSnapshot, grounded: boolean, isOnIce: boolean): void {
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const turbo = this.timedPowerUps.has('turbo') ? PLAYER_PHYSICS.turboMultiplier : 1;
    const topSpeed = (input.run ? PLAYER_PHYSICS.runSpeed : PLAYER_PHYSICS.walkSpeed) * turbo;

    let rate: number;

    if (direction !== 0) {
      rate = grounded ? PLAYER_PHYSICS.groundAcceleration * (isOnIce ? 0.35 : 1) : PLAYER_PHYSICS.airAcceleration;
    } else if (grounded) {
      rate = isOnIce ? PLAYER_PHYSICS.iceDeceleration : PLAYER_PHYSICS.groundDeceleration;
    } else {
      rate = PLAYER_PHYSICS.airAcceleration * 0.4;
    }

    this.body.vx = approach(this.body.vx, direction * topSpeed, rate * seconds);

    if (direction !== 0) {
      this.facing = direction > 0 ? 1 : -1;
    }
  }

  private handleJump(now: number, input: InputSnapshot, grounded: boolean): void {
    if (input.jumpPressed) {
      this.lastJumpPressedAt = now;
    }

    const hasBufferedJump = now - this.lastJumpPressedAt <= PLAYER_PHYSICS.jumpBufferMs;
    const canGroundJump = grounded || now - this.lastGroundedAt <= PLAYER_PHYSICS.coyoteTimeMs;
    const velocityY = this.body.vy;

    if (hasBufferedJump && canGroundJump && velocityY >= -1) {
      this.jump(this.jumpVelocity());
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
      this.host.effects.burst('dust', centerX(this.body), bottom(this.body), 6);

      return;
    }

    if (input.jumpPressed && !canGroundJump && this.timedPowerUps.has('wings') && !this.hasUsedDoubleJump) {
      this.hasUsedDoubleJump = true;
      this.jump(this.jumpVelocity() * 0.92);
      this.host.effects.burst('poof', centerX(this.body), bottom(this.body), 8);

      return;
    }

    // Soltar o botão enquanto sobe corta o pulo: é o pulinho curto.
    if (!input.jumpHeld && !this.isJumpCut && velocityY < 0) {
      this.body.vy = velocityY * PLAYER_PHYSICS.jumpCutMultiplier;
      this.isJumpCut = true;
    }
  }

  private jump(velocity: number): void {
    this.body.vy = -velocity;
    this.body.riding = null;
    this.lastJumpPressedAt = Number.NEGATIVE_INFINITY;
    this.isJumpCut = false;
    this.host.playSound('jump');
  }

  private jumpVelocity(): number {
    const boost = this.timedPowerUps.has('super-jump') ? PLAYER_PHYSICS.superJumpMultiplier : 1;

    return PLAYER_PHYSICS.jumpVelocity * boost;
  }

  private handleLanding(grounded: boolean): void {
    if (grounded && !this.wasGrounded && this.previousFallSpeed > DUST_LANDING_SPEED) {
      this.host.effects.burst('dust', centerX(this.body), bottom(this.body), 8);
    }
  }

  private kickUpDust(now: number, grounded: boolean): void {
    if (!grounded || Math.abs(this.body.vx) < RUN_DUST_SPEED || now - this.lastRunDustAt < RUN_DUST_INTERVAL_MS) {
      return;
    }

    this.lastRunDustAt = now;
    this.host.effects.burst('dust', centerX(this.body) - Math.sign(this.body.vx) * 10, bottom(this.body), 2);
  }

  private updateMode(now: number, grounded: boolean): void {
    if (this.mode === 'HIT' && now < this.hitPoseUntil) {
      return;
    }

    if (!grounded) {
      this.mode = this.body.vy < 0 ? 'JUMP' : 'FALL';
    } else {
      this.mode = Math.abs(this.body.vx) > 20 ? 'RUN' : 'IDLE';
    }
  }

  private expirePowerUps(now: number): void {
    for (const [kind, expiresAt] of this.timedPowerUps) {
      if (now >= expiresAt) {
        this.timedPowerUps.delete(kind);
        this.host.onPowerUpEnded(kind);
      }
    }
  }
}

function approach(current: number, target: number, maxStep: number): number {
  if (current < target) {
    return Math.min(target, current + maxStep);
  }

  return Math.max(target, current - maxStep);
}
