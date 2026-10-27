import type { CraftCatalog } from '../../content/craft-catalog';
import type { SlotContent } from './inventory';

/** Posição de cada espaço da fornalha no vetor `slots`. */
export const FURNACE_INPUT = 0;
export const FURNACE_FUEL = 1;
export const FURNACE_OUTPUT = 2;

/**
 * Uma fornalha: o que vai assar, o combustível e o que ficou pronto.
 *
 * Os espaços ficam num vetor para a tela usar a mesma regra de toque da
 * mochila. O fogo e o progresso são contados em milissegundos de jogo.
 */
export interface FurnaceState {
  readonly slots: SlotContent[];
  burnLeftMs: number;
  burnTotalMs: number;
  progressMs: number;
}

export function createFurnace(): FurnaceState {
  return { slots: [null, null, null], burnLeftMs: 0, burnTotalMs: 0, progressMs: 0 };
}

/**
 * Avança a fornalha.
 *
 * Acende um combustível novo só quando há algo para assar e lugar para o
 * resultado — carvão nunca queima à toa. Tirar o item do meio do caminho
 * zera o progresso dele.
 */
export function tickFurnace(furnace: FurnaceState, catalog: CraftCatalog, elapsedMs: number): void {
  const input = furnace.slots[FURNACE_INPUT];
  const recipe = input ? catalog.smeltingFor(input.item) : null;
  const output = furnace.slots[FURNACE_OUTPUT];
  const canSmelt =
    recipe !== null &&
    (output === null ||
      (output.item === recipe.output.item && output.count + recipe.output.count <= catalog.item(output.item).maxStack));

  if (furnace.burnLeftMs <= 0 && canSmelt) {
    lightFuel(furnace, catalog);
  }

  if (furnace.burnLeftMs <= 0) {
    furnace.progressMs = 0;
    return;
  }

  furnace.burnLeftMs = Math.max(0, furnace.burnLeftMs - elapsedMs);

  if (!canSmelt || !recipe || !input) {
    furnace.progressMs = 0;
    return;
  }

  furnace.progressMs += elapsedMs;

  if (furnace.progressMs < recipe.timeMs) {
    return;
  }

  furnace.progressMs = 0;
  furnace.slots[FURNACE_INPUT] = input.count > 1 ? { ...input, count: input.count - 1 } : null;
  furnace.slots[FURNACE_OUTPUT] = output
    ? { ...output, count: output.count + recipe.output.count }
    : { item: recipe.output.item, count: recipe.output.count, durability: null };
}

function lightFuel(furnace: FurnaceState, catalog: CraftCatalog): void {
  const fuelSlot = furnace.slots[FURNACE_FUEL];
  const fuel = fuelSlot ? catalog.fuelFor(fuelSlot.item) : null;

  if (!fuelSlot || !fuel) {
    return;
  }

  furnace.slots[FURNACE_FUEL] = fuelSlot.count > 1 ? { ...fuelSlot, count: fuelSlot.count - 1 } : null;
  furnace.burnLeftMs = fuel.burnMs;
  furnace.burnTotalMs = fuel.burnMs;
}
