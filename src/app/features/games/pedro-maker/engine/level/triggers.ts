import * as Phaser from 'phaser';

import { TEXTURES } from '../../art/texture-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import { DEPTH, type Effects } from '../effects';

export interface TriggerHost {
  readonly effects: Effects;
  readonly isTouch: boolean;
  onCheckpoint(feetX: number, feetY: number): void;
  onDoor(destinationFeetX: number, destinationFeetY: number): void;
  onSecretDoor(): void;
  onPortal(centerX: number, centerY: number): void;
  onChestOpened(x: number, y: number): void;
  onMascotTip(text: string): void;
}

interface Checkpoint {
  readonly sprite: Phaser.GameObjects.Sprite;
  isActive: boolean;
}

interface Door {
  readonly sprite: Phaser.GameObjects.Image;
  readonly pair: string | null;
  readonly isSecret: boolean;
  wasUsed: boolean;
}

interface Hint {
  readonly label: Phaser.GameObjects.Text;
  isDone: boolean;
}

interface Sign {
  readonly x: number;
  readonly label: Phaser.GameObjects.Text;
}

interface MascotTip {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

const LABEL_FONT = '"Baloo 2", "Trebuchet MS", sans-serif';

/** Distância, em células, em que dicas e placas aparecem. */
const HINT_RANGE = 7 * TILE_SIZE;
const HINT_DONE_DISTANCE = 5 * TILE_SIZE;
const SIGN_RANGE = 2.2 * TILE_SIZE;

/**
 * Tudo o que acontece quando o Pedro passa por um lugar.
 *
 * Checkpoint, portas, portal, placas, dicas do tutorial e falas do mascote
 * não têm física: são áreas conferidas a cada quadro contra a posição dele.
 * As dicas aparecem ao se aproximar e somem de vez depois que ele passa —
 * ensinar jogando, sem tela de tutorial.
 */
export class TriggerSystem {
  private readonly checkpoints: Checkpoint[] = [];
  private readonly doors: Door[] = [];
  private readonly hints: Hint[] = [];
  private readonly signs: Sign[] = [];
  private readonly tips: MascotTip[] = [];
  private readonly prompt: Phaser.GameObjects.Text;
  private portal: { readonly frame: Phaser.GameObjects.Image; readonly swirl: Phaser.GameObjects.Image } | null = null;
  private isPortalOpen = true;
  private chest: Phaser.GameObjects.Sprite | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    objects: readonly LevelObject[],
    private readonly host: TriggerHost,
  ) {
    for (const object of objects) {
      this.addObject(object);
    }

    this.prompt = scene.add
      .text(0, 0, host.isTouch ? 'AÇÃO' : 'E', labelStyle('20px', '#ffffff'))
      .setOrigin(0.5)
      .setDepth(DEPTH.labels)
      .setVisible(false);
  }

  /** Fecha o portal até o chefão ser vencido. */
  closePortal(): void {
    this.isPortalOpen = false;
    this.portal?.frame.setVisible(false);
    this.portal?.swirl.setVisible(false);
  }

  openPortal(): void {
    if (this.isPortalOpen || !this.portal) {
      return;
    }

    this.isPortalOpen = true;
    const { frame, swirl } = this.portal;

    for (const part of [frame, swirl]) {
      part.setVisible(true).setScale(0.1);
      this.scene.tweens.add({ targets: part, scale: 1, duration: 600, ease: 'Back.easeOut' });
    }

    this.host.effects.burst('sparkle', frame.x, frame.y - 60, 30);
  }

  /** Baú de recompensa do chefão, que cai do alto no centro da arena. */
  dropChest(x: number, groundY: number): void {
    this.chest = this.scene.add.sprite(x, groundY - 400, TEXTURES.chest, 0).setOrigin(0.5, 1).setDepth(DEPTH.items);
    this.scene.tweens.add({ targets: this.chest, y: groundY, duration: 700, ease: 'Bounce.easeOut' });
  }

  update(deltaMs: number, player: Phaser.Math.Vector2, actionPressed: boolean): void {
    this.portal?.swirl.setRotation(this.portal.swirl.rotation + deltaMs * 0.004);

    this.checkCheckpoints(player);
    this.checkDoors(player, actionPressed);
    this.checkPortal(player);
    this.checkChest(player);
    this.updateHints(player);
    this.updateSigns(player);
    this.checkTips(player);
  }

  private addObject(object: LevelObject): void {
    const centerX = object.x * TILE_SIZE + TILE_SIZE / 2;
    const bottom = (object.y + 1) * TILE_SIZE;

    switch (object.type) {
      case 'checkpoint': {
        const sprite = this.scene.add.sprite(centerX, bottom, TEXTURES.checkpoint, 0).setOrigin(0.5, 1).setDepth(DEPTH.decor + 1);
        this.checkpoints.push({ sprite, isActive: false });
        return;
      }
      case 'door':
      case 'secret-door': {
        const texture = object.type === 'door' ? TEXTURES.door : TEXTURES.secretDoor;
        const sprite = this.scene.add.image(centerX, bottom, texture).setOrigin(0.5, 1).setDepth(DEPTH.decor + 1);
        this.doors.push({ sprite, pair: object.properties?.pair ?? null, isSecret: object.type === 'secret-door', wasUsed: false });
        return;
      }
      case 'portal': {
        const swirl = this.scene.add.image(centerX, bottom - 64, TEXTURES.portalSwirl).setDepth(DEPTH.decor + 2);
        const frame = this.scene.add.image(centerX, bottom, TEXTURES.portalFrame).setOrigin(0.5, 1).setDepth(DEPTH.decor + 3);
        this.portal = { frame, swirl };
        return;
      }
      case 'sign': {
        this.scene.add.image(centerX, bottom, TEXTURES.sign).setOrigin(0.5, 1).setDepth(DEPTH.decor + 1);
        const label = this.bubble(centerX, bottom - 70, object.properties?.text ?? '');
        this.signs.push({ x: centerX, label });
        return;
      }
      case 'hint': {
        const text = this.host.isTouch ? (object.properties?.touchText ?? object.properties?.text) : object.properties?.text;
        const label = this.scene.add
          .text(centerX, object.y * TILE_SIZE + TILE_SIZE / 2, text ?? '', labelStyle('30px', '#ffffff'))
          .setOrigin(0.5)
          .setDepth(DEPTH.labels)
          .setAlpha(0);
        this.hints.push({ label, isDone: false });
        return;
      }
      case 'mascot-tip':
        this.tips.push({ x: centerX, y: bottom, text: object.properties?.text ?? '' });
        return;
      default:
        return;
    }
  }

  private checkCheckpoints(player: Phaser.Math.Vector2): void {
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.isActive || !isNear(player, checkpoint.sprite.x, checkpoint.sprite.y - 40, 32, 60)) {
        continue;
      }

      checkpoint.isActive = true;
      checkpoint.sprite.setFrame(1);
      this.host.effects.burst('sparkle', checkpoint.sprite.x, checkpoint.sprite.y - 70, 20);
      this.host.effects.floatingText(checkpoint.sprite.x, checkpoint.sprite.y - 110, '✨ CHECKPOINT!', '#ffe066');
      this.host.onCheckpoint(checkpoint.sprite.x, checkpoint.sprite.y);
    }
  }

  private checkDoors(player: Phaser.Math.Vector2, actionPressed: boolean): void {
    const door = this.doors.find((candidate) => isNear(player, candidate.sprite.x, candidate.sprite.y - 40, 28, 60));

    this.prompt.setVisible(door !== undefined);

    if (!door) {
      return;
    }

    this.prompt.setPosition(door.sprite.x, door.sprite.y - 120);

    if (!actionPressed) {
      return;
    }

    if (door.isSecret) {
      if (!door.wasUsed) {
        door.wasUsed = true;
        this.host.effects.burst('sparkle', door.sprite.x, door.sprite.y - 50, 30);
        this.host.onSecretDoor();
      }

      return;
    }

    const destination = this.doors.find((candidate) => candidate !== door && candidate.pair !== null && candidate.pair === door.pair);

    if (destination) {
      this.host.onDoor(destination.sprite.x, destination.sprite.y);
    }
  }

  private checkPortal(player: Phaser.Math.Vector2): void {
    if (!this.portal || !this.isPortalOpen) {
      return;
    }

    const { frame } = this.portal;

    if (isNear(player, frame.x, frame.y - 64, 34, 64)) {
      this.isPortalOpen = false;
      this.host.onPortal(frame.x, frame.y - 64);
    }
  }

  private checkChest(player: Phaser.Math.Vector2): void {
    const chest = this.chest;

    if (!chest || this.scene.tweens.isTweening(chest) || !isNear(player, chest.x, chest.y - 30, 50, 60)) {
      return;
    }

    this.chest = null;
    chest.setFrame(1);
    this.host.effects.burst('coin', chest.x, chest.y - 40, 30);
    this.host.onChestOpened(chest.x, chest.y - 40);
  }

  private updateHints(player: Phaser.Math.Vector2): void {
    for (const hint of this.hints) {
      if (hint.isDone) {
        continue;
      }

      const distance = hint.label.x - player.x;

      if (distance < -HINT_DONE_DISTANCE) {
        hint.isDone = true;
        this.scene.tweens.add({ targets: hint.label, alpha: 0, duration: 400 });
        continue;
      }

      const target = Math.abs(distance) < HINT_RANGE ? 1 : 0;
      hint.label.setAlpha(Phaser.Math.Linear(hint.label.alpha, target, 0.12));
    }
  }

  private updateSigns(player: Phaser.Math.Vector2): void {
    for (const sign of this.signs) {
      sign.label.setVisible(Math.abs(sign.x - player.x) < SIGN_RANGE);
    }
  }

  private checkTips(player: Phaser.Math.Vector2): void {
    for (let index = this.tips.length - 1; index >= 0; index -= 1) {
      const tip = this.tips[index];

      if (player.x >= tip.x - TILE_SIZE && Math.abs(player.y - tip.y) < TILE_SIZE * 4) {
        this.tips.splice(index, 1);
        this.host.onMascotTip(tip.text);
      }
    }
  }

  private bubble(x: number, y: number, text: string): Phaser.GameObjects.Text {
    const label = this.scene.add
      .text(x, y, text, {
        ...labelStyle('20px', '#2a2350'),
        backgroundColor: '#fffaf3',
        padding: { x: 12, y: 6 },
        strokeThickness: 0,
        align: 'center',
        wordWrap: { width: 260 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.labels)
      .setVisible(false);

    // Placa no comecinho da fase: o balão encosta na borda em vez de sumir nela.
    return label.setX(Math.max(x, label.width / 2 + 8));
  }
}

function labelStyle(size: string, color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: LABEL_FONT,
    fontSize: size,
    fontStyle: '800',
    color,
    stroke: '#2a2350',
    strokeThickness: 7,
  };
}

function isNear(player: Phaser.Math.Vector2, x: number, y: number, reachX: number, reachY: number): boolean {
  return Math.abs(player.x - x) < reachX && Math.abs(player.y - y) < reachY;
}
