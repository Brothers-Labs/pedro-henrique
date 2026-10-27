import { GRID_SIZE } from '../../content/parsers/parse-recipes';
import type { CraftingRecipe, CraftingStation, ItemAmount, ShapedRecipe } from '../../models/content.model';
import type { Inventory, SlotContent } from './inventory';

type Matrix = readonly (readonly (string | null)[])[];

/** A receita cabe neste lugar? As da mão também servem na mesa; as da mesa, só nela. */
export function fitsStation(recipe: CraftingRecipe, station: CraftingStation): boolean {
  return recipe.station === 'hand' || station === 'workbench';
}

/** Tudo que a receita gasta, somado por item: "3 tábuas e 2 gravetos". */
export function recipeRequirements(recipe: CraftingRecipe): readonly ItemAmount[] {
  const totals = new Map<string, number>();
  const add = (item: string, count: number): void => {
    totals.set(item, (totals.get(item) ?? 0) + count);
  };

  if (recipe.type === 'shapeless') {
    recipe.ingredients.forEach((ingredient) => add(ingredient.item, ingredient.count));
  } else {
    for (const symbol of recipe.pattern.join('')) {
      const item = recipe.key[symbol];

      if (item) {
        add(item, 1);
      }
    }
  }

  return [...totals].map(([item, count]) => ({ item, count }));
}

/** Há tudo o que a receita pede na mochila? */
export function canCraftFrom(inventory: Inventory, recipe: CraftingRecipe): boolean {
  return recipeRequirements(recipe).every((requirement) => inventory.count(requirement.item) >= requirement.count);
}

/**
 * Gasta da mochila os ingredientes de uma receita (o livro de receitas).
 *
 * Tudo ou nada: se faltar qualquer coisa, nada é gasto e a resposta é
 * `false`. Guardar o resultado fica com quem chamou, que sabe contar a
 * missão e deixar cair o que não couber.
 */
export function consumeIngredients(inventory: Inventory, recipe: CraftingRecipe): boolean {
  if (!canCraftFrom(inventory, recipe)) {
    return false;
  }

  for (const requirement of recipeRequirements(recipe)) {
    inventory.remove(requirement.item, requirement.count);
  }

  return true;
}

/**
 * Receita que a grade monta, ou `null`.
 *
 * O desenho pode estar em qualquer canto da grade e também vale espelhado:
 * uma criança não precisa acertar a posição exata. Receita sem forma só
 * confere os itens, um por casa.
 */
export function matchGrid(
  cells: readonly SlotContent[],
  station: CraftingStation,
  recipes: readonly CraftingRecipe[],
): CraftingRecipe | null {
  const size = GRID_SIZE[station];
  const grid = trim(Array.from({ length: size }, (_, row) => cells.slice(row * size, row * size + size).map((cell) => cell?.item ?? null)));

  if (grid.length === 0) {
    return null;
  }

  const items = grid.flat().filter((item): item is string => item !== null);

  return (
    recipes.find((recipe) => {
      if (!fitsStation(recipe, station)) {
        return false;
      }

      if (recipe.type === 'shapeless') {
        return sameItems(items, recipe.ingredients.flatMap((ingredient) => Array<string>(ingredient.count).fill(ingredient.item)));
      }

      const pattern = trim(patternMatrix(recipe));

      return sameMatrix(grid, pattern) || sameMatrix(grid, pattern.map((row) => [...row].reverse()));
    }) ?? null
  );
}

function patternMatrix(recipe: ShapedRecipe): Matrix {
  const width = Math.max(...recipe.pattern.map((row) => row.length));

  return recipe.pattern.map((row) =>
    Array.from({ length: width }, (_, column) => {
      const symbol = row[column] ?? ' ';

      return symbol === ' ' ? null : (recipe.key[symbol] ?? null);
    }),
  );
}

/** Corta linhas e colunas vazias das bordas: o desenho fica do tamanho dele. */
function trim(matrix: Matrix): Matrix {
  const hasItem = (row: readonly (string | null)[]): boolean => row.some((cell) => cell !== null);
  const firstRow = matrix.findIndex(hasItem);

  if (firstRow < 0) {
    return [];
  }

  const lastRow = matrix.length - 1 - [...matrix].reverse().findIndex(hasItem);
  const width = Math.max(...matrix.map((row) => row.length));
  const used = Array.from({ length: width }, (_, column) => matrix.some((row) => (row[column] ?? null) !== null));
  const first = used.indexOf(true);
  const last = used.lastIndexOf(true);

  return matrix.slice(firstRow, lastRow + 1).map((row) => Array.from({ length: last - first + 1 }, (_, offset) => row[first + offset] ?? null));
}

function sameMatrix(first: Matrix, second: Matrix): boolean {
  return (
    first.length === second.length &&
    first.every((row, rowIndex) => row.length === second[rowIndex].length && row.every((cell, column) => cell === second[rowIndex][column]))
  );
}

function sameItems(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && [...first].sort().join('|') === [...second].sort().join('|');
}
