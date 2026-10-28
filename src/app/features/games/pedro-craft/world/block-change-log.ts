import type { VoxelWorld } from './voxel-world';

/**
 * As células que mudaram desde que o mundo foi gerado.
 *
 * É o que o save guarda: a semente refaz todo o resto. Uma célula que voltou
 * a ser o que era continua anotada — guardá-la a mais custa pouco, e
 * descobrir que voltou exigiria gerar o mundo de novo.
 */
export class BlockChangeLog {
  private readonly cells = new Set<number>();

  constructor(world: VoxelWorld) {
    world.listen((x, y, z) => this.cells.add(world.indexOf(x, y, z)));
  }

  get changed(): ReadonlySet<number> {
    return this.cells;
  }
}
