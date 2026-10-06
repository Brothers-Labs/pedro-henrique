import { PLAYER_PHYSICS, SURPRISE_COIN_COUNT, TILE_SIZE } from '../../config/physics.config';
import type { LevelObject, LevelObjectType, PlatformAxis, PowerUpKind, SurpriseContent } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import type { PhysicsBody, PlatformSurface } from './physics-body';
import type { Player } from './player';
import type { Scheduler } from './scheduler';
import { COLLISION, type TileGrid } from './tile-grid';
import type { VisualEventQueue } from './visual-events';

export interface BlockHost {
  readonly effects: VisualEventQueue;
  readonly scheduler: Scheduler;
  playSound(cue: MakerSoundCue): void;
  addCoins(amount: number, x: number, y: number): void;
  spawnCollectible(kind: 'heart' | 'crystal' | 'power-up', x: number, y: number, extra: SpawnExtra): void;
}

export interface SpawnExtra {
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
}

export type InteractiveKind = 'brick' | 'surprise' | 'spring' | 'crumble';

/** Bloco que reage ao Pedro. A tela lê os momentos para animar. */
export interface InteractiveBlock {
  readonly id: number;
  readonly kind: InteractiveKind;
  readonly cellX: number;
  readonly cellY: number;
  readonly contents?: SurpriseContent;
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
  isUsed: boolean;
  isBroken: boolean;
  /** Plataforma frágil que desabou e ainda não voltou. */
  isHidden: boolean;
  /** Última cabeçada ou impulso de mola, para o pulinho do bloco na tela. */
  bumpedAt: number;
  crumbleStartedAt: number;
}

export interface MovingPlatform extends PlatformSurface {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  previousX: number;
  previousY: number;
  readonly axis: PlatformAxis;
  readonly start: number;
  readonly end: number;
  velocity: number;
}

export interface Hazard {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const MOVING_PLATFORM_WIDTH = TILE_SIZE * 2;
export const MOVING_PLATFORM_HEIGHT = TILE_SIZE / 2;

const MOVING_SPEED = 90;
const CRUMBLE_DELAY_MS = 450;
const CRUMBLE_RESPAWN_MS = 3000;

const INTERACTIVE_KINDS: ReadonlySet<LevelObjectType> = new Set<LevelObjectType>(['brick', 'surprise', 'spring', 'crumble']);

function isInteractiveKind(type: LevelObjectType): type is InteractiveKind {
  return INTERACTIVE_KINDS.has(type);
}

/**
 * Blocos que reagem ao Pedro.
 *
 * Quebrável, surpresa e mola ocupam a grade como sólidos; a plataforma frágil,
 * como chão de mão única. A reação vem do lado do contato: cabeçada por baixo
 * quebra ou abre, pisar em cima faz a mola saltar e a plataforma frágil tremer.
 */
export class BlockSystem {
  readonly interactive: InteractiveBlock[] = [];
  readonly platforms: MovingPlatform[] = [];
  readonly hazards: Hazard[] = [];
  /** Células de lava, para a tela desenhar. */
  readonly lavaCells: { readonly x: number; readonly y: number }[] = [];

  private readonly byCell = new Map<number, InteractiveBlock>();

  constructor(
    objects: readonly LevelObject[],
    crystalIndexOf: ReadonlyMap<LevelObject, number>,
    private readonly grid: TileGrid,
    private readonly host: BlockHost,
  ) {
    for (const object of objects) {
      if (isInteractiveKind(object.type)) {
        this.addInteractive(object, object.type, crystalIndexOf.get(object));
      } else if (object.type === 'moving-platform') {
        this.addMovingPlatform(object);
      } else if (object.type === 'lava') {
        const x = object.x * TILE_SIZE;
        const y = object.y * TILE_SIZE;

        this.lavaCells.push({ x: object.x, y: object.y });
        // A lava queima a partir de um pouco abaixo da superfície: encostar de raspão não conta.
        this.hazards.push({ x: x + 4, y: y + 14, width: TILE_SIZE - 8, height: TILE_SIZE - 14 });
      }
    }
  }

  blockAt(cellX: number, cellY: number): InteractiveBlock | undefined {
    return this.byCell.get(this.key(cellX, cellY));
  }

  touchesHazard(body: PhysicsBody): boolean {
    return this.hazards.some(
      (hazard) =>
        body.x < hazard.x + hazard.width &&
        body.x + body.width > hazard.x &&
        body.y < hazard.y + hazard.height &&
        body.y + body.height > hazard.y,
    );
  }

  /** Move as plataformas antes dos corpos, que viajam de carona nelas. */
  update(seconds: number): void {
    for (const platform of this.platforms) {
      platform.previousX = platform.x;
      platform.previousY = platform.y;

      const isHorizontal = platform.axis === 'horizontal';
      const position = (isHorizontal ? platform.x : platform.y) + platform.velocity * seconds;
      const clamped = Math.min(platform.end, Math.max(platform.start, position));

      if (clamped !== position) {
        platform.velocity = -platform.velocity;
      }

      if (isHorizontal) {
        platform.x = clamped;
      } else {
        platform.y = clamped;
      }

      platform.deltaX = platform.x - platform.previousX;
      platform.deltaY = platform.y - platform.previousY;
    }
  }

  /** Cabeçada por baixo: o tijolo quebra, a surpresa abre. */
  handleHeadHit(cellX: number, cellY: number, now: number): void {
    const block = this.blockAt(cellX, cellY);

    if (!block || block.isBroken || (block.kind !== 'brick' && block.kind !== 'surprise')) {
      return;
    }

    const centerX = (block.cellX + 0.5) * TILE_SIZE;
    const centerY = (block.cellY + 0.5) * TILE_SIZE;

    if (block.kind === 'brick') {
      block.isBroken = true;
      this.grid.setCollision(block.cellX, block.cellY, COLLISION.empty);
      this.host.playSound('break');
      this.host.effects.burst('poof', centerX, centerY, 14);
      this.host.effects.shake('leve');
      return;
    }

    block.bumpedAt = now;

    if (block.isUsed) {
      return;
    }

    block.isUsed = true;
    this.releaseContents(block, centerX, centerY - TILE_SIZE);
  }

  /** Pisou em cima: a mola lança, a plataforma frágil começa a tremer. */
  handleLanding(player: Player, row: number, fromColumn: number, toColumn: number, now: number): void {
    for (let column = fromColumn; column <= toColumn; column += 1) {
      const block = this.blockAt(column, row);

      if (block?.kind === 'spring') {
        this.launch(player, block, now);
        return;
      }

      if (block?.kind === 'crumble') {
        this.startCrumbling(block, now);
      }
    }
  }

  private addInteractive(object: LevelObject, kind: InteractiveKind, crystalIndex: number | undefined): void {
    const block: InteractiveBlock = {
      id: this.interactive.length + 1,
      kind,
      cellX: object.x,
      cellY: object.y,
      contents: object.properties?.contents ?? (kind === 'surprise' ? 'coins' : undefined),
      powerUp: object.properties?.powerUp,
      crystalIndex,
      isUsed: false,
      isBroken: false,
      isHidden: false,
      bumpedAt: Number.NEGATIVE_INFINITY,
      crumbleStartedAt: Number.NEGATIVE_INFINITY,
    };

    this.interactive.push(block);
    this.byCell.set(this.key(object.x, object.y), block);
    this.grid.setCollision(object.x, object.y, kind === 'crumble' ? COLLISION.oneWay : COLLISION.solid);
  }

  private addMovingPlatform(object: LevelObject): void {
    const axis = object.properties?.axis ?? 'horizontal';
    const range = (object.properties?.range ?? 3) * TILE_SIZE;
    const x = object.x * TILE_SIZE;
    const y = object.y * TILE_SIZE;
    const isHorizontal = axis === 'horizontal';

    this.platforms.push({
      x,
      y,
      width: MOVING_PLATFORM_WIDTH,
      deltaX: 0,
      deltaY: 0,
      previousX: x,
      previousY: y,
      axis,
      start: isHorizontal ? x : y - range,
      end: isHorizontal ? x + range : y,
      velocity: isHorizontal ? MOVING_SPEED : -MOVING_SPEED,
    });
  }

  private releaseContents(block: InteractiveBlock, x: number, y: number): void {
    switch (block.contents) {
      case 'heart':
        this.host.spawnCollectible('heart', x, y, {});
        return;
      case 'crystal':
        this.host.spawnCollectible('crystal', x, y, { crystalIndex: block.crystalIndex });
        return;
      case 'power-up':
        this.host.spawnCollectible('power-up', x, y, { powerUp: block.powerUp ?? 'super-jump' });
        return;
      case 'coins':
      case undefined:
        this.host.addCoins(SURPRISE_COIN_COUNT, x, y);
        this.host.effects.coinFountain(x, y + TILE_SIZE / 2, SURPRISE_COIN_COUNT);
        return;
    }
  }

  private launch(player: Player, block: InteractiveBlock, now: number): void {
    player.bounce(PLAYER_PHYSICS.springVelocity, false);
    block.bumpedAt = now;
    this.host.playSound('spring');
    this.host.effects.burst('sparkle', (block.cellX + 0.5) * TILE_SIZE, block.cellY * TILE_SIZE, 8);
  }

  private startCrumbling(block: InteractiveBlock, now: number): void {
    if (block.isUsed) {
      return;
    }

    block.isUsed = true;
    block.crumbleStartedAt = now;

    this.host.scheduler.after(now, CRUMBLE_DELAY_MS, () => {
      block.isHidden = true;
      this.grid.setCollision(block.cellX, block.cellY, COLLISION.empty);
      this.host.effects.burst('dust', (block.cellX + 0.5) * TILE_SIZE, (block.cellY + 0.25) * TILE_SIZE, 8);

      this.host.scheduler.after(now + CRUMBLE_DELAY_MS, CRUMBLE_RESPAWN_MS, () => {
        block.isUsed = false;
        block.isHidden = false;
        this.grid.setCollision(block.cellX, block.cellY, COLLISION.oneWay);
      });
    });
  }

  private key(cellX: number, cellY: number): number {
    return cellY * this.grid.width + cellX;
  }
}
