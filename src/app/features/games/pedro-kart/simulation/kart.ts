import type { KartStats } from '../models/kart.model';

/** O que o piloto pede ao kart a cada passo. O kart acelera sozinho. */
export interface DriveInput {
  /** De -1 (esquerda) a 1 (direita). */
  readonly steer: number;
  readonly brake: boolean;
  readonly useItem: boolean;
}

export const IDLE_DRIVE: DriveInput = { steer: 0, brake: false, useItem: false };

export type KartItem = 'turbo' | 'estrela' | 'casca';

/** Números de direção derivados das notas da garagem. */
export interface KartHandling {
  readonly maxSpeed: number;
  readonly acceleration: number;
  /** Quanto o kart vira por segundo, em radianos, na velocidade máxima de curva. */
  readonly turnRate: number;
}

export const KART_PHYSICS = {
  /** Fora do asfalto, a grama segura o kart nesta fração da velocidade máxima. */
  grassSpeedFactor: 0.5,
  brakeDeceleration: 34,
  coastDeceleration: 6,
  reverseSpeed: 8,
  boostSpeedFactor: 1.45,
  boostSeconds: 1.2,
  starSpeedFactor: 1.2,
  starSeconds: 5,
  spinSeconds: 0.9,
  /** Batida no muro: o kart perde parte da velocidade, mas nunca para de vez. */
  wallSpeedKeep: 0.55,
  radius: 1.3,
} as const;

export function handlingFor(stats: KartStats): KartHandling {
  return {
    maxSpeed: 24 + stats.speed * 2.6,
    acceleration: 7 + stats.acceleration * 3.2,
    turnRate: 1.55 + stats.handling * 0.24,
  };
}

/**
 * Um kart na corrida, do jogador ou de um adversário.
 *
 * Os campos mudam a cada passo da física; quem desenha só lê. Fica mutável
 * de propósito: criar um objeto novo por kart, sessenta vezes por segundo,
 * só daria trabalho ao coletor de lixo.
 */
export class Kart {
  x = 0;
  z = 0;
  heading = 0;
  speed = 0;
  /** Posição do quadro anterior, para o desenho ficar suave entre passos. */
  previousX = 0;
  previousZ = 0;
  previousHeading = 0;

  trackIndex = 0;
  along = 0;
  lateral = 0;
  /** Volta atual; começa em -1 porque o grid de largada fica antes da linha. */
  lap = -1;
  finishTimeMs: number | null = null;
  bestLapMs: number | null = null;
  lapStartedAtMs = 0;

  item: KartItem | null = null;
  boostSeconds = 0;
  starSeconds = 0;
  spinSeconds = 0;
  isOnGrass = false;
  isTouchingWall = false;
  /** Último volante pedido, para o desenho inclinar as rodas e o piloto. */
  steer = 0;
  /** Rodando na casca, o kart gira mas continua deslizando para onde ia. */
  private spinTravelHeading = 0;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly handling: KartHandling,
    readonly isPlayer: boolean,
  ) {}

  get hasFinished(): boolean {
    return this.finishTimeMs !== null;
  }

  get isSpinning(): boolean {
    return this.spinSeconds > 0;
  }

  get hasStar(): boolean {
    return this.starSeconds > 0;
  }

  /** Quanto da corrida já percorreu, somando as voltas: é o que ordena a classificação. */
  raceDistance(lapLength: number): number {
    return this.lap * lapLength + this.along;
  }

  placeAt(x: number, z: number, heading: number): void {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.rememberPose();
  }

  rememberPose(): void {
    this.previousX = this.x;
    this.previousZ = this.z;
    this.previousHeading = this.heading;
  }

  /**
   * Um passo da física de fliperama.
   *
   * O kart acelera sozinho até a velocidade-alvo — a da pista, a da grama ou
   * a do turbo —, e só vira quando está andando: kart parado não gira no lugar.
   */
  drive(input: DriveInput, seconds: number, paceFactor = 1): void {
    this.rememberPose();
    this.tickTimers(seconds);
    this.steer = input.steer;

    if (this.isSpinning) {
      this.speed = approach(this.speed, 0, KART_PHYSICS.brakeDeceleration * 0.6 * seconds);
      this.heading += 9 * seconds;
      this.advance(seconds);
      return;
    }

    if (input.brake) {
      const floor = -KART_PHYSICS.reverseSpeed;
      this.speed = approach(this.speed, floor, KART_PHYSICS.brakeDeceleration * seconds);
    } else {
      const target = this.targetSpeed(paceFactor);
      const rate = this.speed < target ? this.handling.acceleration : KART_PHYSICS.coastDeceleration;
      this.speed = approach(this.speed, target, rate * seconds);
    }

    const grip = Math.min(1, Math.abs(this.speed) / 10);
    const direction = this.speed >= 0 ? 1 : -1;

    this.heading -= clamp(input.steer, -1, 1) * this.handling.turnRate * grip * direction * seconds;
    this.advance(seconds);
  }

  /** Bateu no muro: volta para dentro e perde velocidade. */
  bounceInside(x: number, z: number): void {
    this.x = x;
    this.z = z;
    this.speed *= KART_PHYSICS.wallSpeedKeep;
  }

  startBoost(): void {
    this.boostSeconds = KART_PHYSICS.boostSeconds;
  }

  startStar(): void {
    this.starSeconds = KART_PHYSICS.starSeconds;
  }

  /** Escorregou na casca. Quem está com estrela passa por cima sem sentir nada. */
  spinOut(): boolean {
    if (this.hasStar || this.isSpinning) {
      return false;
    }

    this.spinSeconds = KART_PHYSICS.spinSeconds;
    this.spinTravelHeading = this.heading;
    this.boostSeconds = 0;

    return true;
  }

  private targetSpeed(paceFactor: number): number {
    let target = this.handling.maxSpeed * paceFactor;

    if (this.isOnGrass && !this.hasStar) {
      target *= KART_PHYSICS.grassSpeedFactor;
    }

    if (this.boostSeconds > 0) {
      target = Math.max(target, this.handling.maxSpeed * KART_PHYSICS.boostSpeedFactor);
    } else if (this.hasStar) {
      target = Math.max(target, this.handling.maxSpeed * KART_PHYSICS.starSpeedFactor);
    }

    return target;
  }

  private tickTimers(seconds: number): void {
    this.boostSeconds = Math.max(0, this.boostSeconds - seconds);
    this.starSeconds = Math.max(0, this.starSeconds - seconds);
    this.spinSeconds = Math.max(0, this.spinSeconds - seconds);
  }

  private advance(seconds: number): void {
    const forward = this.isSpinning ? this.spinTravelHeading : this.heading;

    this.x += Math.sin(forward) * this.speed * seconds;
    this.z += Math.cos(forward) * this.speed * seconds;
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
