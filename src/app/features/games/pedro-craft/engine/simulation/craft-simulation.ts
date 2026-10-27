import type { CraftCatalog } from '../../content/craft-catalog';
import type { SpawnPoint } from '../../world/world-generator';
import type { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties, type PhysicsTerrain, physicsTerrain } from '../block-properties';
import type { CraftInputSnapshot } from '../input/craft-input';
import type { LookDelta } from '../input/craft-input-reader';
import { HeroMotion } from './hero-motion';

export interface CraftSimulationOptions {
  readonly catalog: CraftCatalog;
  readonly world: VoxelWorld;
  readonly spawn: SpawnPoint;
  readonly autoJump: boolean;
}

/**
 * O mundo em movimento, um passo fixo de cada vez.
 *
 * Não conhece three.js nem a página: recebe a entrada do passo e muda o
 * estado. O desenho só lê o que está aqui, e os testes rodam isto sem
 * navegador de verdade.
 */
export class CraftSimulation {
  readonly catalog: CraftCatalog;
  readonly world: VoxelWorld;
  readonly properties: BlockProperties;
  readonly terrain: PhysicsTerrain;
  readonly hero: HeroMotion;

  private autoJump: boolean;

  constructor(options: CraftSimulationOptions) {
    this.catalog = options.catalog;
    this.world = options.world;
    this.properties = new BlockProperties(options.catalog);
    this.terrain = physicsTerrain(options.world, this.properties);
    this.hero = new HeroMotion(options.spawn.x, options.spawn.y, options.spawn.z, options.spawn.yaw);
    this.autoJump = options.autoJump;
  }

  setAutoJump(isEnabled: boolean): void {
    this.autoJump = isEnabled;
  }

  look(delta: LookDelta): void {
    this.hero.look(delta.yaw, delta.pitch);
  }

  step(input: CraftInputSnapshot): void {
    this.hero.step(this.terrain, input, this.autoJump);
  }

  /** Os olhos estão dentro da água? Muda a cor e a névoa da tela. */
  get isEyeUnderwater(): boolean {
    const body = this.hero.body;

    return this.terrain.isLiquid(Math.floor(body.x), Math.floor(this.hero.eyeY), Math.floor(body.z));
  }
}
