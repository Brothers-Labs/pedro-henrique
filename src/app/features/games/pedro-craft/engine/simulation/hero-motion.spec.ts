import type { CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties, type PhysicsTerrain, physicsTerrain } from '../block-properties';
import { type CraftInputSnapshot, IDLE_CRAFT_INPUT } from '../input/craft-input';
import { HeroMotion } from './hero-motion';

/** Olhando para +x: a frente do herói aponta para a parede dos testes. */
const FACING_EAST = -Math.PI / 2;

const FLOOR_TOP = 3;

describe('Movimento do herói do PedroCraft', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let terrain: PhysicsTerrain;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    world = new VoxelWorld(16, 16, 16);

    for (let y = 0; y < FLOOR_TOP; y += 1) {
      for (let z = 0; z < 16; z += 1) {
        for (let x = 0; x < 16; x += 1) {
          world.fill(x, y, z, catalog.blockNumber('stone'));
        }
      }
    }

    terrain = physicsTerrain(world, new BlockProperties(catalog));
  });

  const run = (hero: HeroMotion, steps: number, input: Partial<CraftInputSnapshot> = {}, autoJump = false): void => {
    for (let step = 0; step < steps; step += 1) {
      hero.step(terrain, { ...IDLE_CRAFT_INPUT, ...input }, autoJump);
    }
  };

  /** Parede de `fromX` até `toX`, inclusive; com mais de uma coluna, vira um patamar. */
  const wall = (fromX: number, height: number, block = 'stone', toX = fromX): void => {
    for (let x = fromX; x <= toX; x += 1) {
      for (let z = 0; z < 16; z += 1) {
        for (let y = FLOOR_TOP; y < FLOOR_TOP + height; y += 1) {
          world.fill(x, y, z, catalog.blockNumber(block));
        }
      }
    }
  };

  it('cai e para em cima do chão', () => {
    const hero = new HeroMotion(5.5, 10, 5.5, 0);

    run(hero, 120);

    expect(hero.body.y).toBeCloseTo(FLOOR_TOP, 2);
    expect(hero.body.isOnGround).toBeTrue();
  });

  it('não atravessa parede', () => {
    wall(9, 3);
    const hero = new HeroMotion(5.5, FLOOR_TOP, 5.5, FACING_EAST);

    run(hero, 180, { forward: 1 });

    expect(hero.body.x).toBeLessThanOrEqual(9 - hero.body.halfWidth);
    expect(hero.body.x).toBeGreaterThan(8.5);
  });

  it('pula mais de um bloco e menos de dois', () => {
    const hero = new HeroMotion(5.5, FLOOR_TOP, 5.5, 0);
    let highest = hero.body.y;

    run(hero, 1);

    for (let step = 0; step < 60; step += 1) {
      hero.step(terrain, { ...IDLE_CRAFT_INPUT, jumpHeld: step === 0 }, false);
      highest = Math.max(highest, hero.body.y);
    }

    expect(highest - FLOOR_TOP).toBeGreaterThan(1.05);
    expect(highest - FLOOR_TOP).toBeLessThan(2);
  });

  it('sobe sozinho um degrau de um bloco com o pulo automático', () => {
    wall(9, 1, 'stone', 15);
    const hero = new HeroMotion(5.5, FLOOR_TOP, 5.5, FACING_EAST);

    run(hero, 180, { forward: 1 }, true);

    expect(hero.body.x).toBeGreaterThan(9.5);
    expect(hero.body.y).toBeCloseTo(FLOOR_TOP + 1, 2);
  });

  it('pisa no meio bloco de diamante na metade da altura', () => {
    wall(5, 1, 'diamond-half', 6);
    const hero = new HeroMotion(5.5, 10, 5.5, 0);

    run(hero, 120);

    expect(hero.body.y).toBeCloseTo(FLOOR_TOP + 0.5, 2);
    expect(hero.body.isOnGround).toBeTrue();
  });

  it('não sobe parede de dois blocos, nem com o pulo automático', () => {
    wall(9, 2);
    const hero = new HeroMotion(5.5, FLOOR_TOP, 5.5, FACING_EAST);

    run(hero, 180, { forward: 1 }, true);

    expect(hero.body.x).toBeLessThan(9);
  });

  it('não pula a cerca, que é mais alta que um bloco', () => {
    wall(9, 1, 'fence');
    const hero = new HeroMotion(5.5, FLOOR_TOP, 5.5, FACING_EAST);

    run(hero, 180, { forward: 1, jumpHeld: true }, true);

    expect(hero.body.x).toBeLessThan(9);
  });

  it('nada para cima segurando o pulo dentro da água', () => {
    for (let y = FLOOR_TOP; y < 12; y += 1) {
      for (let z = 0; z < 16; z += 1) {
        for (let x = 0; x < 16; x += 1) {
          world.fill(x, y, z, catalog.blockNumber('water'));
        }
      }
    }

    const hero = new HeroMotion(5.5, 5, 5.5, 0);

    run(hero, 60, { jumpHeld: true });

    expect(hero.body.isInWater).toBeTrue();
    expect(hero.body.y).toBeGreaterThan(7);
  });

  it('afunda devagar na água, sem despencar', () => {
    for (let y = FLOOR_TOP; y < 12; y += 1) {
      world.fill(5, y, 5, catalog.blockNumber('water'));
    }

    const hero = new HeroMotion(5.5, 10, 5.5, 0);

    run(hero, 12);
    run(hero, 1);

    expect(hero.body.velocityY).toBeGreaterThanOrEqual(-3.01);
  });

  it('anda na direção do olhar', () => {
    const hero = new HeroMotion(8, FLOOR_TOP, 8, 0);

    run(hero, 30, { forward: 1 });

    expect(hero.body.z).toBeLessThan(7.5);
    expect(hero.body.x).toBeCloseTo(8, 3);
  });

  it('não sai do mundo pelas laterais', () => {
    const hero = new HeroMotion(1, FLOOR_TOP, 8, Math.PI / 2);

    run(hero, 120, { forward: 1 });

    expect(hero.body.x).toBeGreaterThanOrEqual(hero.body.halfWidth);
  });
});
