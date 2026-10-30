import type { CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { cleanWorldSave, parseWorldSave } from '../../world/world-save';
import { captureWorld, restoreWorld } from '../world-snapshot';
import { CraftSimulation } from './craft-simulation';
import { IDLE_CRAFT_INPUT } from '../input/craft-input';

describe('Modo infinito e baús grandes', () => {
  let catalog: CraftCatalog;
  beforeAll(async () => { catalog = await loadTestCatalog(); });
  const create = (infinite = true, inventory?: readonly import('./inventory').SlotContent[]) => new CraftSimulation({
    catalog, world: new VoxelWorld(16, 16, 16),
    spawn: { x: 5.5, y: 3, z: 5.5, yaw: 0 }, autoJump: false,
    randomSeed: 1, mode: infinite ? 'infinite' : 'adventure', inventory,
  });

  it('mantém o começo normal e dobra o baú para 54 espaços', () => {
    const game = create(false);
    game.screens.open('chest', 12);
    expect(game.screens.containers.get(12)?.length).toBe(54);
    expect(game.screens.containers.get(12)?.every(slot => slot === null)).toBeTrue();
    expect(game.inventory.count('golden-pickaxe')).toBe(0);
  });

  it('começa com as melhores ferramentas e baú abastecido perto do herói', () => {
    const game = create();
    expect(game.inventory.count('golden-pickaxe')).toBe(1);
    expect(game.inventory.count('golden-axe')).toBe(1);
    expect(game.screens.containers.size).toBe(1);
    const [cell, slots] = [...game.screens.containers][0];
    const position = game.world.positionOf(cell);
    expect(game.catalog.blockAt(game.world.get(position.x, position.y, position.z))?.id).toBe('chest');
    expect(slots.length).toBe(54);
    expect(slots.some(slot => slot?.item === 'golden-pickaxe')).toBeTrue();
    expect(slots.some(slot => slot?.item === 'gold-ingot')).toBeTrue();
    const bestFood = [...catalog.items.filter(item => item.heal !== null)]
      .sort((a, b) => (b.heal ?? 0) - (a.heal ?? 0))[0];
    expect(slots.some(slot => slot?.item === bestFood.id)).toBeTrue();
    expect(slots.some(slot => slot?.item === 'golden-armor')).toBeTrue();
    expect(slots.some(slot => slot?.item === 'wheat-seeds')).toBeTrue();
  });

  it('preserva os 27 slots antigos e os 54 slots novos no save', () => {
    const game = create(false);
    game.screens.containers.set(12, Array.from({ length: 27 }, (_, index) =>
      index === 26 ? { item: 'gold-ingot', count: 7, durability: null } : null,
    ));
    const identity = { id: 'normal', name: 'Normal', mode: 'adventure' as const, seed: 1, createdAt: '2026-10-30T12:00:00.000Z' };
    const legacy = captureWorld(game, identity, identity.createdAt);
    const restored = create(false, legacy.state!.inventory);
    restoreWorld(restored, legacy.state!);
    expect(restored.screens.containers.get(12)?.length).toBe(54);
    expect(restored.screens.containers.get(12)?.[26]?.count).toBe(7);
    restored.screens.containers.get(12)![53] = { item: 'stone', count: 64, durability: null };
    const saved = cleanWorldSave(parseWorldSave(JSON.parse(JSON.stringify(captureWorld(restored, identity, identity.createdAt)))), catalog);
    expect(saved.state!.containers[0].slots[26]?.count).toBe(7);
    expect(saved.state!.containers[0].slots[53]?.count).toBe(64);
  });

  it('usa a melhor picareta repetidamente sem perder durabilidade', () => {
    const game = create();
    for (let x = 0; x < 16; x += 1) {
      for (let z = 0; z < 16; z += 1) {
        game.world.fill(x, 2, z, catalog.blockNumber('stone'));
      }
    }
    game.hero.yaw = -Math.PI / 2;
    game.selectedSlot = game.inventory.slots.findIndex(slot => slot?.item === 'golden-pickaxe');
    const durability = game.inventory.slots[game.selectedSlot]!.durability;
    game.world.set(7, 4, 5, catalog.blockNumber('stone'));
    for (let step = 0; step < 100; step += 1) {
      game.step({ ...IDLE_CRAFT_INPUT, primaryHeld: true });
    }
    expect(game.world.get(7, 4, 5)).toBe(0);
    expect(game.inventory.slots[game.selectedSlot]!.durability).toBe(durability);
  });

  it('reabastece a fonte a cada retirada, inclusive após salvar e reabrir', () => {
    const game = create();
    const cell = [...game.screens.containers.keys()][0];
    game.screens.open('chest', cell);
    const original = game.screens.containers.get(cell)![0];
    game.clickSlot({ area: 'container', index: 0 }, 'all');
    expect(game.inventory.cursor).toEqual(original);
    game.clickSlot({ area: 'container', index: 0 }, 'all');
    expect(game.inventory.cursor).toEqual(original);
    expect(game.screens.containers.get(cell)![0]).toEqual(original);
    game.closeScreen();
    game.screens.open('chest', cell);
    game.clickSlot({ area: 'container', index: 0 }, 'all');
    expect(game.screens.containers.get(cell)![0]).toEqual(original);
    game.closeScreen();
    const save = cleanWorldSave(parseWorldSave(JSON.parse(JSON.stringify(captureWorld(game, {
      id: 'infinite', name: 'Infinito', mode: 'infinite', seed: 1, createdAt: '2026-10-30T12:00:00.000Z',
    }, '2026-10-30T12:01:00.000Z')))), catalog);
    expect(save.mode).toBe('infinite');
    expect(save.state!.containers[0].slots.length).toBe(54);
    const restored = create(true, save.state!.inventory);
    restoreWorld(restored, save.state!);
    restored.screens.open('chest', cell);
    restored.clickSlot({ area: 'container', index: 0 }, 'one');
    expect(restored.screens.containers.get(cell)![0]).toEqual(original);
  });
});
