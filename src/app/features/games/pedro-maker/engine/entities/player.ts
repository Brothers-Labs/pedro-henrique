import * as Phaser from 'phaser';

import { PEDRO_FEET_Y, PEDRO_FRAME_HEIGHT, PEDRO_FRAME_WIDTH, PEDRO_FRAMES } from '../../art/pedro-art';
import { TEXTURES } from '../../art/texture-catalog';
import { PLAYER_PHYSICS, POWER_UP_DURATION_MS } from '../../config/physics.config';
import type { PowerUpKind } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import { ANIMATIONS } from '../animations';
import { DEPTH, type Effects } from '../effects';
import type { InputSnapshot } from '../player-input';

export type PlayerMode = 'IDLE' | 'RUN' | 'JUMP' | 'FALL' | 'HIT' | 'DEAD' | 'WIN';

/** O que o jogador precisa da cena, sem conhecer a cena inteira. */
export interface PlayerHost {
  readonly effects: Effects;
  playSound(cue: MakerSoundCue): void;
  onPowerUpEnded(kind: PowerUpKind): void;
}

/** Duração do quadro de "ai!" depois de um toque. */
const HIT_POSE_MS = 320;

/** Velocidade de queda a partir da qual o pouso levanta poeira. */
const DUST_LANDING_SPEED = 420;

/** Correndo, uma nuvenzinha de poeira a cada tantos milissegundos. */
const RUN_DUST_INTERVAL_MS = 220;
const RUN_DUST_SPEED = 200;

/**
 * O Pedro em movimento.
 *
 * A física é a do Arcade do Phaser; o que mora aqui é a sensação: aceleração
 * e freio suaves, gelo escorregadio, pulo que perdoa o botão apertado um
 * pouquinho cedo ou tarde, pulo curto ao soltar o botão, pulo duplo com a Asa
 * e a piscada de invencibilidade depois de um toque.
 *
 * Todo tempo aqui é o "tempo de jogo" que a cena passa a cada quadro, e não o
 * relógio do navegador — assim a pausa não consome power-up nem invencibilidade.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  mode: PlayerMode = 'IDLE';
  hasShield = false;

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
    scene: Phaser.Scene,
    feetX: number,
    feetY: number,
    private readonly host: PlayerHost,
  ) {
    super(scene, feetX, feetY, TEXTURES.pedro, PEDRO_FRAMES.idle[0]);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const offsetX = (PEDRO_FRAME_WIDTH - PLAYER_PHYSICS.bodyWidth) / 2;
    const offsetY = PEDRO_FEET_Y - PLAYER_PHYSICS.bodyHeight;

    this.arcadeBody.setSize(PLAYER_PHYSICS.bodyWidth, PLAYER_PHYSICS.bodyHeight);
    this.arcadeBody.setOffset(offsetX, offsetY);
    this.arcadeBody.setMaxVelocityY(PLAYER_PHYSICS.maxFallSpeed);
    this.arcadeBody.setCollideWorldBounds(true);
    this.setDepth(DEPTH.player);
    this.placeFeetAt(feetX, feetY);
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isGrounded(): boolean {
    return this.arcadeBody.blocked.down || this.arcadeBody.touching.down;
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

  /** Coloca os pés do Pedro exatamente sobre um ponto do mundo. */
  placeFeetAt(feetX: number, feetY: number): void {
    const centerY = feetY - (PEDRO_FEET_Y - PEDRO_FRAME_HEIGHT / 2);

    this.setPosition(feetX, centerY);
    this.arcadeBody.reset(feetX, centerY);
  }

  step(now: number, deltaMs: number, input: InputSnapshot, isOnIce: boolean): void {
    this.expirePowerUps(now);
    this.updateInvincibilityBlink(now);

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
    this.previousFallSpeed = this.arcadeBody.velocity.y;
  }

  /**
   * Impulso para cima vindo de fora: mola ou pisão em inimigo.
   *
   * A mola nunca é cortada; o pisão vira pulo alto só se o botão de pular
   * estiver apertado, e um quiquinho se não estiver.
   */
  bounce(velocity: number, canBeCut: boolean): void {
    this.arcadeBody.setVelocityY(-velocity);
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

  /** Invencível por um tempo, piscando: a janela para se recompor depois de um toque. */
  makeInvincible(now: number, durationMs: number): void {
    this.invincibleUntil = now + durationMs;
  }

  showHitPose(now: number, knockbackDirection: number): void {
    this.hitPoseUntil = now + HIT_POSE_MS;
    this.arcadeBody.setVelocity(knockbackDirection * 220, -380);
    this.mode = 'HIT';
    this.anims.stop();
    this.setFrame(PEDRO_FRAMES.hit);
  }

  defeat(): void {
    this.mode = 'DEAD';
    this.anims.stop();
    this.setFrame(PEDRO_FRAMES.hit);
    this.arcadeBody.setVelocity(0, 0);
    this.setAlpha(1);
  }

  celebrate(): void {
    this.mode = 'WIN';
    this.anims.stop();
    this.setFrame(PEDRO_FRAMES.win);
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.setAllowGravity(false);
    this.setAlpha(1);
  }

  /** Volta ao jogo depois de um checkpoint: parado, visível e com gravidade. */
  revive(now: number, invincibilityMs: number): void {
    this.mode = 'IDLE';
    this.arcadeBody.setAllowGravity(true);
    this.arcadeBody.setVelocity(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.makeInvincible(now, invincibilityMs);
    this.play(ANIMATIONS.pedroIdle, true);
  }

  private moveHorizontally(seconds: number, input: InputSnapshot, grounded: boolean, isOnIce: boolean): void {
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const turbo = this.timedPowerUps.has('turbo') ? PLAYER_PHYSICS.turboMultiplier : 1;
    const topSpeed = (input.run ? PLAYER_PHYSICS.runSpeed : PLAYER_PHYSICS.walkSpeed) * turbo;
    const velocity = this.arcadeBody.velocity.x;

    let rate: number;

    if (direction !== 0) {
      rate = grounded ? PLAYER_PHYSICS.groundAcceleration * (isOnIce ? 0.35 : 1) : PLAYER_PHYSICS.airAcceleration;
    } else if (grounded) {
      rate = isOnIce ? PLAYER_PHYSICS.iceDeceleration : PLAYER_PHYSICS.groundDeceleration;
    } else {
      rate = PLAYER_PHYSICS.airAcceleration * 0.4;
    }

    this.arcadeBody.setVelocityX(approach(velocity, direction * topSpeed, rate * seconds));

    if (direction !== 0) {
      this.setFlipX(direction < 0);
    }
  }

  private handleJump(now: number, input: InputSnapshot, grounded: boolean): void {
    if (input.jumpPressed) {
      this.lastJumpPressedAt = now;
    }

    const hasBufferedJump = now - this.lastJumpPressedAt <= PLAYER_PHYSICS.jumpBufferMs;
    const canGroundJump = grounded || now - this.lastGroundedAt <= PLAYER_PHYSICS.coyoteTimeMs;
    const velocityY = this.arcadeBody.velocity.y;

    if (hasBufferedJump && canGroundJump && velocityY >= -1) {
      this.jump(this.jumpVelocity());
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
      this.host.effects.burst('dust', this.x, this.arcadeBody.bottom, 6);

      return;
    }

    if (input.jumpPressed && !canGroundJump && this.timedPowerUps.has('wings') && !this.hasUsedDoubleJump) {
      this.hasUsedDoubleJump = true;
      this.jump(this.jumpVelocity() * 0.92);
      this.host.effects.burst('poof', this.x, this.arcadeBody.bottom, 8);

      return;
    }

    // Soltar o botão enquanto sobe corta o pulo: é o pulinho curto.
    if (!input.jumpHeld && !this.isJumpCut && velocityY < 0) {
      this.arcadeBody.setVelocityY(velocityY * PLAYER_PHYSICS.jumpCutMultiplier);
      this.isJumpCut = true;
    }
  }

  private jump(velocity: number): void {
    this.arcadeBody.setVelocityY(-velocity);
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
      this.host.effects.burst('dust', this.x, this.arcadeBody.bottom, 8);
    }
  }

  private kickUpDust(now: number, grounded: boolean): void {
    if (!grounded || Math.abs(this.arcadeBody.velocity.x) < RUN_DUST_SPEED || now - this.lastRunDustAt < RUN_DUST_INTERVAL_MS) {
      return;
    }

    this.lastRunDustAt = now;
    this.host.effects.burst('dust', this.x - Math.sign(this.arcadeBody.velocity.x) * 10, this.arcadeBody.bottom, 2);
  }

  private updateMode(now: number, grounded: boolean): void {
    if (this.mode === 'HIT' && now < this.hitPoseUntil) {
      return;
    }

    const { x: velocityX, y: velocityY } = this.arcadeBody.velocity;

    if (!grounded) {
      this.mode = velocityY < 0 ? 'JUMP' : 'FALL';
      this.anims.stop();
      this.setFrame(velocityY < 0 ? PEDRO_FRAMES.jump : PEDRO_FRAMES.fall);

      return;
    }

    if (Math.abs(velocityX) > 20) {
      this.mode = 'RUN';
      this.play(ANIMATIONS.pedroRun, true);
      this.anims.timeScale = Math.max(0.6, Math.abs(velocityX) / PLAYER_PHYSICS.walkSpeed);

      return;
    }

    this.mode = 'IDLE';
    this.anims.timeScale = 1;
    this.play(ANIMATIONS.pedroIdle, true);
  }

  private updateInvincibilityBlink(now: number): void {
    if (this.mode === 'DEAD' || this.mode === 'WIN') {
      return;
    }

    this.setAlpha(this.isInvincible(now) && Math.floor(now / 90) % 2 === 0 ? 0.35 : 1);
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
