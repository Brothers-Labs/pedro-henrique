import type { ContentFile, CraftContent } from '../models/content.model';
import { assertContentIntegrity } from './content-integrity';
import { parseBlocks } from './parsers/parse-blocks';
import { parseCreatures } from './parsers/parse-creatures';
import { parseCrops } from './parsers/parse-crops';
import { parseItems } from './parsers/parse-items';
import { parseGoals, parseLootTables } from './parsers/parse-loot-and-goals';
import { parseRecipes } from './parsers/parse-recipes';
import { parseWorld } from './parsers/parse-world';

/** Os oito JSON como chegaram, antes de qualquer validação. */
export type RawContentFiles = Readonly<Record<ContentFile, unknown>>;

/**
 * Valida os oito arquivos e confere as referências entre eles.
 *
 * É a única porta entre o JSON e o jogo: tanto os arquivos estáticos de hoje
 * quanto a resposta de um servidor amanhã passam por aqui.
 */
export function parseCraftContent(files: RawContentFiles): CraftContent {
  const content: CraftContent = {
    blocks: parseBlocks(files.blocks),
    items: parseItems(files.items),
    recipes: parseRecipes(files.recipes),
    creatures: parseCreatures(files.creatures),
    crops: parseCrops(files.crops),
    world: parseWorld(files.world),
    lootTables: parseLootTables(files['loot-tables']),
    goals: parseGoals(files.goals),
  };

  assertContentIntegrity(content);

  return content;
}
