import type { CraftCatalog } from '../../content/craft-catalog';
import type { ItemDefinition } from '../../models/content.model';
import { CHEST_SIZE, type SlotContent } from './inventory';

/** Highest tier of each tool family, calculated from content rather than names. */
export function bestTools(catalog: CraftCatalog): readonly ItemDefinition[] {
  return catalog.items.filter(item => item.tool && !catalog.items.some(other =>
    other.tool?.type === item.tool!.type && other.tool.tier > item.tool!.tier,
  ));
}

/** Renewable supply chest: strongest tools, building materials, then useful equipment. */
export function infiniteSupplies(catalog: CraftCatalog): SlotContent[] {
  const tools = bestTools(catalog);
  // Decorations go last: when the chest runs out of room, they are the ones left out (every carpet included).
  const decorative = ['oak-leaves', 'wool', 'flower-red', 'flower-yellow', 'gold-block', 'iron-block', 'diamond-block', 'emerald-block'];
  const isDecorative = (item: ItemDefinition): boolean =>
    decorative.includes(item.id) || (item.places !== null && catalog.block(item.places).shape === 'carpet');
  const resources = catalog.items.filter(item => item.kind === 'material' || item.kind === 'block')
    .sort((a, b) => Number(isDecorative(a)) - Number(isDecorative(b)));
  const armor = [...catalog.items.filter(item => item.kind === 'armor')]
    .sort((a, b) => (b.durability ?? 0) - (a.durability ?? 0)).slice(0, 1);
  const equipment = catalog.items.filter(item => !item.tool && ['shield', 'ammo', 'bucket', 'weapon', 'vehicle', 'summon'].includes(item.kind));
  const seeds = catalog.items.filter(item => item.kind === 'seed');
  const foods = [...catalog.items.filter(item => item.heal !== null)].sort((a, b) => (b.heal ?? 0) - (a.heal ?? 0));
  const items = [...tools, ...armor, ...equipment, ...seeds, ...foods.slice(0, 1), ...resources];
  return Array.from({ length: CHEST_SIZE }, (_, index) => {
    const item = items[index];
    return item ? { item: item.id, count: item.maxStack, durability: item.durability } : null;
  });
}
