import type { CraftCatalog } from '../content/craft-catalog';
import { type BlockShape, WALL_SIDES, type WallSide } from '../models/content.model';
import type { VoxelWorld } from '../world/voxel-world';

/** Forma do bloco como número, para caber num `Uint8Array`; 0 é o ar. */
export const SHAPE_CODE: Readonly<Record<BlockShape, number>> = {
  cube: 1,
  cross: 2,
  liquid: 3,
  torch: 4,
  fence: 5,
  slab: 6,
  rail: 7,
  carpet: 8,
  half: 9,
  wire: 10,
};

/** Um passo de lado, até o vizinho em x ou em z. */
export interface WallOffset {
  readonly dx: number;
  readonly dz: number;
}

/** Onde fica a parede de cada lado: o passo da célula da peça até o bloco que a segura. */
export const WALL_OFFSETS: Readonly<Record<WallSide, WallOffset>> = {
  north: { dx: 0, dz: -1 },
  east: { dx: 1, dz: 0 },
  south: { dx: 0, dz: 1 },
  west: { dx: -1, dz: 0 },
};

/** O lado cuja parede fica a um passo de (`dx`, `dz`); `null` se o passo não é de lado. */
export function wallSideAt(dx: number, dz: number): WallSide | null {
  return WALL_SIDES.find((side) => WALL_OFFSETS[side].dx === dx && WALL_OFFSETS[side].dz === dz) ?? null;
}

/** O passo até a parede da peça pelo código de `BlockProperties.wallSide`; `null` para a peça do chão. */
export function wallOffsetOf(code: number): WallOffset | null {
  const side = WALL_SIDES[code - 1];

  return side ? WALL_OFFSETS[side] : null;
}

/**
 * Propriedades dos blocos em vetores indexados pelo número interno.
 *
 * A física e a malha perguntam "esse bloco é sólido?" centenas de milhares de
 * vezes; um vetor tipado responde sem procurar nada em mapa.
 */
export class BlockProperties {
  /** Altura da caixa de colisão; 0 quando o bloco não bloqueia. */
  readonly collisionHeight: Float32Array;
  readonly isLiquid: Uint8Array;
  /** Cubo inteiro e opaco: esconde a face do vizinho e faz sombra nos cantos. */
  readonly isOpaqueCube: Uint8Array;
  readonly isReplaceable: Uint8Array;
  /** Brilho emitido, de 0 a 15. */
  readonly light: Uint8Array;
  readonly shape: Uint8Array;
  /** Vazado (folhas, vidro, plantas): desenhado no passe recortado. */
  readonly isTransparent: Uint8Array;
  /** A mira para nele; a água e o portal deixam a mira passar, como o ar. */
  readonly isTargetable: Uint8Array;
  /** Peça de circuito no jeito ligado (alavanca ligada, linha acesa): desenhada com brilho próprio. */
  readonly isPowered: Uint8Array;
  /** A linha desenha uma ponta até este vizinho: outra peça de circuito ou a TNT que ela acende. */
  readonly connectsWire: Uint8Array;
  /** Parede em que a peça está colada: 0 é o chão; de 1 em diante, a posição em `WALL_SIDES` mais um. */
  readonly wallSide: Uint8Array;

  constructor(catalog: CraftCatalog) {
    const count = catalog.blockCount;

    this.collisionHeight = new Float32Array(count);
    this.isLiquid = new Uint8Array(count);
    this.isOpaqueCube = new Uint8Array(count);
    this.isReplaceable = new Uint8Array(count);
    this.light = new Uint8Array(count);
    this.shape = new Uint8Array(count);
    this.isTransparent = new Uint8Array(count);
    this.isTargetable = new Uint8Array(count);
    this.isPowered = new Uint8Array(count);
    this.connectsWire = new Uint8Array(count);
    this.wallSide = new Uint8Array(count);

    for (let number = 1; number < count; number += 1) {
      const block = catalog.blockAt(number);

      if (!block) {
        continue;
      }

      this.collisionHeight[number] = block.solid ? block.collisionHeight : 0;
      this.isLiquid[number] = block.shape === 'liquid' ? 1 : 0;
      this.isOpaqueCube[number] = block.shape === 'cube' && !block.transparent ? 1 : 0;
      this.isReplaceable[number] = block.replaceable ? 1 : 0;
      this.light[number] = block.light;
      this.shape[number] = SHAPE_CODE[block.shape];
      this.isTransparent[number] = block.transparent ? 1 : 0;
      this.isTargetable[number] = block.shape !== 'liquid' && block.portal === null ? 1 : 0;
      this.isPowered[number] = block.circuit?.powered ? 1 : 0;
      this.connectsWire[number] = block.circuit !== null || block.explosive !== null ? 1 : 0;
      this.wallSide[number] = block.attachedTo === null ? 0 : WALL_SIDES.indexOf(block.attachedTo) + 1;
    }
  }
}

/**
 * O que a física enxerga do mundo.
 *
 * Fora das laterais existe uma parede invisível, e abaixo do mundo, chão: o
 * mar da borda já avisa que o mundo acaba, e a parede só garante que ninguém
 * nade para fora dele.
 */
export interface PhysicsTerrain {
  collisionHeight(x: number, y: number, z: number): number;
  isLiquid(x: number, y: number, z: number): boolean;
}

export function physicsTerrain(world: VoxelWorld, properties: BlockProperties): PhysicsTerrain {
  return {
    collisionHeight: (x, y, z) => {
      if (x < 0 || z < 0 || x >= world.width || z >= world.depth || y < 0) {
        return 1;
      }

      return properties.collisionHeight[world.get(x, y, z)];
    },
    isLiquid: (x, y, z) => properties.isLiquid[world.get(x, y, z)] === 1,
  };
}
