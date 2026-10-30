import type { CraftCatalog } from '../content/craft-catalog';
import { loadTestCatalog } from '../testing/craft-test-content';
import { itemHelp, recipeHelp, smeltingHelp } from './help-catalog';
import { HELP_TOPICS } from './help-topics';

describe('Ajuda do PedroCraft', () => {
  let catalog: CraftCatalog;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  it('todo item com figura na ajuda existe no conteúdo', () => {
    const missing = HELP_TOPICS.flatMap((topic) => topic.steps.flatMap((step) => step.items ?? [])).filter((id) => !catalog.hasItem(id));

    expect(missing).toEqual([]);
  });

  it('os tópicos têm ids únicos e pelo menos um passo', () => {
    const ids = HELP_TOPICS.map((topic) => topic.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(HELP_TOPICS.every((topic) => topic.steps.length > 0)).toBeTrue();
  });

  it('todo item do jogo diz para que serve e como conseguir', () => {
    const help = itemHelp(catalog);
    const starting = new Set(catalog.world.hero.startingInventory.map((entry) => entry.item));

    expect(help.length).toBe(catalog.items.length);
    expect(help.filter((item) => item.use === '').map((item) => item.id)).toEqual([]);
    expect(help.filter((item) => item.obtain === '' && !starting.has(item.id)).map((item) => item.id)).toEqual([]);
  });

  it('explica o item com as palavras do conteúdo', () => {
    const byId = new Map(itemHelp(catalog).map((item) => [item.id, item]));

    expect(byId.get('apple')?.use).toContain('recupera 2 corações');
    expect(byId.get('shears')?.use).toContain('Use em ovelha para ganhar lã');
    expect(byId.get('bucket')?.use).toContain('Use em vaca para ganhar balde de leite');
    expect(byId.get('oak-log')?.obtain).toContain('quebrando tronco de carvalho');
    expect(byId.get('wool')?.obtain).toContain('ovelha');
    expect(byId.get('water-bucket')?.obtain).toContain('balde');
  });

  it('lista todas as receitas e tudo o que a fornalha faz', () => {
    expect(recipeHelp(catalog).length).toBe(catalog.craftingRecipes.length);
    expect(smeltingHelp(catalog).length).toBe(catalog.content.recipes.smelting.length);
    expect(recipeHelp(catalog).find((recipe) => recipe.id === 'bed')?.ingredients).toEqual(
      jasmine.arrayWithExactContents([
        { item: 'wool', count: 3 },
        { item: 'oak-planks', count: 3 },
      ]),
    );
  });
});
