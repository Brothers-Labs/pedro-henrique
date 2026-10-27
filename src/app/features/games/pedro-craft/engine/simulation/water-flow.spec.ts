import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { WaterFlow } from './water-flow';

const SIZE = 24;
const GROUND = 2;
const CENTER = 12;

describe('Água do PedroCraft', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let flow: WaterFlow;
  let source: number;
  let flowing: number;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    world = new VoxelWorld(SIZE, SIZE, 12);

    for (let y = 0; y < GROUND; y += 1) {
      for (let z = 0; z < SIZE; z += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          world.fill(x, y, z, catalog.blockNumber('stone'));
        }
      }
    }

    flow = new WaterFlow(world, catalog);
    source = catalog.blockNumber('water');
    flowing = catalog.blockNumber('flowing-water');
  });

  const ticks = (count: number): void => {
    for (let tick = 0; tick < count; tick += 1) {
      flow.step(catalog.world.water.tickMs);
    }
  };

  const settle = (): void => {
    ticks(100);
    expect(flow.isSettled).toBeTrue();
  };

  it('anda um bloco a cada passo da água', () => {
    world.set(CENTER, GROUND, CENTER, source);
    ticks(1);

    expect(world.get(CENTER + 1, GROUND, CENTER)).toBe(flowing);
    expect(world.get(CENTER + 2, GROUND, CENTER)).toBe(AIR);
  });

  it('se espalha no máximo maxSpread blocos, contando os passos pelo chão', () => {
    const spread = catalog.world.water.maxSpread;

    world.set(CENTER, GROUND, CENTER, source);
    settle();

    expect(world.get(CENTER + spread, GROUND, CENTER)).toBe(flowing);
    expect(world.get(CENTER + spread + 1, GROUND, CENTER)).toBe(AIR);
    expect(world.get(CENTER + 2, GROUND, CENTER + spread - 2)).toBe(flowing);
    expect(world.get(CENTER + 2, GROUND, CENTER + spread - 1)).toBe(AIR);
  });

  it('cai direto para baixo antes de escorrer, e escorre de novo onde cai', () => {
    const high = GROUND + 4;

    world.set(CENTER, high, CENTER, source);
    settle();

    for (let y = GROUND; y < high; y += 1) {
      expect(world.get(CENTER, y, CENTER)).withContext(`altura ${y}`).toBe(flowing);
    }

    expect(world.get(CENTER + 1, high, CENTER)).toBe(AIR);
    expect(world.get(CENTER + catalog.world.water.maxSpread, GROUND, CENTER)).toBe(flowing);
  });

  it('para numa parede', () => {
    world.set(CENTER + 1, GROUND, CENTER, catalog.blockNumber('stone'));
    world.set(CENTER, GROUND, CENTER, source);
    settle();

    expect(world.get(CENTER + 1, GROUND, CENTER)).toBe(catalog.blockNumber('stone'));
    expect(world.get(CENTER + 2, GROUND, CENTER)).toBe(flowing);
  });

  it('seca sozinha quando a nascente é tirada', () => {
    world.set(CENTER, GROUND, CENTER, source);
    settle();
    world.set(CENTER, GROUND, CENTER, AIR);
    settle();

    for (let z = 0; z < SIZE; z += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        expect(world.get(x, GROUND, z)).withContext(`(${x}, ${z})`).toBe(AIR);
      }
    }
  });

  it('enche o buraco cavado ao lado do lago, sem mexer no resto do lago', () => {
    for (let x = CENTER - 2; x <= CENTER; x += 1) {
      world.fill(x, GROUND, CENTER, source);
    }

    world.fill(CENTER + 1, GROUND, CENTER, catalog.blockNumber('dirt'));
    world.set(CENTER + 1, GROUND, CENTER, AIR);
    settle();

    expect(world.get(CENTER + 1, GROUND, CENTER)).toBe(flowing);
    expect(world.get(CENTER - 2, GROUND, CENTER)).toBe(source);
  });
});
