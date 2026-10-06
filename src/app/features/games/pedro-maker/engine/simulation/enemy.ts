import { TILE_SIZE } from '../../config/physics.config';
import type { EnemyKind } from '../../models/level.model';
import { bottom, centerX, centerY, createBody, type PhysicsBody } from './physics-body';

/** Pergunta à partida se há onde pisar num ponto do mundo. */
export type GroundProbe = (worldX: number, worldY: number) => boolean;

interface EnemyProfile {
  readonly speed: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly flies: boolean;
  readonly isStompable: boolean;
}

const PROFILES: Readonly<Record<EnemyKind, EnemyProfile>> = {
  slime: { speed: 60, bodyWidth: 34, bodyHeight: 24, flies: false, isStompable: true },
  spiky: { speed: 50, bodyWidth: 32, bodyHeight: 26, flies: false, isStompable: false },
  robot: { speed: 110, bodyWidth: 30, bodyHeight: 34, flies: false, isStompable: true },
  bat: { speed: 1, bodyWidth: 26, bodyHeight: 20, flies: true, isStompable: true },
  ghost: { speed: 50, bodyWidth: 30, bodyHeight: 32, flies: true, isStompable: true },
};

/** Distância que o robô patrulha para cada lado do ponto de partida. */
const ROBOT_PATROL = TILE_SIZE * 4;
const ROBOT_PAUSE_MS = 450;

const BAT_RANGE_X = TILE_SIZE * 2;
const BAT_RANGE_Y = TILE_SIZE * 0.6;

const GHOST_VISIBLE_MS = 2600;
const GHOST_FADED_MS = 1600;
const GHOST_NOTICE_DISTANCE = 340;

/** Tempo da animação de derrota antes de o inimigo sair da partida. */
export const ENEMY_DEFEAT_MS = 280;

/**
 * Inimigo comum.
 *
 * Cada tipo tem um jeito de andar: o slime e o espinhudo vão e voltam sem cair
 * das beiradas, o robô patrulha um trecho com paradinhas, o morcego voa num
 * oito e o fantasminha segue o Pedro devagar, sumindo de tempos em tempos.
 * Invisível, o fantasminha não machuca — é a hora de passar por ele.
 */
export class Enemy {
  readonly body: PhysicsBody;
  isDefeated = false;
  defeatedAt = 0;
  isFaded = false;
  /** 1 olhando para a direita, -1 para a esquerda. */
  direction: 1 | -1 = -1;

  private readonly profile: EnemyProfile;
  private readonly homeX: number;
  private readonly homeY: number;
  private pausedUntil = 0;

  constructor(
    readonly id: number,
    readonly kind: EnemyKind,
    cellX: number,
    cellY: number,
    private readonly speedMultiplier: number,
    private readonly hasGroundAt: GroundProbe,
    /** Fase da animação: dois morcegos vizinhos não batem asas em sincronia. */
    private readonly phase: number,
    /** Ajudantes do chefão são menores. */
    readonly scale = 1,
  ) {
    const profile = PROFILES[kind];

    this.profile = profile;
    this.body = createBody(profile.bodyWidth * scale, profile.bodyHeight * scale, !profile.flies);
    this.body.x = cellX * TILE_SIZE + TILE_SIZE / 2 - this.body.width / 2;
    this.body.y = profile.flies ? cellY * TILE_SIZE + (TILE_SIZE - this.body.height) / 2 : (cellY + 1) * TILE_SIZE - this.body.height;
    this.body.previousX = this.body.x;
    this.body.previousY = this.body.y;
    this.homeX = centerX(this.body);
    this.homeY = centerY(this.body);
  }

  get flies(): boolean {
    return this.profile.flies;
  }

  /** Pisar em cima derrota o inimigo? O espinhudo e o fantasma sumido, não. */
  get canBeStomped(): boolean {
    return this.profile.isStompable && !this.isFaded;
  }

  get isHarmful(): boolean {
    return !this.isDefeated && !this.isFaded;
  }

  step(now: number, targetX: number, targetY: number): void {
    if (this.isDefeated) {
      return;
    }

    switch (this.kind) {
      case 'slime':
      case 'spiky':
        this.patrolLedges();
        return;
      case 'robot':
        this.patrolRegion(now);
        return;
      case 'bat':
        this.flyFigureEight(now);
        return;
      case 'ghost':
        this.haunt(now, targetX, targetY);
        return;
    }
  }

  /** Longe do Pedro, o inimigo espera: poupa processamento e não foge da fase. */
  freeze(): void {
    this.body.vx = 0;

    if (this.profile.flies) {
      this.body.vy = 0;
    }
  }

  defeat(now: number): void {
    this.isDefeated = true;
    this.defeatedAt = now;
    this.body.vx = 0;
    this.body.vy = 0;
  }

  private patrolLedges(): void {
    const body = this.body;

    if (body.blockedLeft) {
      this.direction = 1;
    } else if (body.blockedRight) {
      this.direction = -1;
    } else if (body.blockedDown && !this.hasGroundAhead()) {
      this.turnAround();
    }

    body.vx = this.direction * this.profile.speed * this.speedMultiplier;
  }

  private patrolRegion(now: number): void {
    const body = this.body;

    if (now < this.pausedUntil) {
      body.vx = 0;
      return;
    }

    const x = centerX(body);
    const hitsLimit =
      (this.direction < 0 && (x <= this.homeX - ROBOT_PATROL || body.blockedLeft)) ||
      (this.direction > 0 && (x >= this.homeX + ROBOT_PATROL || body.blockedRight)) ||
      (body.blockedDown && !this.hasGroundAhead());

    if (hitsLimit) {
      this.turnAround();
      this.pausedUntil = now + ROBOT_PAUSE_MS;
      body.vx = 0;

      return;
    }

    body.vx = this.direction * this.profile.speed * this.speedMultiplier;
  }

  private flyFigureEight(now: number): void {
    const seconds = (now / 1000) * this.speedMultiplier + this.phase;
    const targetX = this.homeX + Math.sin(seconds * 0.9) * BAT_RANGE_X;
    const targetY = this.homeY + Math.sin(seconds * 1.8) * BAT_RANGE_Y;
    const x = centerX(this.body);

    this.body.vx = (targetX - x) * 6;
    this.body.vy = (targetY - centerY(this.body)) * 6;
    this.direction = targetX > x ? 1 : -1;
  }

  private haunt(now: number, targetX: number, targetY: number): void {
    const cycle = (now + this.phase * 1000) % (GHOST_VISIBLE_MS + GHOST_FADED_MS);

    this.isFaded = cycle > GHOST_VISIBLE_MS;

    const x = centerX(this.body);
    const y = centerY(this.body);
    const distance = Math.hypot(targetX - x, targetY - y);

    if (this.isFaded || distance > GHOST_NOTICE_DISTANCE) {
      // Longe ou sumido, só flutua no lugar.
      this.body.vx = 0;
      this.body.vy = Math.sin(now / 400 + this.phase) * 20;
      return;
    }

    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = this.profile.speed * this.speedMultiplier;

    this.body.vx = Math.cos(angle) * speed;
    this.body.vy = Math.sin(angle) * speed;
    this.direction = targetX > x ? 1 : -1;
  }

  private hasGroundAhead(): boolean {
    const aheadX = centerX(this.body) + this.direction * (this.body.width / 2 + 6);

    return this.hasGroundAt(aheadX, bottom(this.body) + 6);
  }

  private turnAround(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }
}
