import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { PORTAL_TRAVEL_MS, type PortalTrip, Portals } from './portals';
import type { RayHit } from './raycast';

interface Opening {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly axis: 'x' | 'z';
  readonly width: number;
  readonly height: number;
}

const STEP_MS = 50;

describe('Portais do PedroCraft', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let portals: Portals;
  let obsidian: number;
  let portal: number;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
    obsidian = catalog.blockNumber('obsidian');
    portal = catalog.blockNumber('nether-portal');
  });

  beforeEach(() => {
    world = new VoxelWorld(32, 32, 24);
    portals = new Portals(world, catalog);
  });

  /** A célula `along` blocos para o lado e `up` para cima do canto de baixo do vão. */
  const cellOf = (opening: Opening, along: number, up: number): readonly [number, number, number] =>
    opening.axis === 'x' ? [opening.x + along, opening.y + up, opening.z] : [opening.x, opening.y + up, opening.z + along];

  /** Monta a moldura de obsidiana em volta do vão; `withCorners` fecha os quatro cantos também. */
  const buildFrame = (opening: Opening, withCorners = false): void => {
    const put = (along: number, up: number): void => {
      const [x, y, z] = cellOf(opening, along, up);

      world.set(x, y, z, obsidian);
    };

    for (let along = 0; along < opening.width; along += 1) {
      put(along, -1);
      put(along, opening.height);
    }

    for (let up = 0; up < opening.height; up += 1) {
      put(-1, up);
      put(opening.width, up);
    }

    if (withCorners) {
      [[-1, -1], [opening.width, -1], [-1, opening.height], [opening.width, opening.height]].forEach(([along, up]) => put(along, up));
    }
  };

  /** A mira na obsidiana de baixo, pela face de cima: o jeito de acender por dentro da moldura. */
  const aimAtBottom = (opening: Opening): RayHit => {
    const [x, y, z] = cellOf(opening, 0, -1);

    return { x, y, z, normalX: 0, normalY: 1, normalZ: 0, distance: 2 };
  };

  const portalCells = (opening: Opening): number => {
    let count = 0;

    for (let along = 0; along < opening.width; along += 1) {
      for (let up = 0; up < opening.height; up += 1) {
        const [x, y, z] = cellOf(opening, along, up);

        count += world.get(x, y, z) === portal ? 1 : 0;
      }
    }

    return count;
  };

  /** Fica parado em (`x`, `y`, `z`) por até `ms`, ou até a primeira viagem. */
  const stand = (x: number, y: number, z: number, ms: number): PortalTrip | null => {
    let trip: PortalTrip | null = null;

    for (let elapsed = 0; elapsed < ms && !trip; elapsed += STEP_MS) {
      trip = portals.step(x, y, z, STEP_MS);
    }

    return trip;
  };

  const SMALL: Opening = { x: 5, y: 3, z: 5, axis: 'x', width: 2, height: 3 };

  describe('acender', () => {
    it('o isqueiro enche de portal o vão de 2 × 3 de uma moldura sem cantos', () => {
      buildFrame(SMALL);

      const lighting = portals.light(aimAtBottom(SMALL), 'flint-and-steel');

      expect(lighting?.type).toBe('lit');
      expect(portalCells(SMALL)).toBe(6);
    });

    it('acende a moldura virada para o outro lado, e uma maior, com cantos', () => {
      const wide: Opening = { x: 10, y: 3, z: 10, axis: 'z', width: 4, height: 5 };

      buildFrame(wide, true);
      portals.light(aimAtBottom(wide), 'flint-and-steel');

      expect(portalCells(wide)).toBe(20);
    });

    it('a tocha não acende o portal: o botão segue para o resto do jogo', () => {
      buildFrame(SMALL);

      expect(portals.light(aimAtBottom(SMALL), 'torch')).toBeNull();
      expect(portalCells(SMALL)).toBe(0);
    });

    it('o isqueiro em outro bloco não é com o portal', () => {
      world.set(5, 2, 5, catalog.blockNumber('stone'));

      expect(portals.light({ x: 5, y: 2, z: 5, normalX: 0, normalY: 1, normalZ: 0, distance: 2 }, 'flint-and-steel')).toBeNull();
    });

    it('não acende vão baixo demais', () => {
      const low: Opening = { ...SMALL, height: 2 };

      buildFrame(low);

      expect(portals.light(aimAtBottom(low), 'flint-and-steel')).toEqual({ type: 'no-frame' });
      expect(portalCells(low)).toBe(0);
    });

    it('não acende vão com um bloco dentro', () => {
      buildFrame(SMALL);
      world.set(6, 5, 5, catalog.blockNumber('dirt'));

      expect(portals.light(aimAtBottom(SMALL), 'flint-and-steel')).toEqual({ type: 'no-frame' });
    });

    it('não acende moldura aberta de um lado', () => {
      buildFrame(SMALL);
      world.set(7, 4, 5, AIR);

      expect(portals.light(aimAtBottom(SMALL), 'flint-and-steel')).toEqual({ type: 'no-frame' });
    });

    it('não acende vão maior que o máximo', () => {
      const huge: Opening = { ...SMALL, x: 2, width: 12, height: 3 };

      buildFrame(huge);

      expect(portals.light(aimAtBottom(huge), 'flint-and-steel')).toEqual({ type: 'no-frame' });
    });
  });

  describe('apagar', () => {
    beforeEach(() => {
      buildFrame(SMALL);
      portals.light(aimAtBottom(SMALL), 'flint-and-steel');
    });

    it('quebrar um pedaço da moldura apaga o portal inteiro', () => {
      world.set(4, 4, 5, AIR);

      expect(portalCells(SMALL)).toBe(0);
    });

    it('quebrar um bloco do portal apaga o resto junto', () => {
      world.set(5, 3, 5, AIR);

      expect(portalCells(SMALL)).toBe(0);
    });

    it('quebrar obsidiana longe do portal não apaga nada', () => {
      world.set(20, 3, 20, obsidian);
      world.set(20, 3, 20, AIR);

      expect(portalCells(SMALL)).toBe(6);
    });
  });

  describe('viajar', () => {
    const FAR: Opening = { x: 20, y: 3, z: 20, axis: 'z', width: 3, height: 3 };

    beforeEach(() => {
      buildFrame(SMALL);
      portals.light(aimAtBottom(SMALL), 'flint-and-steel');
    });

    it('sozinho, o portal avisa que falta o outro', () => {
      expect(stand(5.5, 3, 5.5, PORTAL_TRAVEL_MS)).toEqual({ type: 'alone' });
    });

    it('parado um instante no portal, o herói chega no meio da linha de baixo do outro', () => {
      buildFrame(FAR);
      portals.light(aimAtBottom(FAR), 'flint-and-steel');

      expect(stand(5.5, 3, 5.5, PORTAL_TRAVEL_MS - STEP_MS)).toBeNull();
      expect(portals.step(5.5, 3, 5.5, STEP_MS)).toEqual({ type: 'travel', x: 20.5, y: 3, z: 21.5 });
    });

    it('quem acabou de chegar só viaja de novo depois de sair do portal', () => {
      buildFrame(FAR);
      portals.light(aimAtBottom(FAR), 'flint-and-steel');
      stand(5.5, 3, 5.5, PORTAL_TRAVEL_MS);

      expect(stand(20.5, 3, 21.5, PORTAL_TRAVEL_MS * 2)).toBeNull();

      portals.step(15.5, 3, 15.5, STEP_MS);

      expect(stand(20.5, 3, 21.5, PORTAL_TRAVEL_MS)?.type).toBe('travel');
    });

    it('fora do portal, nada acontece', () => {
      expect(stand(12.5, 3, 12.5, PORTAL_TRAVEL_MS * 2)).toBeNull();
    });
  });
});
