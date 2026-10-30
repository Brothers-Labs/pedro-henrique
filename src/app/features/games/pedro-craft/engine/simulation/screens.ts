import type { CraftCatalog } from '../../content/craft-catalog';
import { GRID_SIZE } from '../../content/parsers/parse-recipes';
import type { CraftingRecipe, CraftingStation } from '../../models/content.model';
import { consumeIngredients, fitsStation, matchGrid } from './crafting';
import { createFurnace, FURNACE_OUTPUT, type FurnaceState } from './furnace';
import { infiniteSupplies } from './infinite-supplies';
import { CHEST_SIZE, type Inventory, type ItemStack, type SlotClick, type SlotContent } from './inventory';

/** Tela que o jogo abre por cima do mundo. */
export type CraftScreen = 'inventory' | 'workbench' | 'chest' | 'furnace';

export type OpenScreen =
  | { readonly kind: 'inventory' | 'workbench'; readonly grid: SlotContent[] }
  | { readonly kind: 'chest'; readonly cell: number; readonly slots: SlotContent[] }
  | { readonly kind: 'furnace'; readonly cell: number; readonly furnace: FurnaceState };

/** Onde fica o espaço tocado: na mochila, na grade de fabricar ou no baú/fornalha aberto. */
export type SlotArea = 'inventory' | 'grid' | 'container';

export interface SlotRef {
  readonly area: SlotArea;
  readonly index: number;
}

export interface ScreenHost {
  readonly infinite?: boolean;
  readonly catalog: CraftCatalog;
  readonly inventory: Inventory;
  /** Guarda na mochila o que acabou de ser feito; conta para a missão e devolve o que não coube. */
  receive(stack: ItemStack): number;
  /** Deixa cair perto do herói o que não coube em lugar nenhum. */
  dropNearHero(stack: ItemStack): void;
}

/**
 * As telas por cima do mundo e o que guardam: grades, baús e fornalhas.
 *
 * Cada baú e cada fornalha é lembrado pela célula do mundo onde está — o
 * mesmo número que vai para o save.
 */
export class ScreenController {
  readonly containers = new Map<number, SlotContent[]>();
  readonly furnaces = new Map<number, FurnaceState>();
  screen: OpenScreen | null = null;

  constructor(private readonly host: ScreenHost) {}

  open(kind: CraftScreen, cell = -1): void {
    this.close();

    switch (kind) {
      case 'inventory':
      case 'workbench':
        this.screen = { kind, grid: Array.from({ length: GRID_SIZE[stationOf(kind)] ** 2 }, () => null) };
        return;
      case 'chest':
        this.screen = { kind, cell, slots: this.chestAt(cell) };
        return;
      case 'furnace':
        this.screen = { kind, cell, furnace: this.furnaceAt(cell) };
        return;
    }
  }

  /** Fecha a tela: a grade e a mão voltam para a mochila; o que não couber cai no chão. */
  close(): void {
    const screen = this.screen;

    this.screen = null;

    if (screen && (screen.kind === 'inventory' || screen.kind === 'workbench')) {
      for (const stack of screen.grid) {
        this.giveBack(stack);
      }
    }

    this.giveBack(this.host.inventory.returnCursor());
  }

  click(ref: SlotRef, mode: SlotClick): void {
    const container = this.containerFor(ref.area);

    if (!container) {
      return;
    }

    // A saída da fornalha só se esvazia: nada é posto nela com a mão.
    if (this.screen?.kind === 'furnace' && ref.area === 'container' && ref.index === FURNACE_OUTPUT) {
      this.collectFurnaceOutput();
      return;
    }

    if (!Number.isInteger(ref.index) || ref.index < 0 || ref.index >= container.length) {
      return;
    }

    if (this.host.infinite && this.screen?.kind === 'chest' && ref.area === 'container') {
      const source = container[ref.index];
      if (source) {
        if (this.host.inventory.cursor) {
          this.giveBack(this.host.inventory.returnCursor());
        }
        this.host.inventory.cursor = { ...source, count: mode === 'one' ? Math.ceil(source.count / 2) : source.count };
      }
      return;
    }

    this.host.inventory.clickIn(container, ref.index, mode);
  }

  /** Receita que a grade aberta monta agora; `null` sem grade ou sem receita. */
  gridRecipe(): CraftingRecipe | null {
    const screen = this.screen;

    if (!screen || (screen.kind !== 'inventory' && screen.kind !== 'workbench')) {
      return null;
    }

    return matchGrid(screen.grid, stationOf(screen.kind), this.host.catalog.craftingRecipes);
  }

  /** Pega o resultado da grade: gasta um de cada casa e guarda o que foi feito. */
  takeGridResult(): CraftingRecipe | null {
    const screen = this.screen;
    const recipe = this.gridRecipe();

    if (!screen || !recipe || (screen.kind !== 'inventory' && screen.kind !== 'workbench')) {
      return null;
    }

    screen.grid.forEach((cell, index) => {
      screen.grid[index] = cell && cell.count > 1 ? { ...cell, count: cell.count - 1 } : null;
    });
    this.deliver(this.output(recipe));

    return recipe;
  }

  /** O livro de receitas: fabrica direto da mochila, num toque. */
  craftRecipe(recipeId: string): CraftingRecipe | null {
    const recipe = this.host.catalog.craftingRecipes.find((candidate) => candidate.id === recipeId);
    const station = this.station;

    if (!recipe || !station || !fitsStation(recipe, station) || !consumeIngredients(this.host.inventory, recipe)) {
      return null;
    }

    this.deliver(this.output(recipe));

    return recipe;
  }

  /** Lugar de fabricar da tela aberta; `null` quando a tela não fabrica. */
  get station(): CraftingStation | null {
    const kind = this.screen?.kind;

    return kind === 'inventory' || kind === 'workbench' ? stationOf(kind) : null;
  }

  /** O baú ou a fornalha da célula foi quebrado: tudo o que estava dentro sai. */
  remove(cell: number): readonly ItemStack[] {
    const stacks = [...(this.containers.get(cell) ?? []), ...(this.furnaces.get(cell)?.slots ?? [])].filter(
      (stack): stack is ItemStack => stack !== null,
    );

    this.containers.delete(cell);
    this.furnaces.delete(cell);

    return stacks;
  }

  private collectFurnaceOutput(): void {
    if (this.screen?.kind !== 'furnace') {
      return;
    }

    const slots = this.screen.furnace.slots;
    const ready = slots[FURNACE_OUTPUT];

    if (!ready) {
      return;
    }

    const left = this.host.receive(ready);

    slots[FURNACE_OUTPUT] = left > 0 ? { ...ready, count: left } : null;
  }

  private containerFor(area: SlotArea): SlotContent[] | null {
    const screen = this.screen;

    switch (area) {
      case 'inventory':
        return this.host.inventory.slots;
      case 'grid':
        return screen && (screen.kind === 'inventory' || screen.kind === 'workbench') ? screen.grid : null;
      case 'container':
        if (screen?.kind === 'chest') {
          return screen.slots;
        }

        return screen?.kind === 'furnace' ? screen.furnace.slots : null;
    }
  }

  private chestAt(cell: number): SlotContent[] {
    if (this.host.infinite) {
      const supplies = infiniteSupplies(this.host.catalog);
      this.containers.set(cell, supplies);
      return supplies;
    }
    const known = this.containers.get(cell);

    if (known) {
      const expanded = Array.from({ length: CHEST_SIZE }, (_, index) => known[index] ?? null);
      this.containers.set(cell, expanded);
      return expanded;
    }

    const slots: SlotContent[] = Array.from({ length: CHEST_SIZE }, () => null);

    this.containers.set(cell, slots);

    return slots;
  }

  private furnaceAt(cell: number): FurnaceState {
    const known = this.furnaces.get(cell);

    if (known) {
      return known;
    }

    const furnace = createFurnace();

    this.furnaces.set(cell, furnace);

    return furnace;
  }

  private output(recipe: CraftingRecipe): ItemStack {
    return { item: recipe.output.item, count: recipe.output.count, durability: null };
  }

  /** Entrega algo novo (fabricado): conta para a missão; o que não couber cai no chão. */
  private deliver(stack: ItemStack): void {
    const left = this.host.receive(stack);

    if (left > 0) {
      this.host.dropNearHero({ ...stack, count: left });
    }
  }

  /** Devolve à mochila o que já era da criança (grade, mão): não é "pegar" de novo. */
  private giveBack(stack: SlotContent): void {
    if (!stack) {
      return;
    }

    const left = this.host.inventory.add(stack.item, stack.count, stack.durability);

    if (left > 0) {
      this.host.dropNearHero({ ...stack, count: left });
    }
  }
}

function stationOf(kind: 'inventory' | 'workbench'): CraftingStation {
  return kind === 'workbench' ? 'workbench' : 'hand';
}
