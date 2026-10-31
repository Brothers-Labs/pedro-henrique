import { BIG_COIN_VALUE, HUGE_COIN_VALUE, MAGNET_RADIUS, TILE_SIZE } from '../../config/physics.config';
import type { ItemType, LevelObject, PowerUpKind } from '../../models/level.model';

export type CollectibleKind = ItemType;

export interface Collectible {
  readonly id: number;
  readonly kind: CollectibleKind;
  /** Centro, em pixels do mundo. O ímã puxa, então muda. */
  x: number;
  y: number;
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
  /** Saiu de um bloco surpresa: a tela faz o item crescer ao aparecer. */
  readonly spawnedAt: number | null;
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
 * Nenhum deles tem corpo físico: a coleta é uma conta de distância por passo,
 * muito mais barata que cem corpos sobrepostos e fácil de combinar com o ímã,
 * que só precisa puxar a moeda para perto.
 */
export class CollectibleSystem {
  readonly items: Collectible[] = [];

  private nextId = 1;

  constructor(
    objects: readonly LevelObject[],
    crystalIndexOf: ReadonlyMap<LevelObject, number>,
    private readonly host: CollectibleHost,
  ) {
    for (const object of objects) {
      const x = (object.x + 0.5) * TILE_SIZE;
      const y = (object.y + 0.5) * TILE_SIZE;

      switch (object.type) {
        case 'coin':
        case 'big-coin':
        case 'huge-coin':
        case 'coin-25':
        case 'coin-100':
        case 'coin-250':
        case 'coin-500':
        case 'coin-1000':
        case 'coin-2500':
        case 'coin-5000':
        case 'coin-10000':
        case 'coin-50000':
        case 'heart':
          this.spawn(object.type, x, y, {}, null);
          break;
        case 'crystal':
          this.spawn('crystal', x, y, { crystalIndex: crystalIndexOf.get(object) }, null);
          break;
        case 'power-up':
          this.spawn('power-up', x, y, { powerUp: object.properties?.powerUp ?? 'super-jump' }, null);
          break;
        default:
          break;
      }
    }
  }

  /** Quantas moedas soltas a fase vale, para a meta de 70% das estrelas. */
  get coinCount(): number {
    return this.items.reduce((total, item) => total + coinValue(item.kind), 0);
  }

  spawn(
    kind: CollectibleKind,
    x: number,
    y: number,
    extra: { readonly powerUp?: PowerUpKind; readonly crystalIndex?: number },
    spawnedAt: number | null,
  ): void {
    this.items.push({ id: this.nextId, kind, x, y, powerUp: extra.powerUp, crystalIndex: extra.crystalIndex, spawnedAt });
    this.nextId += 1;
  }

  update(deltaMs: number, playerX: number, playerY: number, hasMagnet: boolean): void {
    const pull = Math.min(1, (MAGNET_PULL_PER_SECOND * deltaMs) / 1000);

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];

      if (hasMagnet && coinValue(item.kind) > 0) {
        const distanceX = playerX - item.x;
        const distanceY = playerY - item.y;

        if (distanceX * distanceX + distanceY * distanceY < MAGNET_RADIUS * MAGNET_RADIUS) {
          item.x += distanceX * pull;
          item.y += distanceY * pull;
        }
      }

      if (Math.abs(playerX - item.x) < REACH_X && Math.abs(playerY - item.y) < REACH_Y) {
        this.items.splice(index, 1);
        this.host.onCollected(item);
      }
    }
  }
}

/** Moedas que um item vale: as gigantes valem várias; o que não é moeda, nenhuma. */
export function coinValue(kind: CollectibleKind): number {
  switch (kind) {
    case 'coin':
      return 1;
    case 'big-coin':
      return BIG_COIN_VALUE;
    case 'huge-coin':
      return HUGE_COIN_VALUE;
    case 'coin-25':
      return 25;
    case 'coin-100':
      return 100;
    case 'coin-250':
      return 250;
    case 'coin-500':
      return 500;
    case 'coin-1000':
      return 1000;
    case 'coin-2500':
      return 2500;
    case 'coin-5000':
      return 5000;
    case 'coin-10000':
      return 10000;
    case 'coin-50000':
      return 50000;
    case 'crystal':
    case 'heart':
    case 'power-up':
      return 0;
  }
}
