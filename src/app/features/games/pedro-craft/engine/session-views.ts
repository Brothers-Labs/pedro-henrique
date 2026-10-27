import type { CraftHudState, InventoryView, SlotView } from '../models/craft-session.model';
import type { CraftSimulation } from './simulation/craft-simulation';
import { HOTBAR_SIZE, type SlotContent } from './simulation/inventory';

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
    goal: goal ? { goal, amount: simulation.goals.progress.amount } : null,
    goalsDone: simulation.goals.completedCount,
    goalsTotal: simulation.catalog.goals.length,
  };
}

export function inventoryView(simulation: CraftSimulation): InventoryView {
  return {
    slots: simulation.inventory.slots.map((slot) => slotView(simulation, slot)),
    cursor: slotView(simulation, simulation.inventory.cursor),
  };
}

function slotView(simulation: CraftSimulation, slot: SlotContent): SlotView | null {
  if (!slot) {
    return null;
  }

  const maxDurability = simulation.catalog.item(slot.item).durability;

  return {
    item: slot.item,
    count: slot.count,
    wear: slot.durability !== null && maxDurability ? slot.durability / maxDurability : null,
  };
}
