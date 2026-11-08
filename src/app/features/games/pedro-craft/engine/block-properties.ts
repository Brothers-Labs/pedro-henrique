import type { CraftCatalog } from '../content/craft-catalog';
import type { BlockShape } from '../models/content.model';
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
};

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
