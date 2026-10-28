import type { PhysicsTerrain } from '../block-properties';
import { PhysicsBody } from './physics-body';
import { type ProjectileLaunch, Projectiles } from './projectiles';

const OPEN_AIR: PhysicsTerrain = { collisionHeight: () => 0, isLiquid: () => false };
const WALL_AT_X5: PhysicsTerrain = { collisionHeight: (x) => (x === 5 ? 1 : 0), isLiquid: () => false };

const launchEast = (owner: ProjectileLaunch['owner']): ProjectileLaunch => ({
  owner,
  damage: 2,
  x: 0,
  y: 1,
  z: 0.5,
  directionX: 1,
  directionY: 0.05,
  directionZ: 0,
  speed: 16,
});

describe('Flechas do PedroCraft', () => {
  let projectiles: Projectiles;
  let hero: PhysicsBody;

  beforeEach(() => {
    projectiles = new Projectiles();
    hero = new PhysicsBody(8, 0, 0.5, 0.3, 1.7);
  });

  const runUntilDone = (terrain: PhysicsTerrain): number => {
    let hits = 0;

    for (let step = 0; step < 300 && projectiles.list.length > 0; step += 1) {
      hits += projectiles.step(terrain, hero, []).length;
    }

    return hits;
  };

  it('a flecha do inimigo acerta o herói e some', () => {
    projectiles.launch(launchEast('creature'));

    expect(runUntilDone(OPEN_AIR)).toBe(1);
    expect(projectiles.list.length).toBe(0);
  });

  it('a flecha do herói não acerta o próprio herói', () => {
    projectiles.launch(launchEast('hero'));

    expect(runUntilDone(OPEN_AIR)).toBe(0);
  });

  it('a parede segura a flecha', () => {
    projectiles.launch(launchEast('creature'));

    expect(runUntilDone(WALL_AT_X5)).toBe(0);
    expect(projectiles.list.length).toBe(0);
  });
});
