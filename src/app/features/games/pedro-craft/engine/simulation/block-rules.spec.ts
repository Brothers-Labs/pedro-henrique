import type { CraftCatalog } from '../../content/craft-catalog';
import type { ToolStats } from '../../models/content.model';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { breakDurationMs, canHarvest, missingToolHint, rollLoot } from './block-rules';

describe('Regras de quebra do PedroCraft', () => {
  let catalog: CraftCatalog;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  const tool = (id: string): ToolStats => {
    const stats = catalog.item(id).tool;

    if (!stats) {
      throw new Error(`${id} não é ferramenta`);
    }

    return stats;
  };

  it('deixa pegar terra e tronco com a mão', () => {
    expect(canHarvest(catalog.block('dirt'), null)).toBeTrue();
    expect(canHarvest(catalog.block('oak-log'), null)).toBeTrue();
  });

  it('exige picareta para a pedra e o nível certo para cada minério', () => {
    expect(canHarvest(catalog.block('stone'), null)).toBeFalse();
    expect(canHarvest(catalog.block('stone'), tool('wooden-pickaxe'))).toBeTrue();
    expect(canHarvest(catalog.block('iron-ore'), tool('wooden-pickaxe'))).toBeFalse();
    expect(canHarvest(catalog.block('iron-ore'), tool('stone-pickaxe'))).toBeTrue();
    expect(canHarvest(catalog.block('gold-ore'), tool('stone-pickaxe'))).toBeFalse();
    expect(canHarvest(catalog.block('gold-ore'), tool('iron-pickaxe'))).toBeTrue();
  });

  it('tira o diamante só com picareta de ferro ou melhor, e a de diamante é mais rápida que a de ferro', () => {
    const ore = catalog.block('diamond-ore');

    expect(canHarvest(ore, tool('stone-pickaxe'))).toBeFalse();
    expect(canHarvest(ore, tool('iron-pickaxe'))).toBeTrue();
    expect(canHarvest(ore, tool('diamond-pickaxe'))).toBeTrue();
    expect(rollLoot(catalog.lootTable(ore.drops ?? ''), () => 0)).toEqual([{ item: 'diamond', count: 1 }]);
    expect(breakDurationMs(ore, tool('diamond-pickaxe')) ?? 0).toBeLessThan(breakDurationMs(ore, tool('iron-pickaxe')) ?? 0);
  });

  it('faz a picareta de ouro a mais rápida, mas a que gasta antes das outras de metal, sem passar do nível do diamante', () => {
    const ore = catalog.block('gold-ore');
    const durability = (id: string): number => catalog.item(id).durability ?? 0;

    expect(tool('golden-pickaxe').tier).toBeGreaterThan(tool('iron-pickaxe').tier);
    expect(tool('golden-pickaxe').tier).toBeLessThan(tool('diamond-pickaxe').tier);
    expect(canHarvest(catalog.block('diamond-ore'), tool('golden-pickaxe'))).toBeTrue();
    expect(breakDurationMs(ore, tool('golden-pickaxe')) ?? 0).toBeLessThan(breakDurationMs(ore, tool('diamond-pickaxe')) ?? 0);
    expect(durability('golden-pickaxe')).toBeLessThan(durability('iron-pickaxe'));
    expect(durability('golden-pickaxe')).toBeLessThan(durability('diamond-pickaxe'));
  });

  it('tira a obsidiana só com a picareta de diamante, e avisa qual picareta usar', () => {
    const obsidian = catalog.block('obsidian');

    expect(canHarvest(obsidian, tool('golden-pickaxe'))).toBeFalse();
    expect(canHarvest(obsidian, tool('diamond-pickaxe'))).toBeTrue();
    expect(obsidian.blastResistant).toBeTrue();
    expect(missingToolHint(obsidian)).toBe('Para pegar obsidiana, use uma picareta de diamante.');
  });

  it('tira a esmeralda com picareta de ferro e o lápis-lazúli já com a de pedra', () => {
    expect(canHarvest(catalog.block('emerald-ore'), tool('stone-pickaxe'))).toBeFalse();
    expect(canHarvest(catalog.block('emerald-ore'), tool('iron-pickaxe'))).toBeTrue();
    expect(canHarvest(catalog.block('lapis-ore'), tool('stone-pickaxe'))).toBeTrue();
    expect(rollLoot(catalog.lootTable(catalog.block('emerald-ore').drops ?? ''), () => 0)).toEqual([{ item: 'emerald', count: 1 }]);
    expect(rollLoot(catalog.lootTable(catalog.block('lapis-ore').drops ?? ''), () => 0)[0]?.item).toBe('lapis');
  });

  it('tira o bloco de ouro inteiro só com picareta de ferro ou melhor', () => {
    const block = catalog.block('gold-block');

    expect(canHarvest(block, tool('stone-pickaxe'))).toBeFalse();
    expect(canHarvest(block, tool('iron-pickaxe'))).toBeTrue();
    expect(rollLoot(catalog.lootTable(block.drops ?? ''), () => 0)).toEqual([{ item: 'gold-block', count: 1 }]);
  });

  it('não deixa um machado fazer o papel da picareta', () => {
    expect(canHarvest(catalog.block('stone'), tool('golden-axe'))).toBeFalse();
  });

  it('quebra mais rápido com a ferramenta certa', () => {
    const log = catalog.block('oak-log');
    const byHand = breakDurationMs(log, null) ?? 0;
    const withAxe = breakDurationMs(log, tool('stone-axe')) ?? 0;

    expect(withAxe).toBeLessThan(byHand);
    expect(breakDurationMs(log, tool('wooden-pickaxe'))).toBe(byHand);
  });

  it('demora mais quando falta a ferramenta mínima', () => {
    const stone = catalog.block('stone');

    expect(breakDurationMs(stone, null) ?? 0).toBeGreaterThan(breakDurationMs(stone, tool('wooden-pickaxe')) ?? 0);
  });

  it('não quebra a rocha-mãe nem a água', () => {
    expect(breakDurationMs(catalog.block('bedrock'), tool('golden-pickaxe'))).toBeNull();
    expect(breakDurationMs(catalog.block('water'), null)).toBeNull();
  });

  it('quebra o capim quase na hora, mas não em tempo zero', () => {
    expect(breakDurationMs(catalog.block('tall-grass'), null)).toBe(50);
  });

  it('explica para a criança qual ferramenta falta', () => {
    expect(missingToolHint(catalog.block('iron-ore'))).toBe('Para pegar minério de ferro, use uma picareta de pedra ou melhor.');
    expect(missingToolHint(catalog.block('dirt'))).toBeNull();
  });

  it('sorteia cada entrada da tabela sozinha', () => {
    const table = catalog.lootTable('wheat-harvest');
    const always = (): number => 0;
    const never = (): number => 0.999;

    expect(rollLoot(table, always)).toEqual([
      { item: 'wheat', count: 1 },
      { item: 'wheat-seeds', count: 1 },
    ]);
    expect(rollLoot(catalog.lootTable('oak-leaves'), never)).toEqual([]);
  });

  it('respeita o mínimo e o máximo de cada entrada', () => {
    const table = catalog.lootTable('carrot-harvest');
    const counts = new Set<number>();

    for (let roll = 0; roll < 50; roll += 1) {
      const value = roll / 50;
      counts.add(rollLoot(table, () => value)[0]?.count ?? 0);
    }

    expect([...counts].sort()).toEqual([2, 3]);
  });
});
