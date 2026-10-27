import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { type CraftInputSnapshot, IDLE_CRAFT_INPUT } from '../input/craft-input';
import { CraftSimulation } from './craft-simulation';
import { FURNACE_FUEL, FURNACE_INPUT, FURNACE_OUTPUT } from './furnace';
import type { SimulationEvent } from './simulation-events';

const FACING_EAST = -Math.PI / 2;
const FLOOR_TOP = 3;
const TARGET = { x: 7, y: 4, z: 5 } as const;

describe('Telas do PedroCraft: mesa, baú e fornalha', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let simulation: CraftSimulation;
  let events: SimulationEvent[];

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

    simulation = new CraftSimulation({
      catalog,
      world,
      spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: FACING_EAST },
      autoJump: false,
      randomSeed: 1,
      inventory: [],
    });
    events = [];
  });

  const run = (steps: number, input: Partial<CraftInputSnapshot> = {}): void => {
    for (let step = 0; step < steps; step += 1) {
      simulation.step({ ...IDLE_CRAFT_INPUT, ...input });
      events.push(...simulation.drainEvents());
    }
  };

  const useBlock = (id: string): void => {
    world.fill(TARGET.x, TARGET.y, TARGET.z, catalog.blockNumber(id));
    run(1, { secondaryPressed: true });
  };

  it('abre a mesa de trabalho ao usar o bloco, e avisa a tela', () => {
    useBlock('workbench');

    expect(simulation.screens.screen?.kind).toBe('workbench');
    expect(events).toContain({ type: 'open-screen', screen: 'workbench' });
  });

  it('para o mundo enquanto uma tela está aberta', () => {
    useBlock('workbench');

    const before = { ...simulation.hero.body };

    run(30, { forward: 1 });

    expect(simulation.hero.body.x).toBe(before.x);
  });

  it('fabrica pela grade, gasta uma unidade de cada casa e conta a missão de pegar', () => {
    simulation.inventory.add('oak-log', 2);
    simulation.openScreen('inventory', { announce: false });
    simulation.clickSlot({ area: 'inventory', index: 0 }, 'all');
    simulation.clickSlot({ area: 'grid', index: 3 }, 'all');

    expect(simulation.screens.gridRecipe()?.id).toBe('oak-planks');

    simulation.takeGridResult();

    expect(simulation.inventory.count('oak-planks')).toBe(4);
    expect(simulation.screens.screen?.kind === 'inventory' && simulation.screens.screen.grid[3]?.count).toBe(1);
  });

  it('fabrica pelo livro de receitas num toque', () => {
    simulation.inventory.add('oak-planks', 4);
    simulation.openScreen('inventory', { announce: false });
    simulation.craftRecipe('workbench');

    expect(simulation.inventory.count('workbench')).toBe(1);
    expect(simulation.inventory.count('oak-planks')).toBe(0);
    expect(simulation.drainEvents()).toContain({ type: 'sound', cue: 'powerup' });
  });

  it('não fabrica receita de mesa pela mochila', () => {
    simulation.inventory.add('oak-planks', 3);
    simulation.inventory.add('stick', 2);
    simulation.openScreen('inventory', { announce: false });
    simulation.craftRecipe('wooden-pickaxe');

    expect(simulation.inventory.count('wooden-pickaxe')).toBe(0);
    expect(simulation.inventory.count('oak-planks')).toBe(3);
  });

  it('devolve a grade e a mão à mochila ao fechar, sem contar como pegar', () => {
    simulation.inventory.add('oak-log', 3);
    simulation.openScreen('workbench', { announce: false });
    simulation.clickSlot({ area: 'inventory', index: 0 }, 'one');
    simulation.clickSlot({ area: 'grid', index: 0 }, 'one');
    simulation.closeScreen();

    expect(simulation.inventory.count('oak-log')).toBe(3);
    expect(simulation.inventory.cursor).toBeNull();
    expect(simulation.goals.progress.amount).toBe(0);
  });

  it('guarda o que foi posto no baú entre uma abertura e outra', () => {
    simulation.inventory.add('apple', 5);
    useBlock('chest');
    simulation.clickSlot({ area: 'inventory', index: 0 }, 'all');
    simulation.clickSlot({ area: 'container', index: 4 }, 'all');
    simulation.closeScreen();
    run(1, { secondaryPressed: true });

    expect(simulation.screens.screen?.kind === 'chest' && simulation.screens.screen.slots[4]?.count).toBe(5);
    expect(simulation.inventory.count('apple')).toBe(0);
  });

  it('solta o que estava no baú quando ele é quebrado', () => {
    simulation.inventory.add('apple', 5);
    useBlock('chest');
    simulation.clickSlot({ area: 'inventory', index: 0 }, 'all');
    simulation.clickSlot({ area: 'container', index: 0 }, 'all');
    simulation.closeScreen();
    run(400, { primaryHeld: true });

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(AIR);
    expect(simulation.inventory.count('apple')).toBe(5);
    expect(simulation.inventory.count('chest')).toBe(1);
  });

  it('assa na fornalha enquanto o mundo anda e entrega o pronto na mochila', () => {
    useBlock('furnace');

    const screen = simulation.screens.screen;

    if (screen?.kind !== 'furnace') {
      throw new Error('A fornalha deveria estar aberta.');
    }

    screen.furnace.slots[FURNACE_INPUT] = { item: 'sand', count: 1, durability: null };
    screen.furnace.slots[FURNACE_FUEL] = { item: 'coal', count: 1, durability: null };
    simulation.tickFurnaces(catalog.smeltingFor('sand')?.timeMs ?? 0);
    simulation.clickSlot({ area: 'container', index: FURNACE_OUTPUT }, 'all');

    expect(simulation.inventory.count('glass')).toBe(1);
    expect(screen.furnace.slots[FURNACE_OUTPUT]).toBeNull();
  });

  it('não deixa pôr nada na saída da fornalha com a mão', () => {
    simulation.inventory.add('dirt', 1);
    useBlock('furnace');
    simulation.clickSlot({ area: 'inventory', index: 0 }, 'all');
    simulation.clickSlot({ area: 'container', index: FURNACE_OUTPUT }, 'all');

    expect(simulation.inventory.cursor?.item).toBe('dirt');
  });
});
