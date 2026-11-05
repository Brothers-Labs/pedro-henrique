import type { VoxelWorld } from '../world/voxel-world';
import { type BlockProperties, SHAPE_CODE } from './block-properties';

/** Um passo no chão até um dos quatro vizinhos. */
export interface RailDirection {
  readonly dx: number;
  readonly dz: number;
}

/** Norte, leste, sul e oeste, sempre nesta ordem: o trem desempata pela ordem quando precisa. */
export const RAIL_DIRECTIONS: readonly RailDirection[] = [
  { dx: 0, dz: -1 },
  { dx: 1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: -1, dz: 0 },
];

export function isRail(world: VoxelWorld, properties: BlockProperties, x: number, y: number, z: number): boolean {
  return properties.shape[world.get(x, y, z)] === SHAPE_CODE.rail;
}

/**
 * Para onde o trilho da célula continua: os vizinhos na mesma altura que também são trilho.
 *
 * A malha desenha o trilho por aqui e o trem anda por aqui, então o que a
 * criança vê ligado é exatamente por onde o trem passa.
 */
export function railConnections(world: VoxelWorld, properties: BlockProperties, x: number, y: number, z: number): readonly RailDirection[] {
  return RAIL_DIRECTIONS.filter(({ dx, dz }) => isRail(world, properties, x + dx, y, z + dz));
}
