import * as Phaser from 'phaser';

import { ENEMY_FRAME } from '../../art/enemy-art';
import { enemyTexture } from '../../art/texture-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import type { EnemyKind } from '../../models/level.model';
import { enemyAnimation } from '../animations';
import { DEPTH } from '../effects';

/** Pergunta à cena se há chão sólido num ponto do mundo. */
export type SolidProbe = (worldX: number, worldY: number) => boolean;

interface EnemyProfile {
  readonly speed: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  /** Linha de baixo do desenho dentro do quadro. */
  readonly bottom: number;
  readonly flies: boolean;
  readonly isStompable: boolean;
}

const PROFILES: Readonly<Record<EnemyKind, EnemyProfile>> = {
  slime: { speed: 60, bodyWidth: 34, bodyHeight: 24, bottom: 46, flies: false, isStompable: true },
  spiky: { speed: 50, bodyWidth: 32, bodyHeight: 26, bottom: 47, flies: false, isStompable: false },
  robot: { speed: 110, bodyWidth: 30, bodyHeight: 34, bottom: 47, flies: false, isStompable: true },
  bat: { speed: 1, bodyWidth: 26, bodyHeight: 20, bottom: 36, flies: true, isStompable: true },
  ghost: { speed: 50, bodyWidth: 30, bodyHeight: 32, bottom: 42, flies: true, isStompable: true },
};

/** Distância que o robô patrulha para cada lado do ponto de partida. */
const ROBOT_PATROL = TILE_SIZE * 4;
const ROBOT_PAUSE_MS = 450;

const BAT_RANGE_X = TILE_SIZE * 2;
const BAT_RANGE_Y = TILE_SIZE * 0.6;

const GHOST_VISIBLE_MS = 2600;
const GHOST_FADED_MS = 1600;
const GHOST_NOTICE_DISTANCE = 340;

/**
 * Inimigo comum.
 *
 * Cada tipo tem um jeito de andar: o slime e o espinhudo vão e voltam sem cair
 * das beiradas, o robô patrulha um trecho com paradinhas, o morcego voa num
 * oito e o fantasminha segue o Pedro devagar, sumindo de tempos em tempos.
 * Invisível, o fantasminha não machuca — é a hora de passar por ele.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  isDefeated = false;

  private readonly profile: EnemyProfile;
  private readonly homeX: number;
  private readonly homeY: number;
  private direction = -1;
  private pausedUntil = 0;
  private isFaded = false;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    scene: Phaser.Scene,
    readonly kind: EnemyKind,
    cellX: number,
    cellY: number,
    private readonly speedMultiplier: number,
    private readonly isSolidAt: SolidProbe,
  ) {
    const profile = PROFILES[kind];
    const centerX = cellX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = profile.flies
      ? cellY * TILE_SIZE + TILE_SIZE / 2
      : (cellY + 1) * TILE_SIZE - (profile.bottom - ENEMY_FRAME / 2);

    super(scene, centerX, centerY, enemyTexture(kind), 0);

    this.profile = profile;
    this.homeX = centerX;
    this.homeY = centerY;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.arcadeBody.setSize(profile.bodyWidth, profile.bodyHeight);
    this.arcadeBody.setOffset((ENEMY_FRAME - profile.bodyWidth) / 2, profile.bottom - profile.bodyHeight);
    this.arcadeBody.setAllowGravity(!profile.flies);
    this.setDepth(DEPTH.enemies);
    this.play(enemyAnimation(kind));
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /** Pisar em cima derrota o inimigo? O espinhudo e o fantasma sumido, não. */
  get canBeStomped(): boolean {
    return this.profile.isStompable && !this.isFaded;
  }

  get isHarmful(): boolean {
    return !this.isDefeated && !this.isFaded;
  }

  step(now: number, target: Phaser.Math.Vector2): void {
    if (this.isDefeated) {
      return;
    }

    switch (this.kind) {
      case 'slime':
      case 'spiky':
        this.patrolLedges();
        break;
      case 'robot':
        this.patrolRegion(now);
        break;
      case 'bat':
        this.flyFigureEight(now);
        break;
      case 'ghost':
        this.haunt(now, target);
        break;
    }
  }

  /** Congela o inimigo longe da câmera: poupa processamento e evita que ele fuja. */
  freeze(): void {
    this.arcadeBody.setVelocity(0, this.profile.flies ? 0 : this.arcadeBody.velocity.y);
  }

  defeat(): void {
    this.isDefeated = true;
    this.arcadeBody.enable = false;
    this.anims.stop();

    this.scene.tweens.add({
      targets: this,
      scaleY: 0.2,
      scaleX: 1.4,
      alpha: 0,
      y: this.y + 12,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  /** Inverte o sentido; usado também quando o Pedro esbarra por cima de lado. */
  turnAround(): void {
    this.direction *= -1;
  }

  private patrolLedges(): void {
    const body = this.arcadeBody;

    if (body.blocked.left) {
      this.direction = 1;
    } else if (body.blocked.right) {
      this.direction = -1;
    } else if (body.blocked.down) {
      const aheadX = this.x + this.direction * (this.profile.bodyWidth / 2 + 6);

      if (!this.isSolidAt(aheadX, body.bottom + 6)) {
        this.turnAround();
      }
    }

    body.setVelocityX(this.direction * this.profile.speed * this.speedMultiplier);
    this.setFlipX(this.direction > 0);
  }

  private patrolRegion(now: number): void {
    const body = this.arcadeBody;

    if (now < this.pausedUntil) {
      body.setVelocityX(0);
      return;
    }

    const leftEdge = this.homeX - ROBOT_PATROL;
    const rightEdge = this.homeX + ROBOT_PATROL;
    const aheadX = this.x + this.direction * (this.profile.bodyWidth / 2 + 6);
    const hitsLimit =
      (this.direction < 0 && (this.x <= leftEdge || body.blocked.left)) ||
      (this.direction > 0 && (this.x >= rightEdge || body.blocked.right)) ||
      (body.blocked.down && !this.isSolidAt(aheadX, body.bottom + 6));

    if (hitsLimit) {
      this.turnAround();
      this.pausedUntil = now + ROBOT_PAUSE_MS;
      body.setVelocityX(0);

      return;
    }

    body.setVelocityX(this.direction * this.profile.speed * this.speedMultiplier);
    this.setFlipX(this.direction > 0);
  }

  private flyFigureEight(now: number): void {
    const seconds = (now / 1000) * this.speedMultiplier + this.phase;
    const targetX = this.homeX + Math.sin(seconds * 0.9) * BAT_RANGE_X;
    const targetY = this.homeY + Math.sin(seconds * 1.8) * BAT_RANGE_Y;

    this.arcadeBody.setVelocity((targetX - this.x) * 6, (targetY - this.y) * 6);
    this.setFlipX(targetX > this.x);
  }

  private haunt(now: number, target: Phaser.Math.Vector2): void {
    const cycle = (now + this.phase * 1000) % (GHOST_VISIBLE_MS + GHOST_FADED_MS);
    const shouldFade = cycle > GHOST_VISIBLE_MS;

    if (shouldFade !== this.isFaded) {
      this.isFaded = shouldFade;
      this.scene.tweens.add({ targets: this, alpha: shouldFade ? 0.22 : 1, duration: 300 });
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if (this.isFaded || distance > GHOST_NOTICE_DISTANCE) {
      // Longe ou sumido, só flutua no lugar.
      this.arcadeBody.setVelocity(0, Math.sin(now / 400 + this.phase) * 20);
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const speed = this.profile.speed * this.speedMultiplier;

    this.arcadeBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setFlipX(target.x > this.x);
  }
}
