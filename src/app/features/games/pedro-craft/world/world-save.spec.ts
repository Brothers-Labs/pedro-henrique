import type { CraftCatalog } from '../content/craft-catalog';
import { ContentError } from '../content/json-reader';
import { captureWorld, restoreWorld } from '../engine/world-snapshot';
import { CraftSimulation } from '../engine/simulation/craft-simulation';
import { completedGoalIds, progressFromCompleted } from '../engine/simulation/goal-tracker';
import type { WorldIdentity, WorldState } from '../models/world-save.model';
import { loadTestCatalog } from '../testing/craft-test-content';
import { VoxelWorld } from './voxel-world';
import { cleanWorldSave, normalizeWorldName, parseWorldSave } from './world-save';

const SIZE = 32;
const FLOOR_TOP = 3;
const IDENTITY: WorldIdentity = {
  id: 'mundo-teste',
  name: 'Fazenda de teste',
  seed: 42,
  mode: 'adventure',
  createdAt: '2026-10-27T10:00:00.000Z',
};
const SAVED_AT = '2026-10-27T11:00:00.000Z';

describe('Mundo salvo do PedroCraft', () => {
  let catalog: CraftCatalog;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  /** O mesmo chão sempre: faz o papel da semente, que refaz o mundo igual. */
  const buildWorld = (): VoxelWorld => {
    const world = new VoxelWorld(SIZE, SIZE, 16);

    for (let y = 0; y < FLOOR_TOP; y += 1) {
      for (let z = 0; z < SIZE; z += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          world.fill(x, y, z, catalog.blockNumber(y === FLOOR_TOP - 1 ? 'grass' : 'stone'));
        }
      }
    }

    return world;
  };

  const createSimulation = (world: VoxelWorld, state: WorldState | null = null): CraftSimulation =>
    new CraftSimulation({
      catalog,
      world,
      spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: 0 },
      autoJump: false,
      randomSeed: 1,
      inventory: state?.inventory,
      goals: state ? progressFromCompleted(catalog.goals, state.goals.completed, state.goals.amount) : undefined,
    });

  /** Salva, passa pelo texto JSON como no IndexedDB e lê de volta. */
  const roundTrip = (simulation: CraftSimulation): WorldState => {
    const save = cleanWorldSave(parseWorldSave(JSON.parse(JSON.stringify(captureWorld(simulation, IDENTITY, SAVED_AT)))), catalog);

    if (!save.state) {
      throw new Error('O save de um mundo jogado precisa ter estado.');
    }

    return save.state;
  };

  /** O estado de um mundo jogado, direto da fotografia. */
  const stateOf = (simulation: CraftSimulation): WorldState => {
    const { state } = captureWorld(simulation, IDENTITY, SAVED_AT);

    if (!state) {
      throw new Error('O save de um mundo jogado precisa ter estado.');
    }

    return state;
  };

  it('salvar e carregar devolve o mesmo mundo: blocos, mochila, posição, plantações e baús', () => {
    const world = buildWorld();
    const simulation = createSimulation(world);

    world.set(4, FLOOR_TOP, 4, catalog.blockNumber('oak-planks'));
    world.set(6, FLOOR_TOP - 1, 6, 0);
    world.set(8, FLOOR_TOP - 1, 8, catalog.blockNumber('farmland'));
    world.set(8, FLOOR_TOP, 8, catalog.blockNumber('wheat-crop'));
    simulation.farm.plant(8, FLOOR_TOP, 8, catalog.crop('wheat'));
    simulation.farm.step(catalog.crop('wheat').stageMs);
    world.set(10, FLOOR_TOP, 10, catalog.blockNumber('chest'));
    simulation.screens.containers.set(world.indexOf(10, FLOOR_TOP, 10), [{ item: 'wool', count: 7, durability: null }]);
    simulation.inventory.add('wooden-pickaxe', 1, 12);
    simulation.inventory.add('stone', 30);
    simulation.hero.teleport(12.25, FLOOR_TOP, 9.75);
    simulation.health.damage(3);
    simulation.clock.advance(12_345);
    simulation.setCalendarDay(9);
    simulation.creatures.spawn(catalog.creature('sheep'), 14.5, FLOOR_TOP, 14.5).setCooldown('shears', 20_000);

    const state = roundTrip(simulation);
    const restoredWorld = buildWorld();
    const restored = createSimulation(restoredWorld, state);

    restoreWorld(restored, state);

    expect(restoredWorld.snapshot).toEqual(world.snapshot);
    expect(restored.inventory.slots).toEqual(simulation.inventory.slots.map((slot) => slot ?? null));
    expect(restored.hero.body.x).toBe(12.25);
    expect(restored.hero.body.z).toBe(9.75);
    expect(restored.health.value).toBe(simulation.health.value);
    expect(restored.clock.time).toBe(simulation.clock.time);
    expect(restored.calendar.day).toBe(9);
    expect(restored.farm.stageAt(8, FLOOR_TOP, 8)).toBe(1);
    expect(restored.screens.containers.get(restoredWorld.indexOf(10, FLOOR_TOP, 10))?.[0]).toEqual({
      item: 'wool',
      count: 7,
      durability: null,
    });
    expect(restored.creatures.list.map((creature) => creature.definition.id)).toEqual(['sheep']);
    expect(restored.creatures.list[0].isCoolingDown).toBeTrue();
  });

  it('não guarda os inimigos nem a água corrente', () => {
    const world = buildWorld();
    const simulation = createSimulation(world);

    simulation.creatures.spawn(catalog.creature('mud-slime'), 14.5, FLOOR_TOP, 14.5);
    world.set(3, FLOOR_TOP, 3, catalog.blockNumber('flowing-water'));

    const state = stateOf(simulation);

    expect(state.creatures).toEqual([]);
    expect(state.chunks).toEqual([]);
  });

  it('recusa um save corrompido com uma mensagem que diz onde', () => {
    const save = captureWorld(createSimulation(buildWorld()), IDENTITY, SAVED_AT);

    expect(() => parseWorldSave({ ...save, state: { ...save.state, hero: 'ninguém' } })).toThrowError(ContentError, /hero/);
    expect(() => parseWorldSave('não é um mundo')).toThrowError(ContentError);
  });

  it('recusa um save de um jogo mais novo, sem tentar adivinhar', () => {
    const save = captureWorld(createSimulation(buildWorld()), IDENTITY, SAVED_AT);

    expect(() => parseWorldSave({ ...save, version: 99 })).toThrowError(ContentError, /mais novo/);
  });

  it('a limpeza tira o que o conteúdo não conhece mais e acerta as pilhas', () => {
    const simulation = createSimulation(buildWorld());
    const save = captureWorld(simulation, IDENTITY, SAVED_AT);
    const state = stateOf(simulation);
    const dirty = {
      ...state,
      inventory: [
        { item: 'item-que-sumiu', count: 1, durability: null },
        { item: 'stone', count: 500, durability: null },
      ],
      chunks: [{ x: 0, z: 0, blocks: [[1, FLOOR_TOP, 1, 'bloco-que-sumiu'], [2, FLOOR_TOP, 2, 'stone'], [999, 0, 0, 'stone']] }],
      creatures: [{ creature: 'dragao', x: 1, y: FLOOR_TOP, z: 1, yaw: 0, health: 3, layLeftMs: null, cooldowns: [] }],
    } satisfies WorldState;
    const cleaned = cleanWorldSave({ ...save, state: dirty }, catalog).state;

    expect(cleaned?.inventory[0]).toBeNull();
    expect(cleaned?.inventory[1]).toEqual({ item: 'stone', count: catalog.item('stone').maxStack, durability: null });
    expect(cleaned?.chunks[0].blocks).toEqual([[2, FLOOR_TOP, 2, 'stone']]);
    expect(cleaned?.creatures).toEqual([]);
  });

  it('um mundo recém-criado, ainda sem estado, é lido e limpo sem problema', () => {
    const fresh = { ...IDENTITY, version: 1, updatedAt: SAVED_AT, state: null };

    expect(cleanWorldSave(parseWorldSave(fresh), catalog)).toEqual(fresh);
  });

  it('as missões vão pelo id: uma missão nova no meio da lista vira a da vez', () => {
    const goals = catalog.goals;
    const completed = completedGoalIds(goals, { index: 3, amount: 0 });

    expect(completed).toEqual(goals.slice(0, 3).map((goal) => goal.id));
    expect(progressFromCompleted(goals, completed, 2)).toEqual({ index: 3, amount: 2 });
    expect(progressFromCompleted(goals, [goals[0].id, goals[2].id], 2)).toEqual({ index: 1, amount: 0 });
  });

  it('o nome do mundo fica curto e sem espaços sobrando; vazio vira o sugerido', () => {
    expect(normalizeWorldName('  Minha   fazenda  ', 'Mundo 1')).toBe('Minha fazenda');
    expect(normalizeWorldName('   ', 'Mundo 1')).toBe('Mundo 1');
    expect(normalizeWorldName('x'.repeat(80), 'Mundo 1').length).toBeLessThanOrEqual(32);
  });
});
