import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import type { WorldArea } from './physics-body';
import { COLLISION, type TileGrid } from './tile-grid';
import type { VisualEventQueue } from './visual-events';

/** Folga da porta: encostar de lado (ou pisar em cima) já conta como tocar. */
const DOOR_TOUCH_PAD = 3;
/** A chave flutua no meio da célula; o herói pega ao encostar neste quadrado em volta dela. */
const KEY_REACH = 36;
/** As correntes se soltam em sequência, uma atrás da outra: a criança vê a alavanca agindo. */
export const CHAIN_OPEN_STAGGER_MS = 45;

export interface LockHost {
  readonly effects: VisualEventQueue;
  playSound(cue: MakerSoundCue): void;
  /** O número de chaves no bolso mudou: o painel mostra. */
  onKeysChanged(keys: number): void;
  /** Dica do mascote, na primeira vez que algo acontece. */
  onLockTip(text: string): void;
}

/** Chave flutuando na fase. `x` e `y` são o centro, em pixels. */
export interface LevelKey {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  isTaken: boolean;
}

/** Porta com cadeado: dois blocos de altura, a partir da célula de baixo (`cellY`). */
export interface LockedDoor {
  readonly id: number;
  readonly cellX: number;
  readonly cellY: number;
  /**
   * A metade de cima é da porta? Com terreno já ali (um teto colado nela), a
   * porta só ocupa a célula de baixo e, aberta, não apaga aquele bloco.
   */
  readonly ownsTop: boolean;
  isOpen: boolean;
  openedAt: number;
  /** Já avisou que falta a chave neste encosto; volta a avisar depois que o herói se afasta. */
  isWarned: boolean;
}

/** Um bloco de corrente: firme até uma alavanca ser puxada. */
export interface ChainBlock {
  readonly id: number;
  readonly cellX: number;
  readonly cellY: number;
  isOpen: boolean;
  /** Quando esta corrente começa a se soltar; as vizinhas vêm logo depois. */
  openedAt: number;
}

export interface Lever {
  readonly id: number;
  readonly cellX: number;
  readonly cellY: number;
  isPulled: boolean;
  pulledAt: number;
}

/**
 * Chaves, portas com cadeado, correntes e alavancas.
 *
 * A chave vai para o bolso ao encostar; a porta com cadeado é uma parede de
 * dois blocos que se abre quando o herói encosta nela com uma chave no bolso,
 * e gasta a chave. A alavanca é puxada ao encostar e solta todas as correntes
 * da fase, de vez.
 *
 * Nada aqui volta a fechar, de propósito: uma porta ou corrente que fechasse
 * de novo poderia prender o herói dentro do bloco.
 */
export class LockSystem {
  readonly keys: LevelKey[] = [];
  readonly doors: LockedDoor[] = [];
  readonly chains: ChainBlock[] = [];
  readonly levers: Lever[] = [];

  private keysHeld = 0;
  private hasTippedKey = false;
  private hasTippedDoor = false;

  constructor(
    objects: readonly LevelObject[],
    private readonly grid: TileGrid,
    private readonly host: LockHost,
  ) {
    for (const object of objects) {
      switch (object.type) {
        case 'key':
          this.keys.push({ id: this.keys.length + 1, x: (object.x + 0.5) * TILE_SIZE, y: (object.y + 0.5) * TILE_SIZE, isTaken: false });
          break;
        case 'locked-door': {
          const ownsTop = grid.contains(object.x, object.y - 1) && grid.collisionAt(object.x, object.y - 1) === COLLISION.empty;

          this.doors.push({ id: this.doors.length + 1, cellX: object.x, cellY: object.y, ownsTop, isOpen: false, openedAt: 0, isWarned: false });
          grid.setCollision(object.x, object.y, COLLISION.solid);

          if (ownsTop) {
            grid.setCollision(object.x, object.y - 1, COLLISION.solid);
          }

          break;
        }
        case 'chain':
          this.chains.push({ id: this.chains.length + 1, cellX: object.x, cellY: object.y, isOpen: false, openedAt: 0 });
          grid.setCollision(object.x, object.y, COLLISION.solid);
          break;
        case 'lever':
          this.levers.push({ id: this.levers.length + 1, cellX: object.x, cellY: object.y, isPulled: false, pulledAt: 0 });
          break;
        default:
          break;
      }
    }
  }

  /** Chaves no bolso, prontas para abrir uma porta. */
  get keyCount(): number {
    return this.keysHeld;
  }

  /** Todas as correntes já soltas (ou não há nenhuma). */
  get areChainsOpen(): boolean {
    return this.chains.every((chain) => chain.isOpen);
  }

  update(now: number, body: WorldArea, isActive: boolean): void {
    if (!isActive) {
      return;
    }

    this.takeKeys(body);
    this.touchDoors(now, body);
    this.pullLevers(now, body);
  }

  private takeKeys(body: WorldArea): void {
    for (const key of this.keys) {
      const area: WorldArea = { x: key.x - KEY_REACH / 2, y: key.y - KEY_REACH / 2, width: KEY_REACH, height: KEY_REACH };

      if (key.isTaken || !overlapsArea(body, area)) {
        continue;
      }

      key.isTaken = true;
      this.keysHeld += 1;
      this.host.playSound('crystal');
      this.host.effects.burst('sparkle', key.x, key.y, 16);
      this.host.effects.floatingText(key.x, key.y - 30, '🔑 CHAVE!', '#ffe066');
      this.host.onKeysChanged(this.keysHeld);

      if (!this.hasTippedKey) {
        this.hasTippedKey = true;
        this.host.onLockTip('Você pegou uma chave! Encoste numa porta com cadeado para abrir.');
      }
    }
  }

  private touchDoors(now: number, body: WorldArea): void {
    const reach: WorldArea = {
      x: body.x - DOOR_TOUCH_PAD,
      y: body.y - DOOR_TOUCH_PAD,
      width: body.width + DOOR_TOUCH_PAD * 2,
      height: body.height + DOOR_TOUCH_PAD * 2,
    };

    for (const door of this.doors) {
      if (door.isOpen) {
        continue;
      }

      if (!overlapsDoor(reach, door)) {
        door.isWarned = false;
        continue;
      }

      const x = (door.cellX + 0.5) * TILE_SIZE;
      const y = door.cellY * TILE_SIZE;

      if (this.keysHeld === 0) {
        if (!door.isWarned) {
          door.isWarned = true;
          this.host.effects.floatingText(x, y - TILE_SIZE, '🔒 Falta a chave!', '#ffd6a5');

          if (!this.hasTippedDoor) {
            this.hasTippedDoor = true;
            this.host.onLockTip('Essa porta está trancada! Procure uma chave pela fase.');
          }
        }

        continue;
      }

      this.keysHeld -= 1;
      door.isOpen = true;
      door.openedAt = now;
      this.grid.setCollision(door.cellX, door.cellY, COLLISION.empty);

      if (door.ownsTop) {
        this.grid.setCollision(door.cellX, door.cellY - 1, COLLISION.empty);
      }

      this.host.playSound('secret');
      this.host.effects.burst('sparkle', x, y, 24);
      this.host.effects.floatingText(x, y - TILE_SIZE, '🔓 ABRIU!', '#ffe066');
      this.host.onKeysChanged(this.keysHeld);
    }
  }

  private pullLevers(now: number, body: WorldArea): void {
    for (const lever of this.levers) {
      if (lever.isPulled || !overlapsCell(body, lever.cellX, lever.cellY)) {
        continue;
      }

      lever.isPulled = true;
      lever.pulledAt = now;

      const x = (lever.cellX + 0.5) * TILE_SIZE;
      const y = (lever.cellY + 0.5) * TILE_SIZE;

      this.host.playSound('button');
      this.host.effects.burst('dust', x, y, 8);
      this.host.effects.floatingText(x, y - TILE_SIZE, '🕹️ CLAQUE!', '#ffffff');
      this.openChains(now, x);
    }
  }

  /** Solta as correntes da mais perto da alavanca para a mais longe. */
  private openChains(now: number, fromX: number): void {
    const closed = this.chains
      .filter((chain) => !chain.isOpen)
      .sort((first, second) => Math.abs(first.cellX * TILE_SIZE - fromX) - Math.abs(second.cellX * TILE_SIZE - fromX));

    if (closed.length === 0) {
      return;
    }

    closed.forEach((chain, order) => {
      chain.isOpen = true;
      chain.openedAt = now + order * CHAIN_OPEN_STAGGER_MS;
      this.grid.setCollision(chain.cellX, chain.cellY, COLLISION.empty);
      this.host.effects.burst('poof', (chain.cellX + 0.5) * TILE_SIZE, (chain.cellY + 0.5) * TILE_SIZE, 6);
    });

    this.host.playSound('break');
    this.host.effects.shake('leve');
    this.host.onLockTip('A alavanca soltou as correntes! O caminho abriu.');
  }
}

function overlapsDoor(area: WorldArea, door: LockedDoor): boolean {
  return overlapsCell(area, door.cellX, door.cellY) || (door.ownsTop && overlapsCell(area, door.cellX, door.cellY - 1));
}

function overlapsCell(area: WorldArea, cellX: number, cellY: number): boolean {
  return overlapsArea(area, { x: cellX * TILE_SIZE, y: cellY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
}

function overlapsArea(first: WorldArea, second: WorldArea): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}
