import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject, PortalLook } from '../../models/level.model';
import type { VisualEventQueue } from './visual-events';

export interface TriggerHost {
  readonly effects: VisualEventQueue;
  onCheckpoint(feetX: number, feetY: number): void;
  /** `kind`: de onde saiu — o cano faz o som e a fumacinha do cano. */
  onDoor(destinationFeetX: number, destinationFeetY: number, kind?: DoorKind): void;
  onGoldenDoorOpened(x: number, y: number): void;
  /** Uma porta destrancou a fase secreta; `secretLevel` é a fase do Pedro escolhida, ou `null` na campanha. */
  onSecretDoor(secretLevel: string | null): void;
  onPortal(centerX: number, centerY: number): void;
  onChestOpened(chest: Chest, x: number, y: number): void;
  onMascotTip(text: string): void;
  /** A Flor Falante disse a frase dela: a tela mostra e lê em voz alta. */
  onFlowerSpeech?(text: string): void;
}

/** Tudo aqui é ancorado no chão da célula: `x` no centro, `y` embaixo. */
export interface Checkpoint {
  readonly x: number;
  readonly y: number;
  isActive: boolean;
}

/**
 * A de madeira e a dourada levam à porta do mesmo par; a secreta libera a
 * fase secreta. A dourada também libera, quando tem uma fase escolhida. O
 * cano leva ao outro cano da mesma letra, nunca a uma porta.
 */
export type DoorKind = 'wooden' | 'golden' | 'secret' | 'pipe';

export interface Door {
  readonly x: number;
  readonly y: number;
  readonly pair: string | null;
  readonly kind: DoorKind;
  /** Fase do Pedro que a porta dourada destranca; `null` nas outras portas. */
  readonly secretLevel: string | null;
  wasUsed: boolean;
}

const DOOR_KINDS: Readonly<Record<'door' | 'golden-door' | 'secret-door' | 'warp-pipe', DoorKind>> = {
  door: 'wooden',
  'golden-door': 'golden',
  'secret-door': 'secret',
  'warp-pipe': 'pipe',
};

/** Porta leva a porta e cano leva a cano: a letra A da porta e a do cano não se misturam. */
function doorFamily(kind: DoorKind): 'pipe' | 'door' {
  return kind === 'pipe' ? 'pipe' : 'door';
}

/** A Flor Falante: fala uma vez cada vez que o herói chega perto. */
export interface TalkingFlower {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  isNear: boolean;
}

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

/** O baú do chefão cai do alto e abre o portal; o baú de moedas já fica no chão da fase. */
export type ChestKind = 'boss' | 'coins';

export interface Chest {
  readonly kind: ChestKind;
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
/** A flor fala quando o herói chega a uns dois blocos dela, na mesma altura mais ou menos. */
const FLOWER_RANGE_X = 2.2 * TILE_SIZE;
const FLOWER_RANGE_Y = 3 * TILE_SIZE;

/** Altura do mastro da bandeira final, do chão até a bola dourada. */
export const GOAL_FLAG_HEIGHT = 5 * TILE_SIZE;
/** Meia largura do mastro que conta como encostar: o mastro e um pouco em volta. */
const GOAL_FLAG_REACH_X = 26;

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
  readonly flowers: TalkingFlower[] = [];
  portal: Portal | null = null;
  readonly chests: Chest[] = [];
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
    this.chests.push({ kind: 'boss', x, groundY, droppedAt: now, openedAt: null });
  }

  update(now: number, playerX: number, playerY: number, actionPressed: boolean): void {
    this.checkCheckpoints(playerX, playerY);
    this.checkDoors(playerX, playerY, actionPressed);
    this.checkPortal(playerX, playerY);
    this.checkChests(now, playerX, playerY);
    this.updateHints(playerX);
    this.updateSigns(playerX);
    this.updateFlowers(playerX, playerY);
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
      case 'warp-pipe':
        this.doors.push({
          x,
          y,
          pair: object.properties?.pair ?? null,
          kind: DOOR_KINDS[object.type],
          secretLevel: object.type === 'golden-door' ? (object.properties?.secretLevel ?? null) : null,
          wasUsed: false,
        });
        return;
      case 'coin-chest':
        // Já pousado: a queda do alto é só do baú do chefão.
        this.chests.push({ kind: 'coins', x, groundY: y, droppedAt: -CHEST_DROP_MS, openedAt: null });
        return;
      case 'portal':
        this.portal = { x, y, look: object.properties?.portalLook ?? 'arch', isOpen: true, isLocked: false, openedAt: null };
        return;
      case 'sign':
        this.signs.push({ id: this.signs.length + 1, x, y, text: object.properties?.text ?? '', isNear: false });
        return;
      case 'talking-flower':
        this.flowers.push({ id: this.flowers.length + 1, x, y, text: object.properties?.text ?? '', isNear: false });
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
        this.host.onSecretDoor(null);
      }

      return;
    }

    // A recompensa da dourada vem mesmo sem par: a criança nunca abre uma porta à toa.
    if (door.kind === 'golden' && !door.wasUsed) {
      door.wasUsed = true;
      this.host.effects.burst('sparkle', door.x, door.y - 50, 30);
      this.host.onGoldenDoorOpened(door.x, door.y - 50);

      if (door.secretLevel !== null) {
        this.host.onSecretDoor(door.secretLevel);
      }
    }

    const destination = this.doors.find(
      (candidate) =>
        candidate !== door && candidate.pair !== null && candidate.pair === door.pair && doorFamily(candidate.kind) === doorFamily(door.kind),
    );

    if (destination) {
      this.host.onDoor(destination.x, destination.y, door.kind);
    }
  }

  private checkPortal(playerX: number, playerY: number): void {
    const portal = this.portal;

    if (!portal?.isOpen) {
      return;
    }

    if (portal.look === 'flag') {
      // O mastro inteiro conta: pular nele lá no alto também termina a fase.
      if (!isNear(playerX, playerY, portal.x, portal.y - GOAL_FLAG_HEIGHT / 2, GOAL_FLAG_REACH_X, GOAL_FLAG_HEIGHT / 2 + 24)) {
        return;
      }

      portal.isOpen = false;
      // O herói escorrega mastro abaixo até o pé dele, do lado esquerdo.
      this.host.onPortal(portal.x - TILE_SIZE * 0.35, portal.y);
      return;
    }

    if (!isNear(playerX, playerY, portal.x, portal.y - 64, 34, 64)) {
      return;
    }

    portal.isOpen = false;
    this.host.onPortal(portal.x, portal.y - 64);
  }

  private checkChests(now: number, playerX: number, playerY: number): void {
    for (const chest of this.chests) {
      if (chest.openedAt !== null || now < chest.droppedAt + CHEST_DROP_MS) {
        continue;
      }

      if (isNear(playerX, playerY, chest.x, chest.groundY - 30, 50, 60)) {
        chest.openedAt = now;
        this.host.effects.burst('coin', chest.x, chest.groundY - 40, 30);
        this.host.onChestOpened(chest, chest.x, chest.groundY - 40);
      }
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

  /** A flor fala ao herói chegar perto; para falar de novo, ele precisa sair e voltar. */
  private updateFlowers(playerX: number, playerY: number): void {
    for (const flower of this.flowers) {
      const isNear = Math.abs(flower.x - playerX) < FLOWER_RANGE_X && Math.abs(flower.y - TILE_SIZE / 2 - playerY) < FLOWER_RANGE_Y;

      if (isNear && !flower.isNear && flower.text.trim() !== '') {
        this.host.onFlowerSpeech?.(flower.text);
      }

      flower.isNear = isNear;
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
