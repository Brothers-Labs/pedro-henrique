import * as Phaser from 'phaser';

import { BOSS_FRAME_HEIGHT, BOSS_FRAME_WIDTH, BOSS_FRAMES } from '../../art/boss-art';
import { TEXTURES } from '../../art/texture-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import type { BossDefinition } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import { DEPTH, type Effects } from '../effects';

export interface BossHost {
  readonly effects: Effects;
  playSound(cue: MakerSoundCue): void;
  spawnMinion(worldX: number, worldY: number): void;
  onHitPointsChanged(hitPoints: number): void;
  onDefeated(x: number): void;
}

type BossMode = 'waiting' | 'idle' | 'windup' | 'leap' | 'charge' | 'summon' | 'tired' | 'hurt' | 'defeated';

type Attack = 'leap' | 'charge' | 'summon';

const BODY_WIDTH = 112;
const BODY_HEIGHT = 78;
const BODY_BOTTOM = 114;

const IDLE_MS = 1000;
const WINDUP_MS = 550;
const TIRED_MS = 1800;
const HURT_MS = 900;
const LEAP_VELOCITY = 880;
const CHARGE_SPEED = 400;

/** Ordem dos ataques: previsível de propósito, para a criança aprender o ritmo. */
const ATTACK_CYCLE: readonly Attack[] = ['leap', 'charge', 'summon', 'leap', 'charge'];

/**
 * O chefão da fase final de cada mundo.
 *
 * Três ataques em ciclo — pulo que treme o chão, investida de parede a parede
 * e chamado de ajudantes — e, depois de pular ou investir, ele cansa: os olhos
 * viram espiral e é aí que um pisão vale. Pisar nele fora dessa janela só faz
 * o Pedro quicar, sem machucar ninguém.
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  hitPoints: number;

  private mode: BossMode = 'waiting';
  private modeUntil = 0;
  private attackIndex = 0;
  private direction = -1;
  private wasAirborne = false;

  constructor(
    scene: Phaser.Scene,
    readonly definition: BossDefinition,
    cellX: number,
    cellY: number,
    private readonly arenaLeft: number,
    private readonly arenaRight: number,
    private readonly host: BossHost,
  ) {
    const feetY = (cellY + 1) * TILE_SIZE;

    super(scene, cellX * TILE_SIZE + TILE_SIZE / 2, feetY - (BODY_BOTTOM - BOSS_FRAME_HEIGHT / 2), TEXTURES.boss, BOSS_FRAMES.idle);

    this.hitPoints = definition.hitPoints;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.arcadeBody.setSize(BODY_WIDTH, BODY_HEIGHT);
    this.arcadeBody.setOffset((BOSS_FRAME_WIDTH - BODY_WIDTH) / 2, BODY_BOTTOM - BODY_HEIGHT);
    this.arcadeBody.setImmovable(true);
    this.setDepth(DEPTH.enemies);
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isAwake(): boolean {
    return this.mode !== 'waiting' && this.mode !== 'defeated';
  }

  get isVulnerable(): boolean {
    return this.mode === 'tired';
  }

  /** Machuca ao encostar? Cansado, atingido ou derrotado, não. */
  get isHarmful(): boolean {
    return this.isAwake && this.mode !== 'tired' && this.mode !== 'hurt';
  }

  wake(now: number): void {
    if (this.mode !== 'waiting') {
      return;
    }

    this.enter('idle', now, IDLE_MS);
    this.host.playSound('boss');
    this.host.effects.shake('forte');
  }

  step(now: number, playerX: number): void {
    if (!this.isAwake) {
      return;
    }

    this.keepInsideArena();

    switch (this.mode) {
      case 'idle':
        this.arcadeBody.setVelocityX(0);
        this.faceTowards(playerX);

        if (now >= this.modeUntil) {
          this.startNextAttack(now);
        }

        return;
      case 'windup':
        // Tremidinha antes da investida: o aviso de que ele vai correr.
        this.setX(this.x + Math.sin(now / 25) * 1.5);

        if (now >= this.modeUntil) {
          this.enter('charge', now, 4000);
          this.arcadeBody.setVelocityX(this.direction * CHARGE_SPEED * this.definition.fury);
        }

        return;
      case 'leap':
        this.handleLeapLanding(now);
        return;
      case 'charge':
        this.handleCharge(now);
        return;
      case 'summon':
      case 'tired':
      case 'hurt':
        this.arcadeBody.setVelocityX(0);

        if (now >= this.modeUntil) {
          this.enter('idle', now, IDLE_MS / this.definition.fury);
        }

        return;
      case 'waiting':
      case 'defeated':
        return;
    }
  }

  /** Pisão na hora certa: perde um ponto de vida e fica um instante intocável. */
  takeHit(now: number): void {
    if (!this.isVulnerable) {
      return;
    }

    this.hitPoints -= 1;
    this.host.onHitPointsChanged(this.hitPoints);
    this.host.playSound('enemyHit');
    this.host.effects.burst('poof', this.x, this.y - 30, 18);
    this.host.effects.shake('forte');

    if (this.hitPoints <= 0) {
      this.defeat();
      return;
    }

    this.enter('hurt', now, HURT_MS);
    this.setFrame(BOSS_FRAMES.hurt);
  }

  private startNextAttack(now: number): void {
    const attack = ATTACK_CYCLE[this.attackIndex % ATTACK_CYCLE.length];

    this.attackIndex += 1;

    switch (attack) {
      case 'leap': {
        this.enter('leap', now, 3000);
        this.wasAirborne = false;
        this.arcadeBody.setVelocityY(-LEAP_VELOCITY * Math.sqrt(this.definition.fury));
        this.arcadeBody.setVelocityX(this.direction * 240 * this.definition.fury);
        this.setFrame(BOSS_FRAMES.idle);
        return;
      }
      case 'charge':
        this.enter('windup', now, WINDUP_MS);
        this.setFrame(BOSS_FRAMES.squash);
        return;
      case 'summon':
        this.enter('summon', now, 900);
        this.setFrame(BOSS_FRAMES.squash);
        this.host.playSound('boss');
        this.host.spawnMinion(this.x - 90, this.y - 20);
        this.host.spawnMinion(this.x + 90, this.y - 20);
        this.scene.time.delayedCall(260, () => {
          if (this.mode === 'summon') {
            this.setFrame(BOSS_FRAMES.idle);
          }
        });
        return;
    }
  }

  private handleLeapLanding(now: number): void {
    const isGrounded = this.arcadeBody.blocked.down;

    if (!isGrounded) {
      this.wasAirborne = true;
      return;
    }

    if (this.wasAirborne || now >= this.modeUntil) {
      this.arcadeBody.setVelocityX(0);
      this.becomeTired(now);
    }
  }

  private handleCharge(now: number): void {
    const hitWall =
      (this.direction < 0 && (this.arcadeBody.blocked.left || this.x <= this.arenaLeft + BODY_WIDTH / 2)) ||
      (this.direction > 0 && (this.arcadeBody.blocked.right || this.x >= this.arenaRight - BODY_WIDTH / 2));

    if (hitWall || now >= this.modeUntil) {
      this.arcadeBody.setVelocityX(0);
      this.becomeTired(now);
    }
  }

  private becomeTired(now: number): void {
    this.enter('tired', now, TIRED_MS);
    this.setFrame(BOSS_FRAMES.tired);
    this.host.playSound('boss');
    this.host.effects.shake('forte');
    this.host.effects.burst('dust', this.x, this.arcadeBody.bottom, 16);
  }

  private defeat(): void {
    this.mode = 'defeated';
    this.arcadeBody.enable = false;
    this.setFrame(BOSS_FRAMES.hurt);
    this.host.effects.burst('confetti', this.x, this.y - 40, 60);

    this.scene.tweens.add({
      targets: this,
      scale: 0.1,
      alpha: 0,
      angle: 360,
      duration: 1100,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.host.onDefeated(this.x);
        this.destroy();
      },
    });
  }

  private faceTowards(playerX: number): void {
    this.direction = playerX < this.x ? -1 : 1;
    this.setFlipX(this.direction > 0);
  }

  private keepInsideArena(): void {
    const half = BODY_WIDTH / 2;

    if (this.x < this.arenaLeft + half) {
      this.setX(this.arenaLeft + half);
      this.arcadeBody.setVelocityX(Math.max(0, this.arcadeBody.velocity.x));
    } else if (this.x > this.arenaRight - half) {
      this.setX(this.arenaRight - half);
      this.arcadeBody.setVelocityX(Math.min(0, this.arcadeBody.velocity.x));
    }
  }

  private enter(mode: BossMode, now: number, durationMs: number): void {
    this.mode = mode;
    this.modeUntil = now + durationMs;

    if (mode === 'idle') {
      this.setFrame(BOSS_FRAMES.idle);
    }
  }
}
