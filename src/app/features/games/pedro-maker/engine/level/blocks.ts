import * as Phaser from 'phaser';

import { MOVING_PLATFORM_HEIGHT, MOVING_PLATFORM_WIDTH } from '../../art/block-art';
import { TEXTURES } from '../../art/texture-catalog';
import { PLAYER_PHYSICS, SURPRISE_COIN_COUNT, TILE_SIZE } from '../../config/physics.config';
import type { LevelObject, PowerUpKind, SurpriseContent } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import { ANIMATIONS } from '../animations';
import { DEPTH, type Effects } from '../effects';
import type { Player } from '../entities/player';

export interface BlockHost {
  readonly effects: Effects;
  playSound(cue: MakerSoundCue): void;
  addCoins(amount: number, x: number, y: number): void;
  spawnCollectible(kind: 'heart' | 'crystal' | 'power-up', x: number, y: number, extra: SpawnExtra): void;
}

export interface SpawnExtra {
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
}

type SolidKind = 'brick' | 'surprise' | 'spring' | 'crumble';

interface SolidBlock {
  readonly kind: SolidKind;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly contents?: SurpriseContent;
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
  isUsed: boolean;
}

interface MovingPlatform {
  readonly sprite: Phaser.Physics.Arcade.Image;
  readonly axis: 'horizontal' | 'vertical';
  readonly start: number;
  readonly end: number;
}

const MOVING_SPEED = 90;
const CRUMBLE_DELAY_MS = 450;
const CRUMBLE_RESPAWN_MS = 3000;

/**
 * Blocos que reagem ao Pedro.
 *
 * Todos os sólidos ficam num grupo estático só — quebrável, surpresa, mola e
 * a plataforma que desaparece — e a reação é decidida pelo lado do contato:
 * cabeçada por baixo quebra ou abre, pisar em cima faz a mola saltar e a
 * plataforma frágil começar a tremer.
 */
export class BlockSystem {
  readonly solids: Phaser.Physics.Arcade.StaticGroup;
  readonly movers: Phaser.Physics.Arcade.Group;
  readonly hazards: readonly Phaser.Geom.Rectangle[];

  private readonly blocks = new Map<Phaser.Physics.Arcade.Sprite, SolidBlock>();
  private readonly platforms: MovingPlatform[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    objects: readonly LevelObject[],
    crystalIndexOf: ReadonlyMap<LevelObject, number>,
    private readonly host: BlockHost,
  ) {
    this.solids = scene.physics.add.staticGroup();
    this.movers = scene.physics.add.group({ allowGravity: false, immovable: true });

    const hazards: Phaser.Geom.Rectangle[] = [];

    for (const object of objects) {
      const x = object.x * TILE_SIZE;
      const y = object.y * TILE_SIZE;

      switch (object.type) {
        case 'brick':
          this.addSolid('brick', TEXTURES.brick, object);
          break;
        case 'surprise':
          this.addSolid('surprise', TEXTURES.surprise, object, crystalIndexOf.get(object));
          break;
        case 'spring':
          this.addSolid('spring', TEXTURES.spring, object);
          break;
        case 'crumble':
          this.addSolid('crumble', TEXTURES.crumble, object);
          break;
        case 'moving-platform':
          this.addMovingPlatform(object);
          break;
        case 'lava':
          scene.add.sprite(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TEXTURES.lava, 0).setDepth(DEPTH.blocks).play(ANIMATIONS.lava);
          // A lava queima a partir de um pouco abaixo da superfície: encostar de raspão não conta.
          hazards.push(new Phaser.Geom.Rectangle(x + 4, y + 14, TILE_SIZE - 8, TILE_SIZE - 14));
          break;
        default:
          break;
      }
    }

    this.hazards = hazards;
  }

  /** Há bloco sólido neste ponto? Usado pelos inimigos para não cair da beirada. */
  isSolidAt(worldX: number, worldY: number): boolean {
    for (const block of this.blocks.values()) {
      if (block.sprite.active && block.sprite.getBounds().contains(worldX, worldY)) {
        return true;
      }
    }

    return false;
  }

  /** Reação ao contato do Pedro com um bloco sólido. */
  handlePlayerContact(player: Player, sprite: Phaser.Physics.Arcade.Sprite): void {
    const block = this.blocks.get(sprite);

    if (!block) {
      return;
    }

    const body = player.arcadeBody;

    if (body.touching.up && (block.kind === 'brick' || block.kind === 'surprise')) {
      this.hitFromBelow(block);
      return;
    }

    if (!body.touching.down) {
      return;
    }

    if (block.kind === 'spring') {
      this.launch(player, block);
    } else if (block.kind === 'crumble') {
      this.startCrumbling(block);
    }
  }

  update(): void {
    for (const platform of this.platforms) {
      const body = platform.sprite.body as Phaser.Physics.Arcade.Body;
      const position = platform.axis === 'horizontal' ? platform.sprite.x : platform.sprite.y;
      const velocity = platform.axis === 'horizontal' ? body.velocity.x : body.velocity.y;

      if ((velocity > 0 && position >= platform.end) || (velocity < 0 && position <= platform.start)) {
        if (platform.axis === 'horizontal') {
          body.setVelocityX(-velocity);
        } else {
          body.setVelocityY(-velocity);
        }
      }
    }
  }

  private addSolid(kind: SolidKind, texture: string, object: LevelObject, crystalIndex?: number): void {
    const centerX = object.x * TILE_SIZE + TILE_SIZE / 2;
    const isCrumble = kind === 'crumble';
    const centerY = object.y * TILE_SIZE + (isCrumble ? TILE_SIZE / 4 : TILE_SIZE / 2);
    // Só quebrável e frágil são quadro único; surpresa e mola são tiras de quadros.
    const frame = kind === 'surprise' || kind === 'spring' ? 0 : undefined;
    const sprite = this.solids.create(centerX, centerY, texture, frame) as Phaser.Physics.Arcade.Sprite;

    sprite.setDepth(DEPTH.blocks);

    if (isCrumble) {
      const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
      // Frágil e de mão única: segura quem pisa, deixa passar por baixo.
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    this.blocks.set(sprite, {
      kind,
      sprite,
      contents: object.properties?.contents ?? (kind === 'surprise' ? 'coins' : undefined),
      powerUp: object.properties?.powerUp,
      crystalIndex,
      isUsed: false,
    });
  }

  private addMovingPlatform(object: LevelObject): void {
    const axis = object.properties?.axis ?? 'horizontal';
    const range = (object.properties?.range ?? 3) * TILE_SIZE;
    const x = object.x * TILE_SIZE + MOVING_PLATFORM_WIDTH / 2;
    const y = object.y * TILE_SIZE + MOVING_PLATFORM_HEIGHT / 2;
    const sprite = this.movers.create(x, y, TEXTURES.movingPlatform) as Phaser.Physics.Arcade.Image;
    const body = sprite.body as Phaser.Physics.Arcade.Body;

    sprite.setDepth(DEPTH.blocks);
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    if (axis === 'horizontal') {
      body.setVelocityX(MOVING_SPEED);
      this.platforms.push({ sprite, axis, start: x, end: x + range });
    } else {
      body.setVelocityY(-MOVING_SPEED);
      this.platforms.push({ sprite, axis, start: y - range, end: y });
    }
  }

  private hitFromBelow(block: SolidBlock): void {
    const { sprite } = block;

    if (block.kind === 'brick') {
      this.host.playSound('break');
      this.host.effects.burst('poof', sprite.x, sprite.y, 14);
      this.host.effects.shake('leve');
      this.blocks.delete(sprite);
      sprite.destroy();
      return;
    }

    if (block.isUsed) {
      this.bump(sprite);
      return;
    }

    block.isUsed = true;
    sprite.setFrame(1);
    this.bump(sprite);
    this.releaseContents(block);
  }

  private releaseContents(block: SolidBlock): void {
    const x = block.sprite.x;
    const y = block.sprite.y - TILE_SIZE;

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
        this.popCoins(x, y);
        return;
    }
  }

  private popCoins(x: number, y: number): void {
    this.host.addCoins(SURPRISE_COIN_COUNT, x, y);

    for (let index = 0; index < SURPRISE_COIN_COUNT; index += 1) {
      const coin = this.scene.add.sprite(x, y + 20, TEXTURES.coin, 0).setDepth(DEPTH.items).play(ANIMATIONS.coinSpin);

      this.scene.tweens.add({
        targets: coin,
        x: x + (index - (SURPRISE_COIN_COUNT - 1) / 2) * 18,
        y: y - 40 - (index % 2) * 16,
        alpha: 0,
        duration: 520,
        delay: index * 50,
        ease: 'Quad.easeOut',
        onComplete: () => coin.destroy(),
      });
    }
  }

  private bump(sprite: Phaser.Physics.Arcade.Sprite): void {
    this.scene.tweens.add({ targets: sprite, y: sprite.y - 8, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  }

  private launch(player: Player, block: SolidBlock): void {
    player.bounce(PLAYER_PHYSICS.springVelocity, false);
    block.sprite.setFrame(1);
    this.host.playSound('spring');
    this.host.effects.burst('sparkle', block.sprite.x, block.sprite.y - 20, 8);
    this.scene.time.delayedCall(160, () => {
      if (block.sprite.active) {
        block.sprite.setFrame(0);
      }
    });
  }

  private startCrumbling(block: SolidBlock): void {
    if (block.isUsed) {
      return;
    }

    block.isUsed = true;
    const { sprite } = block;
    const originX = sprite.x;

    this.scene.tweens.add({
      targets: sprite,
      x: originX + 3,
      duration: 50,
      yoyo: true,
      repeat: Math.floor(CRUMBLE_DELAY_MS / 100),
      onComplete: () => {
        sprite.setX(originX);
        sprite.setVisible(false);
        (sprite.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        this.host.effects.burst('dust', sprite.x, sprite.y, 8);
        this.scene.time.delayedCall(CRUMBLE_RESPAWN_MS, () => this.restoreCrumble(block));
      },
    });
  }

  private restoreCrumble(block: SolidBlock): void {
    if (!block.sprite.active) {
      return;
    }

    block.isUsed = false;
    block.sprite.setVisible(true).setAlpha(0);
    (block.sprite.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    this.scene.tweens.add({ targets: block.sprite, alpha: 1, duration: 250 });
  }
}
