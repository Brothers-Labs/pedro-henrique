import {
  CONTENT_SCHEMA_VERSION,
  type CraftingRecipe,
  type CraftingStation,
  type FuelDefinition,
  type ItemAmount,
  type RecipeBook,
  type SmeltingRecipe,
} from '../../models/content.model';
import { ensureUniqueIds, JsonReader, type JsonObjectReader, readSchemaVersion } from '../json-reader';

const STATIONS: readonly CraftingStation[] = ['hand', 'workbench'];

/** Lado da grade de cada lugar de fabricação. */
export const GRID_SIZE: Readonly<Record<CraftingStation, number>> = { hand: 2, workbench: 3 };

export function parseRecipes(value: unknown): RecipeBook {
  const root = JsonReader.root('recipes', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const crafting = root.field('crafting').array({ minLength: 1 }).map((entry) => parseCrafting(entry.object()));
  const smelting = root.field('smelting').array().map((entry) => parseSmelting(entry.object()));
  const fuels = root.field('fuels').array().map((entry) => parseFuel(entry.object()));

  ensureUniqueIds('recipes', 'Receita', [...crafting, ...smelting].map((recipe) => recipe.id));
  ensureUniqueIds('recipes', 'Receita de fornalha para o item', smelting.map((recipe) => recipe.input));
  ensureUniqueIds('recipes', 'Combustível', fuels.map((fuel) => fuel.item));

  return { crafting, smelting, fuels };
}

function parseCrafting(recipe: JsonObjectReader): CraftingRecipe {
  const id = recipe.field('id').id();
  const station = recipe.field('station').oneOf(STATIONS);
  const output = parseAmount(recipe.field('output').object());
  const type = recipe.field('type').oneOf(['shaped', 'shapeless'] as const);

  if (type === 'shapeless') {
    const ingredients = recipe.field('ingredients').array({ minLength: 1 }).map((entry) => parseAmount(entry.object()));
    const slots = ingredients.reduce((total, ingredient) => total + ingredient.count, 0);

    if (slots > GRID_SIZE[station] ** 2) {
      recipe.fail(`a receita usa ${slots} casas e a grade de "${station}" tem ${GRID_SIZE[station] ** 2}`);
    }

    return { id, type, station, ingredients, output };
  }

  const pattern = recipe.field('pattern').array({ minLength: 1 }).map((row) => row.string({ allowEmpty: true }));
  const key = Object.fromEntries(
    recipe
      .field('key')
      .object()
      .entries()
      .map(([symbol, item]) => [symbol, item.id()] as const),
  );

  validatePattern(recipe, pattern, key, GRID_SIZE[station]);

  return { id, type, station, pattern, key, output };
}

function validatePattern(
  recipe: JsonObjectReader,
  pattern: readonly string[],
  key: Readonly<Record<string, string>>,
  size: number,
): void {
  const width = Math.max(...pattern.map((row) => row.length));

  if (pattern.length > size || width > size) {
    recipe.fail(`o desenho não cabe na grade ${size} × ${size}`);
  }

  for (const symbol of pattern.join('')) {
    if (symbol !== ' ' && !Object.hasOwn(key, symbol)) {
      recipe.fail(`a letra "${symbol}" do desenho não está na legenda`);
    }
  }

  for (const symbol of Object.keys(key)) {
    if (symbol.length !== 1 || symbol === ' ') {
      recipe.fail(`a legenda "${symbol}" deve ser uma única letra`);
    }
  }
}

function parseSmelting(recipe: JsonObjectReader): SmeltingRecipe {
  return {
    id: recipe.field('id').id(),
    input: recipe.field('input').id(),
    output: parseAmount(recipe.field('output').object()),
    timeMs: recipe.field('timeMs').number({ integer: true, min: 500 }),
  };
}

function parseFuel(fuel: JsonObjectReader): FuelDefinition {
  return {
    item: fuel.field('item').id(),
    burnMs: fuel.field('burnMs').number({ integer: true, min: 500 }),
  };
}

export function parseAmount(amount: JsonObjectReader): ItemAmount {
  return {
    item: amount.field('item').id(),
    count: amount.optionalField('count')?.number({ integer: true, min: 1, max: 64 }) ?? 1,
  };
}
