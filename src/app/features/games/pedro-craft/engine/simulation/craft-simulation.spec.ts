import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { type CraftInputSnapshot, IDLE_CRAFT_INPUT } from '../input/craft-input';
import { CraftSimulation } from './craft-simulation';
import type { Creature } from './creatures';
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

  describe('água e fazenda', () => {
    const above = (): number => world.get(TARGET.x, TARGET.y + 1, TARGET.z);

    it('a enxada ara a grama e gasta um uso', () => {
      put('grass');
      hold('wooden-hoe');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('farmland'));
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('wooden-hoe').durability ?? 0) - 1);
    });

    it('a enxada não ara a grama coberta', () => {
      put('grass');
      put('stone', TARGET.x, TARGET.y + 1);
      hold('wooden-hoe');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('grass'));
    });

    it('planta a semente na terra arada e gasta uma', () => {
      put('farmland');
      simulation.inventory.slots[0] = { item: 'wheat-seeds', count: 3, durability: null };
      run(1, { secondaryPressed: true });

      expect(above()).toBe(catalog.blockNumber('wheat-crop'));
      expect(simulation.farm.plants.size).toBe(1);
      expect(simulation.inventory.slots[0]?.count).toBe(2);
    });

    it('no solo errado, não planta e conta onde a semente cresce', () => {
      put('stone');
      simulation.inventory.slots[0] = { item: 'wheat-seeds', count: 3, durability: null };
      run(1, { secondaryPressed: true });

      expect(above()).toBe(AIR);
      expect(events).toContain({ type: 'hint', text: 'Sementes de trigo: plante em terra arada.' });
    });

    it('colhe o trigo maduro e conta para a missão', () => {
      put('farmland', TARGET.x, TARGET.y - 1);
      put('wheat-crop');
      simulation.farm.plant(TARGET.x, TARGET.y, TARGET.z, catalog.crop('wheat'));
      simulation.farm.step(catalog.crop('wheat').stageMs * catalog.crop('wheat').stages);
      const record = spyOn(simulation.goals, 'record').and.callThrough();
      run(10, { primaryHeld: true });
      // A colheita pula longe do ímã de quem está parado: o herói anda até ela.
      run(90, { forward: 1 });

      expect(simulation.inventory.count('wheat')).toBe(1);
      expect(record).toHaveBeenCalledWith({ trigger: 'harvest', target: 'wheat', count: 1 });
    });

    it('o trigo verde só devolve a semente', () => {
      put('farmland', TARGET.x, TARGET.y - 1);
      put('wheat-crop');
      simulation.farm.plant(TARGET.x, TARGET.y, TARGET.z, catalog.crop('wheat'));
      run(200, { primaryHeld: true });

      expect(simulation.inventory.count('wheat')).toBe(0);
      expect(simulation.inventory.count('wheat-seeds')).toBe(1);
    });

    it('o balde vazio pega a água parada e continua na mão, cheio', () => {
      put('water');
      hold('bucket');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x, TARGET.y, TARGET.z)).not.toBe(catalog.blockNumber('water'));
      expect(simulation.inventory.slots[0]?.item).toBe('water-bucket');
    });

    it('de uma pilha de baldes, o balde cheio vai para a mochila', () => {
      put('water');
      simulation.inventory.slots[0] = { item: 'bucket', count: 2, durability: null };
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]).toEqual({ item: 'bucket', count: 1, durability: null });
      expect(simulation.inventory.count('water-bucket')).toBe(1);
    });

    it('o balde não pega água corrente e explica o porquê', () => {
      put('flowing-water');
      hold('bucket');
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.item).toBe('bucket');
      expect(events.some((event) => event.type === 'hint')).toBeTrue();
    });

    it('o balde cheio despeja uma nascente na face mirada e volta a ser balde', () => {
      put('stone');
      hold('water-bucket');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('water'));
      expect(simulation.inventory.slots[0]?.item).toBe('bucket');
    });
  });

  describe('animais', () => {
    /** Um animal parado logo à frente, com o olhar um pouco para baixo para mirar nele. */
    const placeAnimal = (id: string): Creature => {
      const creature = simulation.creatures.spawn(catalog.creature(id), TARGET.x + 0.5, FLOOR_TOP, TARGET.z + 0.5);

      creature.moodLeftMs = 60_000;
      simulation.hero.look(0, -0.3);

      return creature;
    };

    const droppedCount = (item: string): number =>
      simulation.drops.list.filter((drop) => drop.stack.item === item).reduce((sum, drop) => sum + drop.stack.count, 0);

    it('mira o animal à frente em vez do chão', () => {
      const sheep = placeAnimal('sheep');
      run(1);

      expect(simulation.targetCreature).toBe(sheep);
      expect(simulation.target).toBeNull();
    });

    it('a tesoura tosquia a ovelha: cai lã, a tesoura gasta e a lã some até crescer de novo', () => {
      const sheep = placeAnimal('sheep');
      hold('shears');
      run(1, { secondaryPressed: true });

      expect(droppedCount('wool')).toBeGreaterThanOrEqual(1);
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('shears').durability ?? 0) - 1);
      expect(sheep.isCoolingDown).toBeTrue();

      run(1, { secondaryPressed: true });

      expect(events).toContain({ type: 'hint', text: 'Ovelha: espere um pouquinho e tente de novo.' });
    });

    it('o balde vazio na vaca vira balde de leite', () => {
      placeAnimal('cow');
      hold('bucket');
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.item).toBe('milk-bucket');
    });

    it('a mão tira um pouco de vida, e o animal foge', () => {
      const sheep = placeAnimal('sheep');
      run(1, { primaryPressed: true, primaryHeld: true });

      expect(sheep.health).toBe(catalog.creature('sheep').health - 1);
      expect(sheep.mood).toBe('flee');
      expect(simulation.mining).toBeNull();
    });

    it('a espada derrota a ovelha: ela solta lã, a espada gasta e a missão conta', () => {
      const sheep = placeAnimal('sheep');
      const record = spyOn(simulation.goals, 'record').and.callThrough();
      hold('iron-sword');
      run(1, { primaryPressed: true });

      expect(simulation.creatures.list).not.toContain(sheep);
      expect(droppedCount('wool')).toBe(1);
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('iron-sword').durability ?? 0) - 1);
      expect(record).toHaveBeenCalledWith({ trigger: 'defeat', target: 'sheep', count: 1 });
    });
  });
});
