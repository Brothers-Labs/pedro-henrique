import type { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { CropDefinition, CropMaturity } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import { placeTree } from '../../world/structures';
import type { BlockProperties } from '../block-properties';

/** As plantas olham em volta só de tempos em tempos: crescer leva dezenas de segundos. */
const FARM_TICK_MS = 1000;

/** Água a até esta distância, na altura da planta ou do solo, rega a planta. */
const WATER_REACH = 4;

/** Copa da árvore a partir do tronco e o quanto ela passa da altura dele. */
const CANOPY_RADIUS = 2;
const CANOPY_ABOVE_TRUNK = 2;

export interface PlantState {
  readonly crop: CropDefinition;
  /** De 0 até `crop.stages - 1`. */
  stage: number;
  elapsedMs: number;
}

export interface Harvest {
  readonly crop: CropDefinition;
  /** Tabela de drop da colheita madura. */
  readonly loot: string;
}

export interface FarmHost {
  /** Alguém está dentro da caixa? A árvore espera, em vez de prender o herói nas folhas. */
  isOccupied(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): boolean;
  /** A planta mudou de estágio: o desenho dela precisa ser refeito. */
  grew(x: number, y: number, z: number): void;
}

/**
 * O que está plantado e quanto já cresceu.
 *
 * Cada planta é lembrada pela célula do mundo, o mesmo número que vai para o
 * save. Quando o bloco dela some (colhido, quebrado, coberto), ela é
 * esquecida sozinha: quem quebra não precisa avisar a fazenda.
 */
export class Farm {
  readonly plants = new Map<number, PlantState>();

  private elapsedMs = 0;

  constructor(
    private readonly world: VoxelWorld,
    private readonly catalog: CraftCatalog,
    private readonly properties: BlockProperties,
    private readonly random: SeededRandom,
    private readonly host: FarmHost,
  ) {
    world.listen((x, y, z, _previous, next) => {
      const cell = world.indexOf(x, y, z);
      const plant = this.plants.get(cell);

      if (plant && next !== catalog.blockNumber(plant.crop.block)) {
        this.plants.delete(cell);
      }
    });
  }

  /** Começa a contar uma planta que acabou de ser posta no mundo. */
  plant(x: number, y: number, z: number, crop: CropDefinition): void {
    this.plants.set(this.world.indexOf(x, y, z), { crop, stage: 0, elapsedMs: 0 });
  }

  /** Estágio da planta na célula, para o desenho; 0 onde não há planta contada. */
  stageAt(x: number, y: number, z: number): number {
    return this.plants.get(this.world.indexOf(x, y, z))?.stage ?? 0;
  }

  /** A colheita da planta madura na célula; `null` se ela não está pronta ou não se colhe. */
  harvestAt(x: number, y: number, z: number): Harvest | null {
    const plant = this.plants.get(this.world.indexOf(x, y, z));

    if (!plant || plant.crop.mature.type !== 'harvest' || !isLastStage(plant)) {
      return null;
    }

    return { crop: plant.crop, loot: plant.crop.mature.loot };
  }

  step(elapsedMs: number): void {
    this.elapsedMs += elapsedMs;

    while (this.elapsedMs >= FARM_TICK_MS) {
      this.elapsedMs -= FARM_TICK_MS;
      this.grow(FARM_TICK_MS);
    }
  }

  private grow(elapsedMs: number): void {
    for (const [cell, plant] of this.plants) {
      const { crop } = plant;

      // Pronta para colher, a planta espera: nada estraga se a criança demorar.
      if (crop.mature.type === 'harvest' && isLastStage(plant)) {
        continue;
      }

      const { x, y, z } = this.world.positionOf(cell);
      const speed = this.isWatered(x, y, z) ? crop.wateredSpeedup : 1;

      plant.elapsedMs += elapsedMs * speed;

      if (plant.elapsedMs < crop.stageMs) {
        continue;
      }

      if (!isLastStage(plant)) {
        plant.elapsedMs -= crop.stageMs;
        plant.stage += 1;
        this.host.grew(x, y, z);
      } else if (crop.mature.type === 'tree') {
        this.growTree(x, y, z, crop.mature);
      }
    }
  }

  /** A muda vira árvore. Com alguém no caminho, ela tenta de novo na próxima vez. */
  private growTree(x: number, y: number, z: number, tree: Extract<CropMaturity, { type: 'tree' }>): void {
    const height = this.random.integer(tree.minHeight, tree.maxHeight);
    const isBlocked = this.host.isOccupied(
      x - CANOPY_RADIUS,
      y,
      z - CANOPY_RADIUS,
      x + CANOPY_RADIUS + 1,
      y + height + CANOPY_ABOVE_TRUNK,
      z + CANOPY_RADIUS + 1,
    );

    if (isBlocked) {
      return;
    }

    const world = this.world;

    world.set(x, y, z, AIR);
    placeTree(
      { get: (cellX, cellY, cellZ) => world.get(cellX, cellY, cellZ), put: (cellX, cellY, cellZ, block) => world.set(cellX, cellY, cellZ, block) },
      this.catalog,
      x,
      y,
      z,
      { log: this.catalog.blockNumber(tree.log), leaves: this.catalog.blockNumber(tree.leaves), height },
      this.random,
    );
  }

  private isWatered(x: number, y: number, z: number): boolean {
    for (let dy = -1; dy <= 0; dy += 1) {
      for (let dz = -WATER_REACH; dz <= WATER_REACH; dz += 1) {
        for (let dx = -WATER_REACH; dx <= WATER_REACH; dx += 1) {
          if (this.properties.isLiquid[this.world.get(x + dx, y + dy, z + dz)] === 1) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

function isLastStage(plant: PlantState): boolean {
  return plant.stage >= plant.crop.stages - 1;
}
