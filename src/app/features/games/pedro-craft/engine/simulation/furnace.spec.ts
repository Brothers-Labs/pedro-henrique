import type { CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { createFurnace, FURNACE_FUEL, FURNACE_INPUT, FURNACE_OUTPUT, type FurnaceState, tickFurnace } from './furnace';

describe('Fornalha do PedroCraft', () => {
  let catalog: CraftCatalog;
  let furnace: FurnaceState;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    furnace = createFurnace();
  });

  const smeltMs = (input: string): number => catalog.smeltingFor(input)?.timeMs ?? 0;

  it('assa o minério de ferro com carvão', () => {
    furnace.slots[FURNACE_INPUT] = { item: 'iron-ore', count: 2, durability: null };
    furnace.slots[FURNACE_FUEL] = { item: 'coal', count: 1, durability: null };

    tickFurnace(furnace, catalog, smeltMs('iron-ore'));

    expect(furnace.slots[FURNACE_OUTPUT]).toEqual({ item: 'iron-ingot', count: 1, durability: null });
    expect(furnace.slots[FURNACE_INPUT]?.count).toBe(1);
    expect(furnace.slots[FURNACE_FUEL]).toBeNull();
    expect(furnace.burnLeftMs).toBeGreaterThan(0);
  });

  it('não assa sem combustível', () => {
    furnace.slots[FURNACE_INPUT] = { item: 'sand', count: 1, durability: null };

    tickFurnace(furnace, catalog, 60_000);

    expect(furnace.slots[FURNACE_OUTPUT]).toBeNull();
    expect(furnace.progressMs).toBe(0);
  });

  it('não acende o combustível sem nada para assar', () => {
    furnace.slots[FURNACE_FUEL] = { item: 'coal', count: 3, durability: null };

    tickFurnace(furnace, catalog, 1000);

    expect(furnace.slots[FURNACE_FUEL]?.count).toBe(3);
    expect(furnace.burnLeftMs).toBe(0);
  });

  it('não acende para algo que não se assa', () => {
    furnace.slots[FURNACE_INPUT] = { item: 'dirt', count: 1, durability: null };
    furnace.slots[FURNACE_FUEL] = { item: 'coal', count: 1, durability: null };

    tickFurnace(furnace, catalog, 10_000);

    expect(furnace.slots[FURNACE_FUEL]?.count).toBe(1);
  });

  it('para quando a saída enche ou tem outra coisa', () => {
    furnace.slots[FURNACE_INPUT] = { item: 'sand', count: 4, durability: null };
    furnace.slots[FURNACE_FUEL] = { item: 'coal', count: 1, durability: null };
    furnace.slots[FURNACE_OUTPUT] = { item: 'stone', count: 1, durability: null };

    tickFurnace(furnace, catalog, smeltMs('sand') * 2);

    expect(furnace.slots[FURNACE_OUTPUT]).toEqual({ item: 'stone', count: 1, durability: null });
    expect(furnace.slots[FURNACE_INPUT]?.count).toBe(4);
  });

  it('assa vários seguidos com um carvão só', () => {
    furnace.slots[FURNACE_INPUT] = { item: 'sand', count: 3, durability: null };
    furnace.slots[FURNACE_FUEL] = { item: 'coal', count: 1, durability: null };

    for (let tick = 0; tick < 3; tick += 1) {
      tickFurnace(furnace, catalog, smeltMs('sand'));
    }

    expect(furnace.slots[FURNACE_OUTPUT]?.count).toBe(3);
    expect(furnace.slots[FURNACE_INPUT]).toBeNull();
  });
});
