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
  /** A bola de fogo se apaga nele sem derrotá-lo. */
  readonly isFireproof: boolean;
}

const PROFILES: Readonly<Record<EnemyKind, EnemyProfile>> = {
  slime: { speed: 60, bodyWidth: 34, bodyHeight: 24, flies: false, isStompable: true, isFireproof: false },
  spiky: { speed: 50, bodyWidth: 32, bodyHeight: 26, flies: false, isStompable: false, isFireproof: false },
  robot: { speed: 110, bodyWidth: 30, bodyHeight: 34, flies: false, isStompable: true, isFireproof: false },
  bat: { speed: 1, bodyWidth: 26, bodyHeight: 20, flies: true, isStompable: true, isFireproof: false },
  ghost: { speed: 50, bodyWidth: 30, bodyHeight: 32, flies: true, isStompable: true, isFireproof: false },
  turtle: { speed: 40, bodyWidth: 34, bodyHeight: 30, flies: false, isStompable: true, isFireproof: false },
  piranha: { speed: 0, bodyWidth: 26, bodyHeight: 40, flies: false, isStompable: false, isFireproof: false },
  penguin: { speed: 95, bodyWidth: 30, bodyHeight: 34, flies: false, isStompable: true, isFireproof: false },
  'lava-bubble': { speed: 0, bodyWidth: 26, bodyHeight: 26, flies: true, isStompable: false, isFireproof: true },
  bee: { speed: 85, bodyWidth: 28, bodyHeight: 24, flies: true, isStompable: true, isFireproof: false },
};

/** Distância que o robô patrulha para cada lado do ponto de partida. */
const ROBOT_PATROL = TILE_SIZE * 4;
const ROBOT_PAUSE_MS = 450;

const BAT_RANGE_X = TILE_SIZE * 2;
const BAT_RANGE_Y = TILE_SIZE * 0.6;

const GHOST_VISIBLE_MS = 2600;
const GHOST_FADED_MS = 1600;
const GHOST_NOTICE_DISTANCE = 340;

/** Ciclo da planta carnívora: escondida, subindo, de fora e descendo. */
const PIRANHA_HIDDEN_MS = 1800;
const PIRANHA_RISE_MS = 350;
const PIRANHA_OUT_MS = 1500;
const PIRANHA_SINK_MS = 350;
const PIRANHA_CYCLE_MS = PIRANHA_HIDDEN_MS + PIRANHA_RISE_MS + PIRANHA_OUT_MS + PIRANHA_SINK_MS;
/** Com o Pedro colado no cano, a planta espera: ninguém é mordido sem ver. */
const PIRANHA_SHY_DISTANCE = TILE_SIZE * 1.5;

/** Distância que a abelha voa para cada lado do ponto de partida. */
const BEE_PATROL = TILE_SIZE * 3;
const BEE_BOB_HEIGHT = 30;

/** Ciclo da bolinha de lava: espera na lava e dá um salto alto. */
const LAVA_BUBBLE_WAIT_MS = 1100;
const LAVA_BUBBLE_JUMP_MS = 1500;
const LAVA_BUBBLE_HEIGHT = TILE_SIZE * 4.2;
/** Quão rápido o corpo persegue o ponto do salto: alto para seguir a curva de perto. */
const LAVA_BUBBLE_STEERING = 12;

/** Tempo da animação de derrota antes de o inimigo sair da partida. */
export const ENEMY_DEFEAT_MS = 280;

/**
 * Inimigo comum.
 *
 * Cada tipo tem um jeito de andar: o slime e o espinhudo vão e voltam sem cair
 * das beiradas, o robô patrulha um trecho com paradinhas, o morcego voa num
 * oito e o fantasminha segue o Pedro devagar, sumindo de tempos em tempos.
 * Invisível, o fantasminha não machuca — é a hora de passar por ele. A
 * tartaruga anda como o slime, só que mais devagar, e a planta carnívora não
 * sai do lugar: sobe e desce do cano, e escondida também não machuca. O
 * pinguim patrulha como o slime, mais ligeiro, e a bolinha de lava salta da
 * lava e mergulha de volta, sem machucar enquanto está lá dentro. A abelha
 * voa de um lado para o outro, subindo e descendo de leve.
 */
export class Enemy {
  readonly body: PhysicsBody;
  isDefeated = false;
  defeatedAt = 0;
  /** Fantasma sumido ou planta dentro do cano: não machuca nem é atingido. */
  isHidden = false;
  /** Quanto a planta está para fora do cano, de 0 a 1; os outros estão sempre inteiros. */
  emergence = 1;
  /** 1 olhando para a direita, -1 para a esquerda. */
  direction: 1 | -1 = -1;

  private readonly profile: EnemyProfile;
  private readonly homeX: number;
  private readonly homeY: number;
  private pausedUntil = 0;
  private piranhaCycleMs: number;
  private lastStepAt: number | null = null;

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
    this.piranhaCycleMs = (phase / (Math.PI * 2)) * PIRANHA_CYCLE_MS;

    if (kind === 'piranha') {
      this.emergence = piranhaEmergence(this.piranhaCycleMs);
      this.isHidden = this.emergence < 0.5;
    }

    if (kind === 'lava-bubble') {
      this.emergence = 0;
      this.isHidden = true;
    }
  }

  get flies(): boolean {
    return this.profile.flies;
  }

  /** Pisar em cima derrota o inimigo? O espinhudo e o fantasma sumido, não. */
  get canBeStomped(): boolean {
    return this.profile.isStompable && !this.isHidden;
  }

  get isFireproof(): boolean {
    return this.profile.isFireproof;
  }

  get isHarmful(): boolean {
    return !this.isDefeated && !this.isHidden;
  }

  step(now: number, targetX: number, targetY: number): void {
    if (this.isDefeated) {
      return;
    }

    switch (this.kind) {
      case 'slime':
      case 'spiky':
      case 'turtle':
      case 'penguin':
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
      case 'piranha':
        this.lurkInPipe(now, targetX);
        return;
      case 'lava-bubble':
        this.leapFromLava(now);
        return;
      case 'bee':
        this.buzzAround(now);
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

    this.isHidden = cycle > GHOST_VISIBLE_MS;

    const x = centerX(this.body);
    const y = centerY(this.body);
    const distance = Math.hypot(targetX - x, targetY - y);

    if (this.isHidden || distance > GHOST_NOTICE_DISTANCE) {
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

  private lurkInPipe(now: number, targetX: number): void {
    const elapsed = this.lastStepAt === null ? 0 : now - this.lastStepAt;
    const x = centerX(this.body);
    const isWaitingForPedro = this.piranhaCycleMs < PIRANHA_HIDDEN_MS && Math.abs(targetX - x) < PIRANHA_SHY_DISTANCE;

    this.lastStepAt = now;
    this.body.vx = 0;
    this.direction = targetX > x ? 1 : -1;

    if (!isWaitingForPedro) {
      this.piranhaCycleMs = (this.piranhaCycleMs + elapsed) % PIRANHA_CYCLE_MS;
    }

    this.emergence = piranhaEmergence(this.piranhaCycleMs);
    this.isHidden = this.emergence < 0.5;
  }

  private buzzAround(now: number): void {
    const body = this.body;
    const x = centerX(body);
    const isAtLimit =
      (this.direction < 0 && (x <= this.homeX - BEE_PATROL || body.blockedLeft)) ||
      (this.direction > 0 && (x >= this.homeX + BEE_PATROL || body.blockedRight));

    if (isAtLimit) {
      this.turnAround();
    }

    body.vx = this.direction * this.profile.speed * this.speedMultiplier;
    body.vy = Math.cos(now / 300 + this.phase) * BEE_BOB_HEIGHT;
  }

  private leapFromLava(now: number): void {
    const cycle = (now + this.phase * 1000) % (LAVA_BUBBLE_WAIT_MS + LAVA_BUBBLE_JUMP_MS);
    const progress = Math.max(0, (cycle - LAVA_BUBBLE_WAIT_MS) / LAVA_BUBBLE_JUMP_MS);
    // Parábola de 0 a 1 e de volta a 0: sobe rápido, para no alto e desce.
    const height = LAVA_BUBBLE_HEIGHT * 4 * progress * (1 - progress);

    this.body.vx = 0;
    this.body.vy = (this.homeY - height - centerY(this.body)) * LAVA_BUBBLE_STEERING;
    this.isHidden = progress === 0;
    this.emergence = this.isHidden ? 0 : 1;
  }

  private hasGroundAhead(): boolean {
    const aheadX = centerX(this.body) + this.direction * (this.body.width / 2 + 6);

    return this.hasGroundAt(aheadX, bottom(this.body) + 6);
  }

  private turnAround(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }
}

function piranhaEmergence(cycleMs: number): number {
  const rising = cycleMs - PIRANHA_HIDDEN_MS;
  const sinking = rising - PIRANHA_RISE_MS - PIRANHA_OUT_MS;

  if (rising < 0) {
    return 0;
  }

  if (rising < PIRANHA_RISE_MS) {
    return rising / PIRANHA_RISE_MS;
  }

  return sinking < 0 ? 1 : Math.max(0, 1 - sinking / PIRANHA_SINK_MS);
}
