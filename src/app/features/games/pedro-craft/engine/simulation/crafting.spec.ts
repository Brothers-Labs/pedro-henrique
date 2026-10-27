import type { CraftCatalog } from '../../content/craft-catalog';
import type { CraftingRecipe } from '../../models/content.model';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { canCraftFrom, consumeIngredients, matchGrid, recipeRequirements } from './crafting';
import { Inventory, type SlotContent } from './inventory';

/** Grade a partir de linhas de ids separados por espaço; "." é casa vazia. */
function grid(...rows: readonly string[]): SlotContent[] {
  return rows.flatMap((row) => row.split(' ').map((item) => (item === '.' ? null : { item, count: 1, durability: null })));
}

describe('Fabricação do PedroCraft', () => {
  let catalog: CraftCatalog;
  let recipes: readonly CraftingRecipe[];

  beforeAll(async () => {
    catalog = await loadTestCatalog();
    recipes = catalog.craftingRecipes;
  });

  const recipe = (id: string): CraftingRecipe => {
    const found = recipes.find((candidate) => candidate.id === id);

    if (!found) {
      throw new Error(`receita ${id} não existe`);
    }

    return found;
  };

  describe('encaixe da grade', () => {
    it('reconhece a picareta na mesa', () => {
      const cells = grid('oak-planks oak-planks oak-planks', '. stick .', '. stick .');

      expect(matchGrid(cells, 'workbench', recipes)?.id).toBe('wooden-pickaxe');
    });

    it('aceita o desenho em qualquer canto da grade', () => {
      const cells = grid('. . .', '. oak-planks .', '. oak-planks .');

      expect(matchGrid(cells, 'workbench', recipes)?.id).toBe('stick');
    });

    it('aceita o desenho espelhado', () => {
      const cells = grid('. oak-planks oak-planks', '. stick oak-planks', '. stick .');

      expect(matchGrid(cells, 'workbench', recipes)?.id).toBe('wooden-axe');
    });

    it('não monta receita de mesa na grade da mochila', () => {
      const cells = grid('cobblestone cobblestone', 'cobblestone cobblestone');

      expect(matchGrid(cells, 'hand', recipes)).toBeNull();
    });

    it('monta receita da mão também na mesa', () => {
      const cells = grid('. . .', '. oak-planks oak-planks', '. oak-planks oak-planks');

      expect(matchGrid(cells, 'workbench', recipes)?.id).toBe('workbench');
    });

    it('confere só os itens na receita sem forma', () => {
      expect(matchGrid(grid('. .', '. oak-log'), 'hand', recipes)?.id).toBe('oak-planks');
      expect(matchGrid(grid('oak-log oak-log', '. .'), 'hand', recipes)).toBeNull();
    });

    it('não monta nada com a grade vazia ou com sobra', () => {
      expect(matchGrid(grid('. .', '. .'), 'hand', recipes)).toBeNull();
      expect(matchGrid(grid('oak-planks dirt', '. .'), 'hand', recipes)).toBeNull();
    });
  });

  describe('livro de receitas', () => {
    it('soma o que a receita com forma gasta', () => {
      expect(recipeRequirements(recipe('wooden-pickaxe'))).toEqual([
        { item: 'oak-planks', count: 3 },
        { item: 'stick', count: 2 },
      ]);
    });

    it('gasta tudo ou nada', () => {
      const inventory = new Inventory(catalog);

      inventory.add('oak-planks', 3);
      inventory.add('stick', 1);

      expect(canCraftFrom(inventory, recipe('wooden-pickaxe'))).toBeFalse();
      expect(consumeIngredients(inventory, recipe('wooden-pickaxe'))).toBeFalse();
      expect(inventory.count('oak-planks')).toBe(3);

      inventory.add('stick', 1);

      expect(consumeIngredients(inventory, recipe('wooden-pickaxe'))).toBeTrue();
      expect(inventory.count('oak-planks')).toBe(0);
      expect(inventory.count('stick')).toBe(0);
    });
  });
});
