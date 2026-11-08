import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject, PortalLook } from '../../models/level.model';
import type { VisualEventQueue } from './visual-events';

export interface TriggerHost {
  readonly effects: VisualEventQueue;
  onCheckpoint(feetX: number, feetY: number): void;
  onDoor(destinationFeetX: number, destinationFeetY: number): void;
  onGoldenDoorOpened(x: number, y: number): void;
  onSecretDoor(): void;
  onPortal(centerX: number, centerY: number): void;
  onChestOpened(x: number, y: number): void;
  onMascotTip(text: string): void;
}

/** Tudo aqui é ancorado no chão da célula: `x` no centro, `y` embaixo. */
export interface Checkpoint {
  readonly x: number;
  readonly y: number;
  isActive: boolean;
}

/** A de madeira e a dourada levam à porta do mesmo par; a secreta libera a fase secreta. */
export type DoorKind = 'wooden' | 'golden' | 'secret';

export interface Door {
  readonly x: number;
  readonly y: number;
  readonly pair: string | null;
  readonly kind: DoorKind;
  wasUsed: boolean;
}

const DOOR_KINDS: Readonly<Record<'door' | 'golden-door' | 'secret-door', DoorKind>> = {
  door: 'wooden',
  'golden-door': 'golden',
  'secret-door': 'secret',
};

export interface Hint {
  readonly id: number;
  readonly x: number;
  /** Centro da célula: a dica flutua no ar, não no chão. */
  readonly y: number;
  readonly text: string;
  isNear: boolean;
  isDone: boolean;
}

export interface Sign {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  isNear: boolean;
}

export interface Portal {
  readonly x: number;
  readonly y: number;
  /** Só o desenho muda: arco ou castelo, a entrada é a mesma. */
  readonly look: PortalLook;
  /** Aceita o Pedro agora? Fica falso depois que ele entra. */
  isOpen: boolean;
  /** Trancado e invisível até o chefão ser vencido. */
  isLocked: boolean;
  /** Quando abriu depois do chefão, para a tela fazer o portal crescer. */
  openedAt: number | null;
}

export interface Chest {
  readonly x: number;
  readonly groundY: number;
  readonly droppedAt: number;
  openedAt: number | null;
}

interface MascotTip {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

/** Distância em que dicas e placas aparecem. */
const HINT_RANGE = 7 * TILE_SIZE;
const HINT_DONE_DISTANCE = 5 * TILE_SIZE;
const SIGN_RANGE = 2.2 * TILE_SIZE;

/** Tempo da queda do baú até o chão da arena. */
export const CHEST_DROP_MS = 700;

/**
 * Tudo o que acontece quando o Pedro passa por um lugar.
 *
 * Checkpoint, portas, portal, placas, dicas do tutorial e falas do mascote
 * não têm física: são áreas conferidas a cada passo contra a posição dele.
 * As dicas aparecem ao se aproximar e somem de vez depois que ele passa —
 * ensinar jogando, sem tela de tutorial.
 */
export class TriggerSystem {
  readonly checkpoints: Checkpoint[] = [];
  readonly doors: Door[] = [];
  readonly hints: Hint[] = [];
  readonly signs: Sign[] = [];
  portal: Portal | null = null;
  chest: Chest | null = null;
  /** Porta ao alcance: a tela mostra o aviso do botão de ação em cima dela. */
  nearDoor: Door | null = null;

  private readonly tips: MascotTip[] = [];

  constructor(
    objects: readonly LevelObject[],
    isTouch: boolean,
    private readonly host: TriggerHost,
  ) {
    for (const object of objects) {
      this.addObject(object, isTouch);
    }
  }

  /** Fecha o portal até o chefão ser vencido. */
  closePortal(): void {
    if (this.portal) {
      this.portal.isOpen = false;
      this.portal.isLocked = true;
    }
  }

  openPortal(now: number): void {
    if (!this.portal?.isLocked) {
      return;
    }

    this.portal.isOpen = true;
    this.portal.isLocked = false;
    this.portal.openedAt = now;
    this.host.effects.burst('sparkle', this.portal.x, this.portal.y - 60, 30);
  }

  /** Baú de recompensa do chefão, que cai do alto no centro da arena. */
  dropChest(x: number, groundY: number, now: number): void {
    this.chest = { x, groundY, droppedAt: now, openedAt: null };
  }

  update(now: number, playerX: number, playerY: number, actionPressed: boolean): void {
    this.checkCheckpoints(playerX, playerY);
    this.checkDoors(playerX, playerY, actionPressed);
    this.checkPortal(playerX, playerY);
    this.checkChest(now, playerX, playerY);
    this.updateHints(playerX);
    this.updateSigns(playerX);
    this.checkTips(playerX, playerY);
  }

  private addObject(object: LevelObject, isTouch: boolean): void {
    const x = (object.x + 0.5) * TILE_SIZE;
    const y = (object.y + 1) * TILE_SIZE;

    switch (object.type) {
      case 'checkpoint':
        this.checkpoints.push({ x, y, isActive: false });
        return;
      case 'door':
      case 'golden-door':
      case 'secret-door':
        this.doors.push({ x, y, pair: object.properties?.pair ?? null, kind: DOOR_KINDS[object.type], wasUsed: false });
        return;
      case 'portal':
        this.portal = { x, y, look: object.properties?.portalLook ?? 'arch', isOpen: true, isLocked: false, openedAt: null };
        return;
      case 'sign':
        this.signs.push({ id: this.signs.length + 1, x, y, text: object.properties?.text ?? '', isNear: false });
        return;
      case 'hint': {
        const text = isTouch ? (object.properties?.touchText ?? object.properties?.text) : object.properties?.text;

        this.hints.push({ id: this.hints.length + 1, x, y: (object.y + 0.5) * TILE_SIZE, text: text ?? '', isNear: false, isDone: false });
        return;
      }
      case 'mascot-tip':
        this.tips.push({ x, y, text: object.properties?.text ?? '' });
        return;
      default:
        return;
    }
  }

  private checkCheckpoints(playerX: number, playerY: number): void {
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.isActive || !isNear(playerX, playerY, checkpoint.x, checkpoint.y - 40, 32, 60)) {
        continue;
      }

      checkpoint.isActive = true;
      this.host.effects.burst('sparkle', checkpoint.x, checkpoint.y - 70, 20);
      this.host.effects.floatingText(checkpoint.x, checkpoint.y - 110, '✨ CHECKPOINT!', '#ffe066');
      this.host.onCheckpoint(checkpoint.x, checkpoint.y);
    }
  }

  private checkDoors(playerX: number, playerY: number, actionPressed: boolean): void {
    const door = this.doors.find((candidate) => isNear(playerX, playerY, candidate.x, candidate.y - 40, 28, 60)) ?? null;

    this.nearDoor = door;

    if (!door || !actionPressed) {
      return;
    }

    if (door.kind === 'secret') {
      if (!door.wasUsed) {
        door.wasUsed = true;
        this.host.effects.burst('sparkle', door.x, door.y - 50, 30);
        this.host.onSecretDoor();
      }

      return;
    }

    // A recompensa da dourada vem mesmo sem par: a criança nunca abre uma porta à toa.
    if (door.kind === 'golden' && !door.wasUsed) {
      door.wasUsed = true;
      this.host.effects.burst('sparkle', door.x, door.y - 50, 30);
      this.host.onGoldenDoorOpened(door.x, door.y - 50);
    }

    const destination = this.doors.find((candidate) => candidate !== door && candidate.pair !== null && candidate.pair === door.pair);

    if (destination) {
      this.host.onDoor(destination.x, destination.y);
    }
  }

  private checkPortal(playerX: number, playerY: number): void {
    const portal = this.portal;

    if (!portal?.isOpen || !isNear(playerX, playerY, portal.x, portal.y - 64, 34, 64)) {
      return;
    }

    portal.isOpen = false;
    this.host.onPortal(portal.x, portal.y - 64);
  }

  private checkChest(now: number, playerX: number, playerY: number): void {
    const chest = this.chest;

    if (!chest || chest.openedAt !== null || now < chest.droppedAt + CHEST_DROP_MS) {
      return;
    }

    if (isNear(playerX, playerY, chest.x, chest.groundY - 30, 50, 60)) {
      chest.openedAt = now;
      this.host.effects.burst('coin', chest.x, chest.groundY - 40, 30);
      this.host.onChestOpened(chest.x, chest.groundY - 40);
    }
  }

  private updateHints(playerX: number): void {
    for (const hint of this.hints) {
      if (hint.isDone) {
        continue;
      }

      const distance = hint.x - playerX;

      if (distance < -HINT_DONE_DISTANCE) {
        hint.isDone = true;
        hint.isNear = false;
        continue;
      }

      hint.isNear = Math.abs(distance) < HINT_RANGE;
    }
  }

  private updateSigns(playerX: number): void {
    for (const sign of this.signs) {
      sign.isNear = Math.abs(sign.x - playerX) < SIGN_RANGE;
    }
  }

  private checkTips(playerX: number, playerY: number): void {
    for (let index = this.tips.length - 1; index >= 0; index -= 1) {
      const tip = this.tips[index];

      if (playerX >= tip.x - TILE_SIZE && Math.abs(playerY - tip.y) < TILE_SIZE * 4) {
        this.tips.splice(index, 1);
        this.host.onMascotTip(tip.text);
      }
    }
  }
}

function isNear(playerX: number, playerY: number, x: number, y: number, reachX: number, reachY: number): boolean {
  return Math.abs(playerX - x) < reachX && Math.abs(playerY - y) < reachY;
}
