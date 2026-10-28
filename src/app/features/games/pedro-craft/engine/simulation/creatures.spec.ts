import { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import type { CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties, physicsTerrain, type PhysicsTerrain } from '../block-properties';
import { Creatures } from './creatures';

const SIZE = 80;
const FLOOR_TOP = 3;
const HERO = { x: SIZE / 2, z: SIZE / 2 } as const;

describe('Animais do PedroCraft', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let terrain: PhysicsTerrain;
  let creatures: Creatures;
  let laid: string[];

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    world = new VoxelWorld(SIZE, SIZE, 16);

    for (let y = 0; y < FLOOR_TOP; y += 1) {
      for (let z = 0; z < SIZE; z += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          world.fill(x, y, z, catalog.blockNumber(y === FLOOR_TOP - 1 ? 'grass' : 'stone'));
        }
      }
    }

    const properties = new BlockProperties(catalog);

    terrain = physicsTerrain(world, properties);
    laid = [];
    creatures = new Creatures(world, catalog, properties, new SeededRandom(7), {
      hero: () => HERO,
      laid: (_creature, item) => laid.push(item),
    });
  });

  const run = (steps: number): void => {
    for (let step = 0; step < steps; step += 1) {
      creatures.step(terrain);
    }
  };

  it('faz nascer só animais passivos, longe do herói e até o teto do mundo', () => {
    run(60 * 120);

    const settings = catalog.world.creatures;

    expect(creatures.list.length).toBeGreaterThan(0);
    expect(creatures.list.length).toBeLessThanOrEqual(settings.passiveCap);
    expect(creatures.list.every((creature) => creature.definition.temperament === 'passive')).toBeTrue();
  });

  it('a ovelha nasce em cima da grama, e não dentro dela', () => {
    for (let step = 0; step < 60 * 120 && creatures.list.length === 0; step += 1) {
      creatures.step(terrain);
    }

    const first = creatures.list[0];
    const distance = Math.hypot(first.body.x - HERO.x, first.body.z - HERO.z);

    expect(distance).toBeGreaterThanOrEqual(catalog.world.creatures.minSpawnDistance - 3);
    expect(first.body.y).toBeGreaterThanOrEqual(FLOOR_TOP - 0.01);
  });

  it('não nasce animal onde o chão não é o dele', () => {
    for (let z = 0; z < SIZE; z += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        world.fill(x, FLOOR_TOP - 1, z, catalog.blockNumber('stone'));
      }
    }

    run(60 * 30);

    expect(creatures.list.length).toBe(0);
  });

  it('a ovelha passeia sem afundar no chão nem sair voando', () => {
    const sheep = creatures.spawn(catalog.creature('sheep'), 20.5, FLOOR_TOP, 20.5);

    run(60 * 20);

    expect(sheep.body.y).toBeCloseTo(FLOOR_TOP, 2);
    expect(Math.hypot(sheep.body.x - 20.5, sheep.body.z - 20.5)).toBeGreaterThan(0);
  });

  it('dá meia-volta na beira da água em vez de entrar nela', () => {
    for (let z = 0; z < SIZE; z += 1) {
      for (let x = 23; x < SIZE; x += 1) {
        world.fill(x, FLOOR_TOP - 1, z, catalog.blockNumber('water'));
      }
    }

    const sheep = creatures.spawn(catalog.creature('sheep'), 21.5, FLOOR_TOP, 20.5);

    sheep.mood = 'wander';
    sheep.moodLeftMs = 60_000;
    sheep.yaw = -Math.PI / 2;
    run(60 * 5);

    expect(sheep.body.x).toBeLessThan(23);
    expect(sheep.body.isInWater).toBeFalse();
  });

  it('foge de quem bate e é derrotada quando a vida acaba', () => {
    const sheep = creatures.spawn(catalog.creature('sheep'), 20.5, FLOOR_TOP, 20.5);

    expect(creatures.hit(sheep, 1, 3, 18.5, 20.5)).toBeFalse();
    expect(sheep.mood).toBe('flee');
    expect(sheep.body.velocityX).toBeGreaterThan(0);

    expect(creatures.hit(sheep, sheep.health, 3, 18.5, 20.5)).toBeTrue();
    expect(creatures.list).not.toContain(sheep);
  });

  it('a lã tosquiada cresce de volta depois da espera', () => {
    const sheep = creatures.spawn(catalog.creature('sheep'), 20.5, FLOOR_TOP, 20.5);
    const [shear] = sheep.definition.interactions;

    sheep.startCooldown(shear);

    expect(sheep.canUse(shear)).toBeFalse();
    expect(sheep.isCoolingDown).toBeTrue();

    sheep.tickCooldowns(shear.cooldownMs);

    expect(sheep.canUse(shear)).toBeTrue();
    expect(sheep.isCoolingDown).toBeFalse();
  });

  it('a galinha bota ovo de tempos em tempos', () => {
    const chicken = catalog.creature('chicken');

    creatures.spawn(chicken, 20.5, FLOOR_TOP, 20.5);
    run(Math.ceil((chicken.lays?.everyMs ?? 0) / (1000 / 60)) + 1);

    expect(laid).toEqual(['egg']);
  });

  it('o raio acerta o animal na frente e erra o que está de lado', () => {
    const sheep = creatures.spawn(catalog.creature('sheep'), 20.5, FLOOR_TOP, 20.5);
    const origin = { x: 17.5, y: FLOOR_TOP + 0.6, z: 20.5 };

    expect(creatures.castRay(origin, { x: 1, y: 0, z: 0 }, 5)?.creature).toBe(sheep);
    expect(creatures.castRay(origin, { x: 0, y: 0, z: 1 }, 5)).toBeNull();
    expect(creatures.castRay(origin, { x: 1, y: 0, z: 0 }, 2)).toBeNull();
  });
});
