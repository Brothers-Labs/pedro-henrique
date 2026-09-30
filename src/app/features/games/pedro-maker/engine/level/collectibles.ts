import type * as Phaser from 'phaser';

import { powerUpTexture, TEXTURES } from '../../art/texture-catalog';
import { MAGNET_RADIUS, TILE_SIZE } from '../../config/physics.config';
import type { LevelObject, PowerUpKind } from '../../models/level.model';
import { ANIMATIONS } from '../animations';
import { DEPTH } from '../effects';

export type CollectibleKind = 'coin' | 'crystal' | 'heart' | 'power-up';

export interface Collectible {
  readonly kind: CollectibleKind;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
}

export interface CollectibleHost {
  onCollected(item: Collectible): void;
}

/** Meia largura e meia altura da área de coleta em volta do centro do Pedro. */
const REACH_X = 30;
const REACH_Y = 42;
const MAGNET_PULL_PER_SECOND = 9;

/**
 * Moedas, cristais, corações e power-ups.
 *
 * Nenhum deles tem corpo físico: a coleta é uma conta de distância por
 * quadro, muito mais barata que cem corpos sobrepostos e fácil de combinar
 * com o ímã, que só precisa puxar a moeda para perto.
 */
export class CollectibleSystem {
  private readonly items: Collectible[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    objects: readonly LevelObject[],
    crystalIndexOf: ReadonlyMap<LevelObject, number>,
    private readonly host: CollectibleHost,
  ) {
    for (const object of objects) {
      const x = object.x * TILE_SIZE + TILE_SIZE / 2;
      const y = object.y * TILE_SIZE + TILE_SIZE / 2;

      switch (object.type) {
        case 'coin':
          this.spawn('coin', x, y, {});
          break;
        case 'crystal':
          this.spawn('crystal', x, y, { crystalIndex: crystalIndexOf.get(object) });
          break;
        case 'heart':
          this.spawn('heart', x, y, {});
          break;
        case 'power-up':
          this.spawn('power-up', x, y, { powerUp: object.properties?.powerUp ?? 'super-jump' });
          break;
        default:
          break;
      }
    }
  }

  /** Quantas moedas soltas a fase tem, para a meta de 70% das estrelas. */
  get coinCount(): number {
    return this.items.filter((item) => item.kind === 'coin').length;
  }

  /** Posições dos cristais ainda não pegos. */
  remainingCrystals(): readonly Collectible[] {
    return this.items.filter((item) => item.kind === 'crystal');
  }

  spawn(
    kind: CollectibleKind,
    x: number,
    y: number,
    extra: { readonly powerUp?: PowerUpKind; readonly crystalIndex?: number },
    popsOut = false,
  ): void {
    const sprite = this.scene.add.sprite(x, y, textureFor(kind, extra.powerUp)).setDepth(DEPTH.items);

    if (kind === 'coin') {
      sprite.play(ANIMATIONS.coinSpin);
    } else {
      // Balanço suave: o que não é moeda chama atenção sem piscar.
      this.scene.tweens.add({ targets: sprite, y: y - 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    if (popsOut) {
      sprite.setScale(0.2);
      this.scene.tweens.add({ targets: sprite, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }

    this.items.push({ kind, sprite, powerUp: extra.powerUp, crystalIndex: extra.crystalIndex });
  }

  update(deltaMs: number, playerX: number, playerY: number, hasMagnet: boolean): void {
    const pull = Math.min(1, (MAGNET_PULL_PER_SECOND * deltaMs) / 1000);

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      const sprite = item.sprite;

      if (hasMagnet && item.kind === 'coin') {
        const distanceX = playerX - sprite.x;
        const distanceY = playerY - sprite.y;

        if (distanceX * distanceX + distanceY * distanceY < MAGNET_RADIUS * MAGNET_RADIUS) {
          sprite.x += distanceX * pull;
          sprite.y += distanceY * pull;
        }
      }

      if (Math.abs(playerX - sprite.x) < REACH_X && Math.abs(playerY - sprite.y) < REACH_Y) {
        this.items.splice(index, 1);
        this.collect(item);
      }
    }
  }

  private collect(item: Collectible): void {
    this.host.onCollected(item);
    this.scene.tweens.killTweensOf(item.sprite);
    this.scene.tweens.add({
      targets: item.sprite,
      y: item.sprite.y - 30,
      scale: 1.4,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => item.sprite.destroy(),
    });
  }
}

function textureFor(kind: CollectibleKind, powerUp: PowerUpKind | undefined): string {
  switch (kind) {
    case 'coin':
      return TEXTURES.coin;
    case 'crystal':
      return TEXTURES.crystal;
    case 'heart':
      return TEXTURES.heart;
    case 'power-up':
      return powerUpTexture(powerUp ?? 'super-jump');
  }
}
