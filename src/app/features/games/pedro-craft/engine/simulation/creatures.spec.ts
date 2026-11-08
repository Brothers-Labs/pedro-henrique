import { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import type { CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import type { SpawnPeriod } from '../../models/content.model';
import { BlockProperties, physicsTerrain, type PhysicsTerrain } from '../block-properties';
import { type Creature, Creatures } from './creatures';
import { PhysicsBody } from './physics-body';
import type { ProjectileLaunch } from './projectiles';

const SIZE = 80;
const FLOOR_TOP = 3;
const HERO = { x: SIZE / 2, z: SIZE / 2 } as const;

describe('Bichos do PedroCraft', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let terrain: PhysicsTerrain;
  let creatures: Creatures;
  let hero: PhysicsBody;
  let period: SpawnPeriod;
  let allowsHostiles: boolean;
  let laid: string[];
  let strikes: Creature[];
  let shots: ProjectileLaunch[];
  let vanished: Creature[];
  let born: Creature[];
  let fusesLit: Creature[];
  let exploded: Creature[];

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
    hero = new PhysicsBody(HERO.x, FLOOR_TOP, HERO.z, 0.3, 1.7);
    period = 'day';
    allowsHostiles = true;
    laid = [];
    strikes = [];
    shots = [];
    vanished = [];
    born = [];
    fusesLit = [];
    exploded = [];
    creatures = new Creatures(world, catalog, properties, new SeededRandom(7), {
      hero: () => hero,
      period: () => period,
      allowsHostiles: () => allowsHostiles,
      laid: (_creature, item) => laid.push(item),
      strike: (creature) => strikes.push(creature),
      shoot: (launch) => shots.push(launch),
      vanished: (creature) => vanished.push(creature),
      born: (baby) => born.push(baby),
      difficulty: () => ({ speed: 1, attackCooldown: 1 }),
      fuseLit: (creature) => fusesLit.push(creature),
      exploded: (creature) => exploded.push(creature),
    });
  });

  const run = (steps: number): void => {
    for (let step = 0; step < steps; step += 1) {
      creatures.step(terrain);
    }
  };

  it('de dia faz nascer só animais passivos, longe do herói e até o teto do mundo', () => {
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
  describe('filhotes', () => {
    it('duas ovelhas alimentadas perto uma da outra têm um filhote, que cresce', () => {
      const first = creatures.spawn(catalog.creature('sheep'), 20.5, FLOOR_TOP, 20.5);
      const second = creatures.spawn(catalog.creature('sheep'), 22.5, FLOOR_TOP, 20.5);

      expect(creatures.feed(first)).toBeTrue();
      expect(born).toEqual([]);
      expect(creatures.feed(second)).toBeTrue();
      expect(born.length).toBe(1);

      const baby = born[0];

      expect(baby.isBaby).toBeTrue();
      expect(baby.definition.id).toBe('sheep');
      expect(first.canBreed).toBeFalse();

      baby.tickCooldowns(catalog.creature('sheep').babyGrowMs);

      expect(baby.isBaby).toBeFalse();
    });

    it('longe demais, não há filhote', () => {
      const first = creatures.spawn(catalog.creature('cow'), 10.5, FLOOR_TOP, 10.5);
      const second = creatures.spawn(catalog.creature('cow'), 40.5, FLOOR_TOP, 40.5);

      creatures.feed(first);
      creatures.feed(second);

      expect(born).toEqual([]);
    });

    it('filhote e animal descansando não aceitam comida', () => {
      const first = creatures.spawn(catalog.creature('chicken'), 20.5, FLOOR_TOP, 20.5);
      const second = creatures.spawn(catalog.creature('chicken'), 21.5, FLOOR_TOP, 20.5);

      creatures.feed(first);
      creatures.feed(second);

      expect(creatures.feed(first)).toBeFalse();
      expect(creatures.feed(born[0])).toBeFalse();
    });
  });

  describe('inimigos', () => {
    const fillTorches = (spacing: number): void => {
      for (let z = 0; z < SIZE; z += spacing) {
        for (let x = 0; x < SIZE; x += spacing) {
          world.fill(x, FLOOR_TOP, z, catalog.blockNumber('torch'));
        }
      }
    };

    it('à noite faz nascer inimigos até o teto deles', () => {
      period = 'night';
      run(60 * 120);

      const hostiles = creatures.list.filter((creature) => creature.isHostile);

      expect(hostiles.length).toBeGreaterThan(0);
      expect(hostiles.length).toBeLessThanOrEqual(catalog.world.creatures.hostileCap);
    });

    it('no Modo Paz, nenhum inimigo nasce nem de noite', () => {
      period = 'night';
      allowsHostiles = false;
      run(60 * 120);

      expect(creatures.list.some((creature) => creature.isHostile)).toBeFalse();
    });

    it('não nasce inimigo perto de tocha', () => {
      period = 'night';
      fillTorches(10);
      run(60 * 120);

      expect(creatures.list.some((creature) => creature.isHostile)).toBeFalse();
    });

    it('ao amanhecer os inimigos vão embora numa nuvem', () => {
      const slime = creatures.spawn(catalog.creature('mud-slime'), 20.5, FLOOR_TOP, 20.5);

      period = 'night';
      run(1);
      period = 'day';
      run(1);

      expect(creatures.list).not.toContain(slime);
      expect(vanished).toEqual([slime]);
    });

    it('o espantalho vai atrás do herói e golpeia quando encosta', () => {
      period = 'night';
      const zombie = creatures.spawn(catalog.creature('scarecrow-zombie'), HERO.x + 6.5, FLOOR_TOP, HERO.z);
      const startDistance = Math.abs(zombie.body.x - hero.x);

      run(60 * 8);

      expect(zombie.mood).toBe('chase');
      expect(Math.abs(zombie.body.x - hero.x)).toBeLessThan(startDistance);
      expect(strikes).toContain(zombie);
    });

    it('o slime avança aos pulos', () => {
      period = 'night';
      const slime = creatures.spawn(catalog.creature('mud-slime'), HERO.x + 8.5, FLOOR_TOP, HERO.z);
      let highest = FLOOR_TOP;

      for (let step = 0; step < 60 * 3; step += 1) {
        creatures.step(terrain);
        highest = Math.max(highest, slime.body.y);
      }

      expect(highest).toBeGreaterThan(FLOOR_TOP + 0.5);
      expect(slime.body.x).toBeLessThan(HERO.x + 8.5);
    });

    it('o esqueleto atira no herói que ele enxerga', () => {
      period = 'night';
      creatures.spawn(catalog.creature('skeleton-archer'), HERO.x + 8.5, FLOOR_TOP, HERO.z);
      run(60);

      expect(shots.length).toBe(1);
      expect(shots[0].owner).toBe('creature');
      expect(shots[0].directionX).toBeLessThan(0);
    });

    it('o esqueleto não atira através da parede', () => {
      period = 'night';

      for (let z = 0; z < SIZE; z += 1) {
        for (let y = FLOOR_TOP; y < FLOOR_TOP + 4; y += 1) {
          world.fill(HERO.x + 3, y, z, catalog.blockNumber('stone'));
        }
      }

      creatures.spawn(catalog.creature('skeleton-archer'), HERO.x + 8.5, FLOOR_TOP, HERO.z);
      run(60);

      expect(shots.length).toBe(0);
    });

    it('a lua cheia chama o Rei Slime para longe das tochas', () => {
      const king = creatures.summon(catalog.creature('king-slime'));

      expect(king?.definition.id).toBe('king-slime');
      expect(Math.hypot((king?.body.x ?? 0) - HERO.x, (king?.body.z ?? 0) - HERO.z)).toBeGreaterThanOrEqual(
        catalog.world.creatures.minSpawnDistance - 1,
      );
    });

    it('o creeper vai atrás do herói, chia perto dele e estoura em vez de golpear', () => {
      period = 'night';
      const creeper = creatures.spawn(catalog.creature('creeper'), HERO.x + 6.5, FLOOR_TOP, HERO.z);

      run(60 * 6);

      expect(fusesLit).toEqual([creeper]);
      expect(exploded).toEqual([creeper]);
      expect(strikes).not.toContain(creeper);
      expect(creatures.list).not.toContain(creeper);
    });

    it('chiando, o creeper para de andar e incha até estourar', () => {
      period = 'night';
      const creeper = creatures.spawn(catalog.creature('creeper'), HERO.x + 2, FLOOR_TOP, HERO.z);

      run(30);

      const x = creeper.body.x;

      run(10);

      expect(creeper.fuseLeftMs).not.toBeNull();
      expect(creeper.fuseProgress).toBeGreaterThan(0);
      expect(creeper.body.x).toBeCloseTo(x, 1);
    });

    it('o pavio do creeper apaga quando o herói foge para longe', () => {
      period = 'night';
      const creeper = creatures.spawn(catalog.creature('creeper'), HERO.x + 2, FLOOR_TOP, HERO.z);

      run(10);

      expect(creeper.fuseLeftMs).not.toBeNull();

      hero.x -= 8;
      run(1);

      expect(creeper.fuseLeftMs).toBeNull();
      expect(creeper.fuseProgress).toBe(0);
      expect(exploded).toEqual([]);
    });

    it('golpeado, o inimigo não foge: fica bravo e vem atrás', () => {
      const spider = creatures.spawn(catalog.creature('button-spider'), 20.5, FLOOR_TOP, 20.5);

      expect(creatures.hit(spider, 1, 3, 18.5, 20.5)).toBeFalse();
      expect(spider.mood).toBe('chase');
    });
  });
});
