import { BIG_COIN_VALUE, HUGE_COIN_VALUE, TILE_SIZE } from '../../config/physics.config';
import { giantCoinValue, isGiantCoinType, type ItemType, type LevelObject, type PowerUpKind } from '../../models/level.model';

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
/** A Moeda Gigantesca tem dois blocos de diâmetro: encostar na borda dela já pega. */
const MEGA_COIN_EXTRA_REACH = 26;

/**
 * A Moeda Gigantesca vale 10 na hora e estoura numa chuva de 20 moedas
 * comuns, espalhadas em volta, que o herói sai catando: 30 no total.
 */
export const MEGA_COIN = {
  directValue: 10,
  showerCoins: 20,
} as const;
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

      if (isGiantCoinType(object.type)) {
        this.spawn(object.type, x, y, {}, null);
        continue;
      }

      switch (object.type) {
        case 'coin':
        case 'big-coin':
        case 'huge-coin':
        case 'mega-coin':
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

  /** `magnetRadius` em pixels: até onde as moedas são puxadas; 0 quando não há ímã. */
  /**
   * `canCollect` deixa de fora o que este herói não pega: os amigos do
   * Jogador 1 pegam moedas, cristais e corações, mas deixam os poderes para ele.
   */
  update(deltaMs: number, playerX: number, playerY: number, magnetRadius: number, canCollect?: (item: Collectible) => boolean): void {
    const pull = Math.min(1, (MAGNET_PULL_PER_SECOND * deltaMs) / 1000);

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];

      if (canCollect && !canCollect(item)) {
        continue;
      }

      if (magnetRadius > 0 && coinValue(item.kind) > 0) {
        const distanceX = playerX - item.x;
        const distanceY = playerY - item.y;

        if (distanceX * distanceX + distanceY * distanceY < magnetRadius * magnetRadius) {
          item.x += distanceX * pull;
          item.y += distanceY * pull;
        }
      }

      const extra = item.kind === 'mega-coin' ? MEGA_COIN_EXTRA_REACH : 0;

      if (Math.abs(playerX - item.x) < REACH_X + extra && Math.abs(playerY - item.y) < REACH_Y + extra) {
        this.items.splice(index, 1);
        this.host.onCollected(item);
      }
    }
  }
}

/**
 * Moedas que um item vale: as gigantes valem várias; o que não é moeda,
 * nenhuma. A Gigantesca conta também a chuva que ela solta, para a meta das
 * estrelas somar tudo o que dá para pegar.
 */
export function coinValue(kind: CollectibleKind): number {
  if (isGiantCoinType(kind)) {
    return giantCoinValue(kind);
  }

  switch (kind) {
    case 'coin':
      return 1;
    case 'big-coin':
      return BIG_COIN_VALUE;
    case 'huge-coin':
      return HUGE_COIN_VALUE;
    case 'mega-coin':
      return MEGA_COIN.directValue + MEGA_COIN.showerCoins;
    case 'crystal':
    case 'heart':
    case 'power-up':
      return 0;
  }
}
