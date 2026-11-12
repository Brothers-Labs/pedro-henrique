import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { PHYSICS } from '../config/physics.config';
import { type ControlState, type Direction, directionOf } from '../models/controls.model';
import type { BounceResult, GameEvent } from '../models/scene.model';
import type { Body } from './body';

export type PadKind = 'normal' | 'super' | 'nuvem';

export interface BouncePad {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly kind: PadKind;
  isBroken: boolean;
}

export type BounceStatus = 'pulando' | 'caiu';

/** Largura do mundo em blocos; quem sai por um lado entra pelo outro. */
export const BOUNCE_WORLD_WIDTH = 9;
/** Altura visível em blocos: a câmera mostra sempre esta faixa do céu. */
export const BOUNCE_VIEW_HEIGHT = 14;

const BOUNCE_SPEED = 17;
const SUPER_BOUNCE_SPEED = 26;
const MOVE_SPEED = 6;
const MOVE_ACCELERATION = 40;
/** O Pedro fica um pouco abaixo do meio da tela, para ver o que vem por cima. */
const CAMERA_ANCHOR = 0.45;
/** Quantos blocos acima da câmera já ficam prontos, para nada aparecer do nada. */
const GENERATE_AHEAD = 20;

/**
 * Pula-pula: subir quicando de cama elástica em cama elástica.
 *
 * O Pedro pula sozinho ao pousar; a criança só escolhe o lado. As camas
 * ficam mais espaçadas e estreitas conforme ele sobe, mas o espaço entre
 * duas nunca passa do pulo normal, então sempre existe um caminho.
 */
export class BounceSimulation {
  readonly hero: Body;
  readonly pads: BouncePad[] = [];

  status: BounceStatus = 'pulando';
  facing: -1 | 1 = 1;
  /** Topo da câmera, em blocos; diminui conforme o Pedro sobe. */
  cameraTop: number;

  private readonly random: SeededRandom;
  private highestFeet = 0;
  private nextPadY: number;

  constructor(seed: number) {
    this.random = new SeededRandom(seed);
    this.hero = {
      x: (BOUNCE_WORLD_WIDTH - PHYSICS.heroWidth) / 2,
      y: -PHYSICS.heroHeight,
      vx: 0,
      vy: 0,
      width: PHYSICS.heroWidth,
      height: PHYSICS.heroHeight,
    };
    this.pads.push({ x: 0, y: 0, width: BOUNCE_WORLD_WIDTH, kind: 'normal', isBroken: false });
    this.nextPadY = -this.spacingAt(0);
    this.cameraTop = -BOUNCE_VIEW_HEIGHT * (1 - CAMERA_ANCHOR) - PHYSICS.heroHeight;
    this.generatePads();
  }

  /** Altura máxima já alcançada, em metros (um bloco vale um metro). */
  get heightMeters(): number {
    return Math.max(0, Math.floor(-this.highestFeet));
  }

  step(controls: ControlState): readonly GameEvent[] {
    if (this.status !== 'pulando') {
      return [];
    }

    const seconds = PHYSICS.stepSeconds;
    const events: GameEvent[] = [];
    const previousFeet = this.hero.y + this.hero.height;

    this.steer(directionOf(controls), seconds);
    this.hero.vy = Math.min(PHYSICS.maxFallSpeed, this.hero.vy + PHYSICS.gravity * seconds);
    this.hero.y += this.hero.vy * seconds;
    this.hero.x = wrap(this.hero.x + this.hero.vx * seconds);

    const pad = this.hero.vy > 0 ? this.padLandedOn(previousFeet) : null;

    if (pad) {
      this.hero.y = pad.y - this.hero.height;
      this.hero.vy = -(pad.kind === 'super' ? SUPER_BOUNCE_SPEED : BOUNCE_SPEED);
      pad.isBroken = pad.kind === 'nuvem';
      events.push('bounce');
    }

    const feet = this.hero.y + this.hero.height;

    this.highestFeet = Math.min(this.highestFeet, feet);
    this.cameraTop = Math.min(this.cameraTop, this.hero.y - BOUNCE_VIEW_HEIGHT * CAMERA_ANCHOR);
    this.generatePads();
    this.discardPadsBelowView();

    if (this.hero.y > this.cameraTop + BOUNCE_VIEW_HEIGHT + 1) {
      this.status = 'caiu';
      events.push('fall');
    }

    return events;
  }

  result(): BounceResult | null {
    return this.status === 'caiu' ? { mode: 'pula-pula', heightMeters: this.heightMeters } : null;
  }

  /** Cama em que os pés cruzaram o topo neste passo; as camas só seguram quem vem de cima. */
  private padLandedOn(previousFeet: number): BouncePad | null {
    const feet = this.hero.y + this.hero.height;

    return (
      this.pads.find(
        (pad) =>
          !pad.isBroken &&
          previousFeet <= pad.y &&
          feet >= pad.y &&
          overlapsHorizontally(this.hero.x, this.hero.width, pad.x, pad.width),
      ) ?? null
    );
  }

  private steer(direction: Direction, seconds: number): void {
    if (direction !== 0) {
      this.facing = direction;
    }

    const difference = direction * MOVE_SPEED - this.hero.vx;

    this.hero.vx += Math.sign(difference) * Math.min(Math.abs(difference), MOVE_ACCELERATION * seconds);
  }

  private generatePads(): void {
    while (this.nextPadY > this.cameraTop - GENERATE_AHEAD) {
      const height = -this.nextPadY;
      const width = Math.max(1.6, 3 - height / 120);

      this.pads.push({
        x: this.random.next() * (BOUNCE_WORLD_WIDTH - width),
        y: this.nextPadY,
        width,
        kind: this.kindAt(height),
        isBroken: false,
      });
      this.nextPadY -= this.spacingAt(height);
    }
  }

  private discardPadsBelowView(): void {
    const bottom = this.cameraTop + BOUNCE_VIEW_HEIGHT + 2;

    for (let index = this.pads.length - 1; index >= 0; index -= 1) {
      if (this.pads[index].y > bottom) {
        this.pads.splice(index, 1);
      }
    }
  }

  /** Espaço até a próxima cama: começa curto e cresce até o limite do pulo normal. */
  private spacingAt(height: number): number {
    const growth = Math.min(0.8, height / 150);

    return 1.6 + growth + this.random.next() * 0.6;
  }

  private kindAt(height: number): PadKind {
    if (height < 15) {
      return 'normal';
    }

    return this.random.weighted<PadKind>([
      ['normal', 77],
      ['super', 8],
      ['nuvem', 15],
    ]);
  }
}

function overlapsHorizontally(heroX: number, heroWidth: number, padX: number, padWidth: number): boolean {
  // O mundo dá a volta: o Pedro pode estar meio de um lado e meio do outro.
  return [heroX, heroX - BOUNCE_WORLD_WIDTH, heroX + BOUNCE_WORLD_WIDTH].some(
    (x) => x < padX + padWidth && x + heroWidth > padX,
  );
}

function wrap(x: number): number {
  return ((x % BOUNCE_WORLD_WIDTH) + BOUNCE_WORLD_WIDTH) % BOUNCE_WORLD_WIDTH;
}
