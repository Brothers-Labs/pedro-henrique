import { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { CropDefinition } from '../../models/content.model';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties } from '../block-properties';
import { Farm } from './farm';

const SIZE = 16;
const GROUND = 2;
const PLANT = { x: 5, y: GROUND + 1, z: 5 } as const;

describe('Fazenda do PedroCraft', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let farm: Farm;
  let grown: { x: number; y: number; z: number }[];
  let isOccupied: boolean;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    world = new VoxelWorld(SIZE, SIZE, 16);

    for (let y = 0; y <= GROUND; y += 1) {
      for (let z = 0; z < SIZE; z += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          world.fill(x, y, z, catalog.blockNumber(y === GROUND ? 'grass' : 'stone'));
        }
      }
    }

    grown = [];
    isOccupied = false;
    farm = new Farm(world, catalog, new BlockProperties(catalog), new SeededRandom(3), {
      isOccupied: () => isOccupied,
      grew: (x, y, z) => grown.push({ x, y, z }),
    });
  });

  const sow = (cropId: string, at: { x: number; y: number; z: number } = PLANT): CropDefinition => {
    const crop = catalog.crop(cropId);

    world.fill(at.x, at.y - 1, at.z, catalog.blockNumber(crop.soil[0]));
    world.set(at.x, at.y, at.z, catalog.blockNumber(crop.block));
    farm.plant(at.x, at.y, at.z, crop);

    return crop;
  };

  it('cresce um estágio a cada stageMs e avisa o desenho', () => {
    const wheat = sow('wheat');

    farm.step(wheat.stageMs);

    expect(farm.stageAt(PLANT.x, PLANT.y, PLANT.z)).toBe(1);
    expect(grown).toEqual([PLANT]);
  });

  it('cresce mais rápido com água por perto', () => {
    const wheat = sow('wheat');
    const dry = { x: 12, y: PLANT.y, z: 12 } as const;

    sow('wheat', dry);
    world.fill(PLANT.x + 3, GROUND, PLANT.z, catalog.blockNumber('water'));
    farm.step(wheat.stageMs / wheat.wateredSpeedup);

    expect(farm.stageAt(PLANT.x, PLANT.y, PLANT.z)).toBe(1);
    expect(farm.stageAt(dry.x, dry.y, dry.z)).toBe(0);
  });

  it('só dá colheita quando está madura, e madura para de crescer', () => {
    const wheat = sow('wheat');

    farm.step(wheat.stageMs);
    expect(farm.harvestAt(PLANT.x, PLANT.y, PLANT.z)).toBeNull();

    farm.step(wheat.stageMs * (wheat.stages + 3));

    expect(farm.stageAt(PLANT.x, PLANT.y, PLANT.z)).toBe(wheat.stages - 1);
    expect(farm.harvestAt(PLANT.x, PLANT.y, PLANT.z)).toEqual({ crop: wheat, loot: 'wheat-harvest' });
  });

  it('esquece a planta quando o bloco dela sai do mundo', () => {
    sow('carrot');
    world.set(PLANT.x, PLANT.y, PLANT.z, AIR);

    expect(farm.plants.size).toBe(0);
  });

  it('a muda vira árvore no lugar dela', () => {
    const sapling = sow('oak-tree');

    farm.step(sapling.stageMs * sapling.stages);

    expect(world.get(PLANT.x, PLANT.y, PLANT.z)).toBe(catalog.blockNumber('oak-log'));
    expect(world.topY(PLANT.x, PLANT.z)).toBeGreaterThan(PLANT.y + 2);
    expect(farm.plants.size).toBe(0);
  });

  it('a muda espera quando o herói está onde a árvore cresceria', () => {
    const sapling = sow('oak-tree');

    isOccupied = true;
    farm.step(sapling.stageMs * sapling.stages);

    expect(world.get(PLANT.x, PLANT.y, PLANT.z)).toBe(catalog.blockNumber(sapling.block));

    isOccupied = false;
    farm.step(1000);

    expect(world.get(PLANT.x, PLANT.y, PLANT.z)).toBe(catalog.blockNumber('oak-log'));
  });
});
