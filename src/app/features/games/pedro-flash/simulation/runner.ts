import { ROAD_HALF_WIDTH } from '../course/course-geometry';
import type { ShoeStats } from '../models/runner.model';

/** O que quem corre pede a cada passo. O corredor acelera sozinho. */
export interface RunInput {
  /** De -1 (esquerda) a 1 (direita). */
  readonly steer: number;
  /** Verdadeiro só no passo em que o botão de pulo foi apertado. */
  readonly jump: boolean;
  /** Verdadeiro só no passo em que o botão do raio foi apertado. */
  readonly dash: boolean;
}

export const IDLE_RUN: RunInput = { steer: 0, jump: false, dash: false };

/** O que sai da caixa surpresa. */
export type RunnerPower = 'escudo' | 'ima' | 'energia';

/** Jeito de estar no ar, para o desenho escolher a pose. */
export type AirStyle = 'pulo' | 'mola' | 'rampa' | 'quique';

/** Números de corrida derivados das notas do tênis. */
export interface RunnerHandling {
  readonly maxSpeed: number;
  readonly acceleration: number;
  readonly jumpSpeed: number;
}

/** Algo que o ataque teleguiado persegue: um robô ou o chefão cansado. */
export interface HomingTarget {
  readonly distance: number;
  readonly lateral: number;
  readonly height: number;
}

export const RUNNER_PHYSICS = {
  gravity: 40,
  springSpeed: 26,
  rampSpeed: 17,
  lateralSpeed: 15,
  lateralAcceleration: 80,
  coastDeceleration: 9,
  boostSpeedFactor: 1.45,
  boostSeconds: 1.4,
  dashSpeedFactor: 1.6,
  dashSeconds: 2.6,
  dashCost: 50,
  maxEnergy: 100,
  stumbleSeconds: 0.9,
  stumbleSpeedFactor: 0.35,
  invulnerableSeconds: 2,
  bounceSpeed: 13,
  homingSpeed: 60,
  homingMaxSeconds: 0.7,
  airDashSpeed: 8,
  magnetSeconds: 10,
  bumpSpeedKeep: 0.45,
  /** Raio do corpo para encostar nas coisas, e a altura do centro dele em pé. */
  radius: 0.8,
  centerHeight: 0.85,
} as const;

/** Até onde o corredor vai para o lado antes de encostar na mureta da pista. */
export const LATERAL_LIMIT = ROAD_HALF_WIDTH - RUNNER_PHYSICS.radius;

export function handlingFor(stats: ShoeStats): RunnerHandling {
  return {
    maxSpeed: 30 + stats.speed * 3,
    acceleration: 10 + stats.acceleration * 4,
    jumpSpeed: 12.5 + stats.jump * 0.7,
  };
}

/**
 * Um corredor na fase: o Pedro ou um adversário.
 *
 * Tudo é medido na própria pista — quanto já correu, quanto está para o lado
 * e a que altura do chão —, e não no mundo: é assim que o looping funciona
 * sem física especial, porque "o chão" gira junto com a pista.
 *
 * Os campos mudam a cada passo; quem desenha só lê. Fica mutável de
 * propósito, para não criar um objeto novo por corredor a cada passo.
 */
export class Runner {
  distance = 0;
  lateral = 0;
  height = 0;
  previousDistance = 0;
  previousLateral = 0;
  previousHeight = 0;

  speed = 0;
  lateralVelocity = 0;
  verticalVelocity = 0;
  isGrounded = true;
  /** Abaixo da pista, dentro de um buraco, sem volta: só resta reaparecer. */
  isFalling = false;
  airStyle: AirStyle = 'pulo';
  /** Um pulo dá direito a uma ação no ar: o ataque teleguiado ou o impulso. */
  hasAirAction = false;
  homingTarget: HomingTarget | null = null;
  private homingSeconds = 0;

  raios = 0;
  energy = 0;
  hasShield = false;
  magnetSeconds = 0;
  boostSeconds = 0;
  dashSeconds = 0;
  stumbleSeconds = 0;
  invulnerableSeconds = 0;

  hitsTaken = 0;
  enemiesDefeated = 0;
  finishTimeMs: number | null = null;
  /** Último volante pedido, para o desenho inclinar o corpo. */
  steer = 0;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly handling: RunnerHandling,
    readonly isPlayer: boolean,
  ) {}

  get hasFinished(): boolean {
    return this.finishTimeMs !== null;
  }

  get isDashing(): boolean {
    return this.dashSeconds > 0;
  }

  get isHoming(): boolean {
    return this.homingTarget !== null;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableSeconds > 0 || this.isDashing;
  }

  get isStumbling(): boolean {
    return this.stumbleSeconds > 0;
  }

  /** No ar (pulando, quicando ou no ataque) ou no raio, o corredor derruba robôs. */
  get isAttacking(): boolean {
    return (!this.isGrounded && !this.isFalling) || this.isDashing || this.isHoming;
  }

  get canDash(): boolean {
    return this.energy >= RUNNER_PHYSICS.dashCost && !this.isDashing;
  }

  placeAt(distance: number, lateral: number): void {
    this.distance = distance;
    this.lateral = lateral;
    this.height = 0;
    this.rememberPose();
  }

  rememberPose(): void {
    this.previousDistance = this.distance;
    this.previousLateral = this.lateral;
    this.previousHeight = this.height;
  }

  /**
   * Um passo da física de fliperama.
   *
   * O corredor acelera sozinho até a velocidade-alvo — a normal, a do
   * tropeção, a do turbo ou a do raio —, vira para os lados com um pouco de
   * inércia e, no ar, cai com a gravidade da pista.
   */
  run(input: RunInput, seconds: number, paceFactor: number): void {
    this.rememberPose();
    this.tickTimers(seconds);
    this.steer = input.steer;

    const target = this.targetSpeed(paceFactor);
    const rate = this.speed < target ? this.handling.acceleration : RUNNER_PHYSICS.coastDeceleration;

    this.speed = this.isFalling ? 0 : approach(this.speed, target, rate * seconds);

    // No ataque teleguiado quem move o corredor é `home`, direto até o alvo.
    if (this.isHoming) {
      return;
    }

    this.lateralVelocity = approach(
      this.lateralVelocity,
      clamp(input.steer, -1, 1) * RUNNER_PHYSICS.lateralSpeed,
      RUNNER_PHYSICS.lateralAcceleration * seconds,
    );
    this.lateral += this.lateralVelocity * seconds;

    if (Math.abs(this.lateral) > LATERAL_LIMIT) {
      this.lateral = Math.sign(this.lateral) * LATERAL_LIMIT;
      this.lateralVelocity = 0;
    }

    if (!this.isGrounded) {
      this.verticalVelocity -= RUNNER_PHYSICS.gravity * seconds;
      this.height += this.verticalVelocity * seconds;
    }

    this.distance += this.speed * seconds;
  }

  /**
   * Voa até o alvo do ataque teleguiado, sem gravidade no caminho.
   *
   * Desiste depois de um tempo: um alvo que fugiu não pode deixar o
   * corredor pendurado no ar.
   */
  home(target: HomingTarget, seconds: number): void {
    this.homingSeconds += seconds;

    if (this.homingSeconds > RUNNER_PHYSICS.homingMaxSeconds) {
      this.homingTarget = null;
      return;
    }

    const toDistance = target.distance - this.distance;
    const toLateral = target.lateral - this.lateral;
    const toHeight = target.height - (this.height + RUNNER_PHYSICS.centerHeight);
    const gap = Math.hypot(toDistance, toLateral, toHeight);
    const step = Math.min(gap, RUNNER_PHYSICS.homingSpeed * seconds);
    const scale = gap > 0 ? step / gap : 0;

    this.distance += toDistance * scale;
    this.lateral = clamp(this.lateral + toLateral * scale, -LATERAL_LIMIT, LATERAL_LIMIT);
    this.height += toHeight * scale;
    this.verticalVelocity = 0;
    this.speed = Math.max(this.speed, this.handling.maxSpeed);
  }

  jump(): boolean {
    if (!this.isGrounded || this.isFalling) {
      return false;
    }

    this.launch(this.handling.jumpSpeed, 'pulo');

    return true;
  }

  /** Sai do chão com a velocidade pedida: pulo, mola ou rampa. */
  launch(verticalSpeed: number, style: AirStyle): void {
    this.isGrounded = false;
    this.verticalVelocity = verticalSpeed;
    this.airStyle = style;
    this.hasAirAction = true;
  }

  startHoming(target: HomingTarget): void {
    this.homingTarget = target;
    this.homingSeconds = 0;
    this.hasAirAction = false;
  }

  /** Sem alvo por perto, o segundo toque no ar vira um impulso para a frente. */
  airDash(): boolean {
    if (this.isGrounded || !this.hasAirAction) {
      return false;
    }

    this.hasAirAction = false;
    this.speed += RUNNER_PHYSICS.airDashSpeed;
    this.verticalVelocity = Math.max(this.verticalVelocity, 3);

    return true;
  }

  /** Acertou um robô: quica para cima, pronto para emendar o próximo ataque. */
  bounce(): void {
    this.homingTarget = null;
    this.launch(RUNNER_PHYSICS.bounceSpeed, 'quique');
  }

  /** Pisou firme na pista. Devolve verdadeiro só no passo do pouso. */
  land(): boolean {
    if (this.isGrounded) {
      return false;
    }

    this.isGrounded = true;
    this.height = 0;
    this.verticalVelocity = 0;
    this.homingTarget = null;
    this.hasAirAction = false;

    return true;
  }

  /** O chão sumiu embaixo dos pés: começa a cair, ainda podendo voltar à pista. */
  leaveGround(): void {
    this.isGrounded = false;
    this.verticalVelocity = Math.min(0, this.verticalVelocity);
    this.airStyle = 'pulo';
  }

  /** Passou do ponto de voltar: despenca reto, sem andar para a frente embaixo da pista. */
  startFalling(): void {
    this.isFalling = true;
    this.homingTarget = null;
    this.hasAirAction = false;
    this.speed = 0;
  }

  /** Volta para a pista depois de cair no buraco, devagar e protegido por um instante. */
  respawnAt(distance: number): void {
    this.isFalling = false;
    this.isGrounded = true;
    this.homingTarget = null;
    this.hasAirAction = false;
    this.verticalVelocity = 0;
    this.lateralVelocity = 0;
    this.speed = this.handling.maxSpeed * 0.5;
    this.invulnerableSeconds = RUNNER_PHYSICS.invulnerableSeconds;
    this.placeAt(distance, 0);
  }

  startBoost(): void {
    this.boostSeconds = RUNNER_PHYSICS.boostSeconds;
  }

  /** Modo relâmpago: gasta energia e vira um raio que atravessa tudo. */
  startDash(): boolean {
    if (!this.canDash) {
      return false;
    }

    this.energy -= RUNNER_PHYSICS.dashCost;
    this.dashSeconds = RUNNER_PHYSICS.dashSeconds;
    this.stumbleSeconds = 0;

    return true;
  }

  addEnergy(amount: number): void {
    this.energy = Math.min(RUNNER_PHYSICS.maxEnergy, this.energy + amount);
  }

  stumble(): void {
    this.speed *= RUNNER_PHYSICS.stumbleSpeedFactor;
    this.stumbleSeconds = RUNNER_PHYSICS.stumbleSeconds;
    this.boostSeconds = 0;
    this.protect();
  }

  /** Bateu na barreira: perde embalo, mas atravessa e continua correndo. */
  bump(): void {
    this.speed *= RUNNER_PHYSICS.bumpSpeedKeep;
    this.boostSeconds = 0;
  }

  protect(): void {
    this.invulnerableSeconds = RUNNER_PHYSICS.invulnerableSeconds;
  }

  private targetSpeed(paceFactor: number): number {
    const normal = this.handling.maxSpeed * paceFactor;

    if (this.isDashing) {
      return Math.max(normal, this.handling.maxSpeed * RUNNER_PHYSICS.dashSpeedFactor);
    }

    if (this.boostSeconds > 0) {
      return Math.max(normal, this.handling.maxSpeed * RUNNER_PHYSICS.boostSpeedFactor);
    }

    return this.isStumbling ? normal * RUNNER_PHYSICS.stumbleSpeedFactor : normal;
  }

  private tickTimers(seconds: number): void {
    this.boostSeconds = Math.max(0, this.boostSeconds - seconds);
    this.dashSeconds = Math.max(0, this.dashSeconds - seconds);
    this.stumbleSeconds = Math.max(0, this.stumbleSeconds - seconds);
    this.invulnerableSeconds = Math.max(0, this.invulnerableSeconds - seconds);
    this.magnetSeconds = Math.max(0, this.magnetSeconds - seconds);
  }
}

export function approach(current: number, target: number, step: number): number {
  if (current < target) {
    return Math.min(target, current + step);
  }

  return Math.max(target, current - step);
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
