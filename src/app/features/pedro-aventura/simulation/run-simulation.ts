import type { LevelDefinition } from '../models/campaign.model';
import {
  type Lane,
  LANE_WIDTH,
  laneX,
  OBSTACLE_SIZE,
  type ObstacleSpec,
  type PickupSpec,
  RAMP_SIZE,
  type TrackLayout,
} from './track.model';

/** Passo fixo da física: 1/60 s, o mesmo em qualquer tela. */
export const RUN_STEP_MS = 1000 / 60;
const STEP_SECONDS = RUN_STEP_MS / 1000;

export const RUN_PHYSICS = {
  gravity: 22,
  jumpSpeed: 9.5,
  rampLaunchSpeed: 10,
  fastFallSpeed: -16,
  lateralSpeed: 14,
  standHeight: 1.7,
  slideHeight: 0.85,
  slideSeconds: 0.7,
  halfWidth: 0.4,
  halfDepth: 0.35,
  /** Pulo apertado um tiquinho antes de tocar o chão ainda vale. */
  jumpBufferSeconds: 0.12,
  /** E um tiquinho depois de sair do chão também. */
  coyoteSeconds: 0.08,
  attackRange: 5,
  attackCooldownSeconds: 0.45,
  attackAnimationSeconds: 0.3,
  pickupReach: 0.9,
} as const;

export const RUN_RULES = {
  maxLives: 3,
  invulnerableSeconds: 1.5,
  respawnInvulnerableSeconds: 2,
  /** Velocidade logo depois de uma batida, como fração da normal. */
  hitSlowdown: 0.55,
  recoverySeconds: 1.2,
  trafficSpeed: 6,
  trafficActivationDistance: 45,
  sweeperAngularSpeed: 1.4,
} as const;

/** Estados da partida. `LOADING` e `ERROR` pertencem à tela, que é quem carrega o motor. */
export type RunPhase = 'ready' | 'playing' | 'paused' | 'victory' | 'defeat';

/** Comandos de um passo. Cada um vale como um toque: segurar não repete. */
export interface RunCommands {
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
  readonly slide: boolean;
  readonly attack: boolean;
}

export const NO_COMMANDS: RunCommands = { left: false, right: false, jump: false, slide: false, attack: false };

export type RunEvent =
  | { readonly type: 'coin' | 'heart' | 'crown'; readonly pickupId: number }
  | { readonly type: 'jump' | 'land' | 'slide' | 'lane' | 'attack' | 'checkpoint' | 'victory' | 'defeat' }
  | { readonly type: 'ramp'; readonly rampId: number }
  | { readonly type: 'hit' | 'break'; readonly obstacleId: number };

/** Obstáculo em jogo: a posição muda para carros andando e barreiras que varrem. */
export interface ObstacleState {
  readonly spec: ObstacleSpec;
  x: number;
  z: number;
  isBroken: boolean;
  isActive: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  lane: Lane;
  verticalSpeed: number;
  isGrounded: boolean;
  slideSeconds: number;
  invulnerableSeconds: number;
  attackSeconds: number;
  speed: number;
}

export interface RunStats {
  readonly timeMs: number;
  readonly coins: number;
  readonly hearts: number;
  readonly crowns: number;
  readonly ramps: number;
  readonly damageTaken: number;
}

export interface RunHud extends RunStats {
  readonly phase: RunPhase;
  readonly lives: number;
  readonly maxLives: number;
  readonly progress: number;
}

/**
 * A corrida em si, sem tela nenhuma.
 *
 * Avança em passos fixos e anota o que aconteceu numa fila de eventos que a
 * cena 3D e a interface consomem. Não conhece three.js nem Angular: é o que
 * permite testar pulo, batida, checkpoint e vitória com números exatos.
 */
export class RunSimulation {
  readonly player: PlayerState;
  readonly obstacles: readonly ObstacleState[];
  private readonly collected = new Set<number>();
  private readonly usedRamps = new Set<number>();
  private readonly events: RunEvent[] = [];
  private phaseValue: RunPhase = 'ready';
  private elapsedSeconds = 0;
  private lives: number = RUN_RULES.maxLives;
  private lastCheckpoint = 0;
  private recoverySeconds = 0;
  private jumpBufferSeconds = 0;
  private airborneSeconds = 0;
  private attackCooldownSeconds = 0;
  private isSlideQueued = false;
  private activeRampId: number | null = null;
  private stats = { coins: 0, hearts: 0, crowns: 0, ramps: 0, damageTaken: 0 };

  constructor(
    readonly level: LevelDefinition,
    readonly layout: TrackLayout,
  ) {
    this.player = {
      x: 0,
      y: 0,
      z: 0,
      lane: 0,
      verticalSpeed: 0,
      isGrounded: true,
      slideSeconds: 0,
      invulnerableSeconds: 0,
      attackSeconds: 0,
      speed: level.startSpeed,
    };
    this.obstacles = layout.obstacles.map((spec) => ({ spec, x: laneX(spec.lane), z: spec.z, isBroken: false, isActive: false }));
  }

  get phase(): RunPhase {
    return this.phaseValue;
  }

  get isSliding(): boolean {
    return this.player.slideSeconds > 0;
  }

  isCollected(pickupId: number): boolean {
    return this.collected.has(pickupId);
  }

  start(): void {
    if (this.phaseValue === 'ready') {
      this.phaseValue = 'playing';
    }
  }

  pause(): void {
    if (this.phaseValue === 'playing') {
      this.phaseValue = 'paused';
    }
  }

  resume(): void {
    if (this.phaseValue === 'paused') {
      this.phaseValue = 'playing';
    }
  }

  /**
   * Depois da derrota, volta ao último checkpoint com os corações cheios.
   *
   * O que já foi pego continua pego e o relógio continua contando: é uma
   * segunda chance, não uma partida nova.
   */
  continueFromCheckpoint(): void {
    if (this.phaseValue !== 'defeat') {
      return;
    }

    const player = this.player;

    player.z = this.lastCheckpoint;
    player.y = 0;
    player.verticalSpeed = 0;
    player.isGrounded = true;
    player.slideSeconds = 0;
    player.invulnerableSeconds = RUN_RULES.respawnInvulnerableSeconds;
    this.lives = RUN_RULES.maxLives;
    this.recoverySeconds = 0;
    this.activeRampId = null;

    for (const obstacle of this.obstacles) {
      if (obstacle.spec.z > this.lastCheckpoint) {
        obstacle.z = obstacle.spec.z;
        obstacle.isActive = false;
      }
    }

    this.phaseValue = 'playing';
  }

  step(commands: RunCommands): void {
    if (this.phaseValue !== 'playing') {
      return;
    }

    this.elapsedSeconds += STEP_SECONDS;
    this.applyCommands(commands);
    this.moveForward();
    this.moveSideways();
    this.moveVertically();
    this.updateTimers();
    this.updateObstacles();
    this.checkPickups();
    this.checkObstacles();
    this.checkCheckpoints();

    if (this.player.z >= this.layout.length && this.phaseValue === 'playing') {
      this.player.z = this.layout.length;
      this.phaseValue = 'victory';
      this.events.push({ type: 'victory' });
    }
  }

  drainEvents(): readonly RunEvent[] {
    return this.events.splice(0, this.events.length);
  }

  result(): RunStats {
    return { timeMs: Math.round(this.elapsedSeconds * 1000), ...this.stats };
  }

  hud(): RunHud {
    return {
      ...this.result(),
      phase: this.phaseValue,
      lives: this.lives,
      maxLives: RUN_RULES.maxLives,
      progress: Math.min(1, this.player.z / this.layout.length),
    };
  }

  /* Comandos --------------------------------------------------------------------------- */

  private applyCommands(commands: RunCommands): void {
    const player = this.player;

    if (commands.left && player.lane > -1) {
      player.lane = (player.lane - 1) as Lane;
      this.events.push({ type: 'lane' });
    }

    if (commands.right && player.lane < 1) {
      player.lane = (player.lane + 1) as Lane;
      this.events.push({ type: 'lane' });
    }

    if (commands.jump) {
      this.jumpBufferSeconds = RUN_PHYSICS.jumpBufferSeconds;
    }

    if (commands.slide) {
      this.startSlide();
    }

    if (commands.attack && this.attackCooldownSeconds <= 0) {
      this.attack();
    }

    const canJump = player.isGrounded || this.airborneSeconds < RUN_PHYSICS.coyoteSeconds;

    if (this.jumpBufferSeconds > 0 && canJump && player.verticalSpeed <= 0) {
      this.jump(RUN_PHYSICS.jumpSpeed);
      this.events.push({ type: 'jump' });
    }
  }

  private jump(speed: number): void {
    const player = this.player;

    player.verticalSpeed = speed;
    player.isGrounded = false;
    player.slideSeconds = 0;
    this.jumpBufferSeconds = 0;
    this.airborneSeconds = RUN_PHYSICS.coyoteSeconds;
    this.activeRampId = null;
  }

  /** No chão, derrapa; no ar, desce rápido e derrapa ao tocar o chão. */
  private startSlide(): void {
    const player = this.player;

    if (player.isGrounded) {
      player.slideSeconds = RUN_PHYSICS.slideSeconds;
      this.events.push({ type: 'slide' });
      return;
    }

    player.verticalSpeed = Math.min(player.verticalSpeed, RUN_PHYSICS.fastFallSpeed);
    this.isSlideQueued = true;
  }

  private attack(): void {
    const player = this.player;

    player.attackSeconds = RUN_PHYSICS.attackAnimationSeconds;
    this.attackCooldownSeconds = RUN_PHYSICS.attackCooldownSeconds;
    this.events.push({ type: 'attack' });

    for (const obstacle of this.obstacles) {
      const ahead = obstacle.z - player.z;

      if (
        obstacle.spec.kind === 'crate' &&
        !obstacle.isBroken &&
        ahead >= -0.5 &&
        ahead <= RUN_PHYSICS.attackRange &&
        Math.abs(obstacle.x - player.x) < LANE_WIDTH / 2
      ) {
        obstacle.isBroken = true;
        this.events.push({ type: 'break', obstacleId: obstacle.spec.id });
      }
    }
  }

  /* Movimento -------------------------------------------------------------------------- */

  private moveForward(): void {
    const { level, player } = this;
    const progress = Math.min(1, player.z / this.layout.length);
    const cruise = level.startSpeed + (level.maxSpeed - level.startSpeed) * progress;
    const recovery = this.recoverySeconds > 0 ? 1 - (1 - RUN_RULES.hitSlowdown) * (this.recoverySeconds / RUN_RULES.recoverySeconds) : 1;

    player.speed = cruise * recovery;
    player.z += player.speed * STEP_SECONDS;
  }

  private moveSideways(): void {
    const player = this.player;
    const target = laneX(player.lane);
    const maxStep = RUN_PHYSICS.lateralSpeed * STEP_SECONDS;
    const delta = target - player.x;

    player.x = Math.abs(delta) <= maxStep ? target : player.x + Math.sign(delta) * maxStep;
  }

  private moveVertically(): void {
    const player = this.player;
    const ramp = this.rampUnderPlayer();

    if (player.isGrounded && ramp) {
      const along = player.z - ramp.z;

      if (along >= RAMP_SIZE.length) {
        player.y = RAMP_SIZE.height;
        this.jump(RUN_PHYSICS.rampLaunchSpeed);

        if (!this.usedRamps.has(ramp.id)) {
          this.usedRamps.add(ramp.id);
          this.stats.ramps += 1;
          this.events.push({ type: 'ramp', rampId: ramp.id });
        }

        return;
      }

      this.activeRampId = ramp.id;
      player.y = (along / RAMP_SIZE.length) * RAMP_SIZE.height;
      return;
    }

    if (player.isGrounded && player.y > 0) {
      // Saiu da rampa pelo lado: cai em vez de teleportar para o chão.
      this.activeRampId = null;
      player.isGrounded = false;
      player.verticalSpeed = 0;
    } else if (player.isGrounded) {
      this.activeRampId = null;
      return;
    }

    player.verticalSpeed -= RUN_PHYSICS.gravity * STEP_SECONDS;
    player.y += player.verticalSpeed * STEP_SECONDS;

    if (player.y <= 0) {
      player.y = 0;
      player.verticalSpeed = 0;
      player.isGrounded = true;
      this.airborneSeconds = 0;
      this.events.push({ type: 'land' });

      if (this.isSlideQueued) {
        this.isSlideQueued = false;
        player.slideSeconds = RUN_PHYSICS.slideSeconds;
        this.events.push({ type: 'slide' });
      }
    }
  }

  /** Rampa sob o Pedro, quando ele está na faixa dela e em cima do comprimento dela. */
  private rampUnderPlayer(): { readonly id: number; readonly z: number } | null {
    const player = this.player;

    for (const ramp of this.layout.ramps) {
      const along = player.z - ramp.z;
      const isOnLane = Math.abs(player.x - laneX(ramp.lane)) < RAMP_SIZE.width / 2;
      const isOnLength = along >= 0 && (along <= RAMP_SIZE.length || this.activeRampId === ramp.id);

      if (isOnLane && isOnLength) {
        return ramp;
      }
    }

    return null;
  }

  private updateTimers(): void {
    const player = this.player;

    player.slideSeconds = Math.max(0, player.slideSeconds - STEP_SECONDS);
    player.invulnerableSeconds = Math.max(0, player.invulnerableSeconds - STEP_SECONDS);
    player.attackSeconds = Math.max(0, player.attackSeconds - STEP_SECONDS);
    this.attackCooldownSeconds = Math.max(0, this.attackCooldownSeconds - STEP_SECONDS);
    this.recoverySeconds = Math.max(0, this.recoverySeconds - STEP_SECONDS);
    this.jumpBufferSeconds = Math.max(0, this.jumpBufferSeconds - STEP_SECONDS);

    if (!player.isGrounded) {
      this.airborneSeconds += STEP_SECONDS;
    }
  }

  /* Mundo ------------------------------------------------------------------------------ */

  private updateObstacles(): void {
    const player = this.player;

    for (const obstacle of this.obstacles) {
      switch (obstacle.spec.kind) {
        case 'traffic-car':
          if (!obstacle.isActive && obstacle.z - player.z <= RUN_RULES.trafficActivationDistance) {
            obstacle.isActive = true;
          }

          if (obstacle.isActive) {
            obstacle.z -= RUN_RULES.trafficSpeed * STEP_SECONDS;
          }

          break;
        case 'sweeper':
          // Cada barreira começa num ponto diferente do vaivém, pela posição na pista.
          obstacle.x = Math.sin(this.elapsedSeconds * RUN_RULES.sweeperAngularSpeed + obstacle.spec.z) * LANE_WIDTH;
          break;
        default:
          break;
      }
    }
  }

  private checkPickups(): void {
    const player = this.player;
    const height = this.isSliding ? RUN_PHYSICS.slideHeight : RUN_PHYSICS.standHeight;

    for (const pickup of this.layout.pickups) {
      if (pickup.z > player.z + RUN_PHYSICS.pickupReach) {
        break;
      }

      if (this.collected.has(pickup.id) || player.z - pickup.z > RUN_PHYSICS.pickupReach) {
        continue;
      }

      const isLevel = pickup.y >= player.y - 0.3 && pickup.y <= player.y + height + 0.3;

      if (isLevel && Math.abs(laneX(pickup.lane) - player.x) < RUN_PHYSICS.pickupReach) {
        this.collect(pickup);
      }
    }
  }

  private collect(pickup: PickupSpec): void {
    this.collected.add(pickup.id);

    switch (pickup.kind) {
      case 'coin':
        this.stats.coins += 1;
        break;
      case 'heart':
        this.stats.hearts += 1;
        this.lives = Math.min(RUN_RULES.maxLives, this.lives + 1);
        break;
      case 'crown':
        this.stats.crowns += 1;
        break;
    }

    this.events.push({ type: pickup.kind, pickupId: pickup.id });
  }

  private checkObstacles(): void {
    const player = this.player;

    if (player.invulnerableSeconds > 0) {
      return;
    }

    const height = this.isSliding ? RUN_PHYSICS.slideHeight : RUN_PHYSICS.standHeight;

    for (const obstacle of this.obstacles) {
      if (obstacle.isBroken) {
        continue;
      }

      const size = OBSTACLE_SIZE[obstacle.spec.kind];
      const overlapsZ = Math.abs(obstacle.z - player.z) < size.depth / 2 + RUN_PHYSICS.halfDepth;
      const overlapsX = Math.abs(obstacle.x - player.x) < size.width / 2 + RUN_PHYSICS.halfWidth;
      const overlapsY = player.y < size.bottom + size.height && player.y + height > size.bottom;

      if (overlapsZ && overlapsX && overlapsY) {
        this.hit(obstacle);
        return;
      }
    }
  }

  private hit(obstacle: ObstacleState): void {
    this.lives -= 1;
    this.stats.damageTaken += 1;
    this.player.invulnerableSeconds = RUN_RULES.invulnerableSeconds;
    this.recoverySeconds = RUN_RULES.recoverySeconds;
    this.events.push({ type: 'hit', obstacleId: obstacle.spec.id });

    if (obstacle.spec.kind === 'crate') {
      obstacle.isBroken = true;
      this.events.push({ type: 'break', obstacleId: obstacle.spec.id });
    }

    if (this.lives <= 0) {
      this.lives = 0;
      this.phaseValue = 'defeat';
      this.events.push({ type: 'defeat' });
    }
  }

  private checkCheckpoints(): void {
    const passed = this.layout.checkpoints.filter((checkpoint) => checkpoint <= this.player.z).at(-1) ?? 0;

    if (passed > this.lastCheckpoint) {
      this.lastCheckpoint = passed;
      this.events.push({ type: 'checkpoint' });
    }
  }
}
