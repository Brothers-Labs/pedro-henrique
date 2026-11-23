import type { CraftCatalog } from '../../content/craft-catalog';
import type { ItemDefinition } from '../../models/content.model';
import { recipeRequirements } from './crafting';
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
  const decorative = ['oak-leaves', 'wool', 'flower-red', 'flower-yellow', 'gold-block', 'iron-block', 'diamond-block', 'emerald-block', 'netherite-block'];
  const isDecorative = (item: ItemDefinition): boolean => {
    const shape = item.places === null ? null : catalog.block(item.places).shape;

    return decorative.includes(item.id) || shape === 'carpet' || shape === 'half';
  };
  const isExplosive = (itemId: string): boolean => {
    const places = catalog.item(itemId).places;

    return places !== null && catalog.block(places).explosive !== null;
  };
  // Giant explosives are crafted from the plain TNT already in the chest, so they also wait at the end.
  const isMadeOfExplosives = (item: ItemDefinition): boolean => catalog.content.recipes.crafting.some(recipe =>
    recipe.output.item === item.id && recipeRequirements(recipe).some(requirement => isExplosive(requirement.item)));
  const isOptional = (item: ItemDefinition): boolean => isDecorative(item) || isMadeOfExplosives(item);
  // Unbreakable blocks (bedrock) stay in the Creative backpack: only there can they be removed again.
  const isUnbreakable = (item: ItemDefinition): boolean => item.places !== null && catalog.block(item.places).hardness === null;
  const resources = catalog.items.filter(item => (item.kind === 'material' || item.kind === 'block') && !isUnbreakable(item))
    .sort((a, b) => Number(isOptional(a)) - Number(isOptional(b)));
  const armor = [...catalog.items.filter(item => item.kind === 'armor')]
    .sort((a, b) => (b.durability ?? 0) - (a.durability ?? 0)).slice(0, 1);
  // Only a guardian may be summoned outside Creative: the other summon items stay in the Creative backpack.
  const isGuardianSummon = (item: ItemDefinition): boolean =>
    item.summons !== null && catalog.creature(item.summons).temperament === 'guardian';
  const equipment = catalog.items.filter(item => !item.tool && (['shield', 'ammo', 'bucket', 'weapon', 'vehicle'].includes(item.kind) || isGuardianSummon(item)));
  const seeds = catalog.items.filter(item => item.kind === 'seed');
  const foods = [...catalog.items.filter(item => item.heal !== null)].sort((a, b) => (b.heal ?? 0) - (a.heal ?? 0));
  const items = [...tools, ...armor, ...equipment, ...seeds, ...foods.slice(0, 1), ...resources];
  return Array.from({ length: CHEST_SIZE }, (_, index) => {
    const item = items[index];
    return item ? { item: item.id, count: item.maxStack, durability: item.durability } : null;
  });
}
