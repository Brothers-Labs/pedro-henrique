import { GRID_SIZE } from '../content/parsers/parse-recipes';
import type { CraftCatalog } from '../content/craft-catalog';
import type { CraftingStation, GoalDefinition } from '../models/content.model';
import type { CraftHudState, RecipeView, ScreenView, SlotView } from '../models/craft-session.model';
import { canCraftFrom, fitsStation, recipeRequirements } from './simulation/crafting';
import type { CraftSimulation } from './simulation/craft-simulation';
import { HOTBAR_SIZE, type ItemStack, type SlotContent } from './simulation/inventory';

/**
 * Fotografias do estado da simulação para a tela.
 *
 * A tela recebe objetos novos e imutáveis: o Angular compara por referência e
 * redesenha só o que mudou, e nada do lado de fora consegue mexer no
 * inventário de verdade.
 */
export function hudState(simulation: CraftSimulation): CraftHudState {
  const goal = simulation.goals.current;

  return {
    hotbar: simulation.inventory.slots.slice(0, HOTBAR_SIZE).map((slot) => slotView(simulation, slot)),
    selected: simulation.selectedSlot,
    goal: goal ? { goal, amount: simulation.goals.progress.amount, icon: goalIcon(goal, simulation.catalog) } : null,
    goalsDone: simulation.goals.completedCount,
    goalsTotal: simulation.catalog.goals.length,
    health: simulation.health.value,
    maxHealth: simulation.health.max,
    calendar: {
      day: simulation.calendar.day,
      seasonName: simulation.calendar.season.name,
      seasonEmoji: simulation.calendar.season.emoji,
      partOfDay: simulation.clock.partOfDay,
      weather: simulation.weather.current,
      isFullMoon: simulation.calendar.isFullMoon,
    },
    firstStep: simulation.firstSteps?.current ?? null,
    energy: simulation.energy ? { value: simulation.energy.value, max: simulation.energy.max } : null,
    armor: simulation.armorLeft,
  };
}

/**
 * O item que representa a missão, para a criança reconhecer pela figura: o
 * próprio item, o bloco colocado, o que a plantação dá, a cama para dormir.
 */
export function goalIcon(goal: GoalDefinition, catalog: CraftCatalog): string | null {
  const target = goal.target;

  switch (goal.trigger) {
    case 'obtain':
      return target && catalog.hasItem(target) ? target : null;
    case 'place':
      return catalog.items.find((item) => item.places === target)?.id ?? null;
    case 'harvest': {
      const crop = target && catalog.hasCrop(target) ? catalog.crop(target) : null;

      return crop?.mature.type === 'harvest' ? (catalog.lootTable(crop.mature.loot).entries[0]?.item ?? null) : null;
    }
    case 'sleep':
      return catalog.items.find((item) => item.places !== null && catalog.block(item.places).interaction === 'bed')?.id ?? null;
    case 'defeat':
      return null;
  }
}

/** A tela aberta; `null` quando nenhuma está aberta. */
export function screenView(simulation: CraftSimulation): ScreenView | null {
  const screens = simulation.screens;
  const screen = screens.screen;

  if (!screen) {
    return null;
  }

  const slots = (list: readonly SlotContent[]): readonly (SlotView | null)[] => list.map((slot) => slotView(simulation, slot));
  const station = screens.station;
  const recipe = screens.gridRecipe();

  return {
    kind: screen.kind,
    inventory: slots(simulation.inventory.slots),
    cursor: slotView(simulation, simulation.inventory.cursor),
    grid:
      screen.kind === 'inventory' || screen.kind === 'workbench'
        ? {
            size: station ? GRID_SIZE[station] : 0,
            cells: slots(screen.grid),
            result: recipe ? stackView(simulation, { ...recipe.output, durability: null }) : null,
          }
        : null,
    recipes: station ? recipeBook(simulation, station) : [],
    chest: screen.kind === 'chest' ? slots(screen.slots) : null,
    creativeItems: simulation.mode === 'creative' && screen.kind === 'inventory' ? simulation.catalog.items.map((item) => item.id) : [],
    furnace:
      screen.kind === 'furnace'
        ? {
            slots: slots(screen.furnace.slots),
            burn: screen.furnace.burnTotalMs > 0 ? screen.furnace.burnLeftMs / screen.furnace.burnTotalMs : 0,
            progress: progressOf(simulation, screen.furnace.slots[0], screen.furnace.progressMs),
          }
        : null,
  };
}

/** Receitas do lugar de fabricar, com as que já dá para fazer primeiro. */
function recipeBook(simulation: CraftSimulation, station: CraftingStation): readonly RecipeView[] {
  const inventory = simulation.inventory;
  const pages = simulation.catalog.craftingRecipes
    .filter((recipe) => fitsStation(recipe, station))
    .map(
      (recipe): RecipeView => ({
        id: recipe.id,
        output: stackView(simulation, { ...recipe.output, durability: null }),
        ingredients: recipeRequirements(recipe).map((requirement) => ({ ...requirement, have: inventory.count(requirement.item) })),
        canCraft: canCraftFrom(inventory, recipe),
      }),
    );

  return [...pages.filter((page) => page.canCraft), ...pages.filter((page) => !page.canCraft)];
}

function progressOf(simulation: CraftSimulation, input: SlotContent, progressMs: number): number {
  const recipe = input ? simulation.catalog.smeltingFor(input.item) : null;

  return recipe ? Math.min(1, progressMs / recipe.timeMs) : 0;
}

function slotView(simulation: CraftSimulation, slot: SlotContent): SlotView | null {
  return slot ? stackView(simulation, slot) : null;
}

function stackView(simulation: CraftSimulation, stack: ItemStack): SlotView {
  const maxDurability = simulation.catalog.item(stack.item).durability;

  return {
    item: stack.item,
    count: stack.count,
    wear: stack.durability !== null && maxDurability ? stack.durability / maxDurability : null,
  };
}
