import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { type CraftInputSnapshot, IDLE_CRAFT_INPUT } from '../input/craft-input';
import { CraftSimulation } from './craft-simulation';
import type { SimulationEvent } from './simulation-events';

/** Olhando para +x, na altura dos olhos: a mira cai no bloco (7, 4, 5). */
const FACING_EAST = -Math.PI / 2;
const FLOOR_TOP = 3;
const TARGET = { x: 7, y: 4, z: 5 } as const;

describe('Simulação do PedroCraft: colher e construir', () => {
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
          world.fill(x, y, z, catalog.blockNumber(y === FLOOR_TOP - 1 ? 'grass' : 'stone'));
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

  const put = (id: string, x: number = TARGET.x, y: number = TARGET.y, z: number = TARGET.z): void =>
    world.fill(x, y, z, catalog.blockNumber(id));

  const run = (steps: number, input: Partial<CraftInputSnapshot> = {}): void => {
    for (let step = 0; step < steps; step += 1) {
      simulation.step({ ...IDLE_CRAFT_INPUT, ...input });
      events.push(...simulation.drainEvents());
    }
  };

  const hold = (id: string, durability: number | null = null): void => {
    simulation.inventory.slots[0] = { item: id, count: 1, durability: durability ?? catalog.item(id).durability };
  };

  it('mira o bloco à frente', () => {
    put('oak-log');
    run(1);

    expect(simulation.target).toEqual(jasmine.objectContaining(TARGET));
  });

  it('quebra o tronco segurando o botão, e o tronco voa para a mochila', () => {
    put('oak-log');
    run(200, { primaryHeld: true });

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(AIR);
    expect(simulation.inventory.count('oak-log')).toBe(1);
    expect(events).toContain({ type: 'pickup', item: 'oak-log', count: 1 });
  });

  it('não quebra se o botão for solto antes do tempo', () => {
    put('oak-log');
    run(30, { primaryHeld: true });
    run(1);

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('oak-log'));
    expect(simulation.mining).toBeNull();
  });

  it('avança a missão de pegar troncos', () => {
    put('oak-log');
    run(200, { primaryHeld: true });

    expect(simulation.goals.progress).toEqual({ index: 0, amount: 1 });
  });

  it('quebra a pedra sem picareta, mas não dá item e explica o porquê', () => {
    put('stone');
    run(400, { primaryHeld: true });

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(AIR);
    expect(simulation.drops.list.length).toBe(0);
    expect(simulation.inventory.count('cobblestone')).toBe(0);
    expect(events.filter((event) => event.type === 'hint').length).toBe(1);
  });

  it('dá pedregulho com picareta e gasta um uso dela', () => {
    put('stone');
    hold('wooden-pickaxe');
    run(200, { primaryHeld: true });

    expect(simulation.inventory.count('cobblestone')).toBe(1);
    expect(simulation.inventory.slots[0]?.durability).toBe(59);
  });

  it('avisa quando a ferramenta quebra', () => {
    put('dirt');
    hold('wooden-shovel', 1);
    run(200, { primaryHeld: true });

    expect(simulation.inventory.slots[0]?.item).not.toBe('wooden-shovel');
    expect(events).toContain({ type: 'tool-broke', item: 'wooden-shovel' });
  });

  it('coloca o bloco da mão na face mirada e gasta um da pilha', () => {
    put('stone');
    simulation.inventory.slots[0] = { item: 'oak-planks', count: 5, durability: null };
    run(1, { secondaryPressed: true });

    expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('oak-planks'));
    expect(simulation.inventory.slots[0]?.count).toBe(4);
  });

  it('não coloca bloco dentro do próprio herói', () => {
    put('stone', 6, 2, 5);
    world.fill(6, 3, 5, AIR);
    simulation.hero.look(0, -Math.PI / 2);
    simulation.inventory.slots[0] = { item: 'oak-planks', count: 5, durability: null };
    simulation.hero.teleport(6.5, FLOOR_TOP, 5.5);
    run(1, { secondaryPressed: true });

    expect(simulation.inventory.slots[0]?.count).toBe(5);
  });

  it('coloca o bloco no lugar do capim, que é substituível', () => {
    put('tall-grass');
    simulation.inventory.slots[0] = { item: 'oak-planks', count: 1, durability: null };
    run(1, { secondaryPressed: true });

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('oak-planks'));
  });

  it('abre e fecha as duas metades da porta', () => {
    put('door', TARGET.x, 3);
    put('door', TARGET.x, 4);
    run(1, { secondaryPressed: true });

    expect(world.get(TARGET.x, 3, TARGET.z)).toBe(catalog.blockNumber('door-open'));
    expect(world.get(TARGET.x, 4, TARGET.z)).toBe(catalog.blockNumber('door-open'));
  });

  it('derruba a tocha quando o chão dela é quebrado', () => {
    world.fill(TARGET.x, 3, TARGET.z, catalog.blockNumber('dirt'));
    put('torch', TARGET.x, 4);
    simulation.hero.look(0, -0.5);
    run(1);

    expect(simulation.target).toEqual(jasmine.objectContaining({ x: TARGET.x, y: 3 }));

    run(200, { primaryHeld: true });

    expect(world.get(TARGET.x, 4, TARGET.z)).toBe(AIR);
    expect(simulation.inventory.count('torch')).toBe(1);
  });

  it('pede a mochila pela tecla e muda o item escolhido pelo número', () => {
    run(1, { inventoryPressed: true, hotbarSlot: 4 });

    expect(events).toContain({ type: 'open-screen', screen: 'inventory' });
    expect(simulation.selectedSlot).toBe(4);
  });

  it('dá a mochila inicial do mundo a quem começa sem inventário guardado', () => {
    const fresh = new CraftSimulation({
      catalog,
      world,
      spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: 0 },
      autoJump: false,
      randomSeed: 1,
    });

    for (const entry of catalog.world.hero.startingInventory) {
      expect(fresh.inventory.count(entry.item)).toBe(entry.count);
    }
  });
});
