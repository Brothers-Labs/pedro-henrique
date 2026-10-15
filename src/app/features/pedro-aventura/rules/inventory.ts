import { cosmeticById, DEFAULT_EQUIPPED, STARTER_COSMETICS } from '../config/cosmetics.config';
import type { Inventory } from '../models/economy.model';

export function createInventory(): Inventory {
  return { owned: [...STARTER_COSMETICS], equipped: { ...DEFAULT_EQUIPPED } };
}

export function ownsCosmetic(inventory: Inventory, cosmeticId: string): boolean {
  return inventory.owned.includes(cosmeticId);
}

/** Acrescenta um cosmético à coleção. Ganhar de novo o que já tem não muda nada. */
export function grantCosmetic(inventory: Inventory, cosmeticId: string): Inventory {
  cosmeticById(cosmeticId);

  return ownsCosmetic(inventory, cosmeticId) ? inventory : { ...inventory, owned: [...inventory.owned, cosmeticId] };
}

/** Veste ou estaciona um cosmético. Só vale para o que está na coleção. */
export function equipCosmetic(inventory: Inventory, cosmeticId: string): Inventory | null {
  if (!ownsCosmetic(inventory, cosmeticId)) {
    return null;
  }

  const { slot } = cosmeticById(cosmeticId);

  return inventory.equipped[slot] === cosmeticId
    ? inventory
    : { ...inventory, equipped: { ...inventory.equipped, [slot]: cosmeticId } };
}
