import type { CraftCatalog } from '../content/craft-catalog';
import { recipeRequirements } from '../engine/simulation/crafting';
import type { CraftingStation, CreatureInteraction, ItemAmount, ItemDefinition, ToolType } from '../models/content.model';

/**
 * A parte da ajuda que se escreve sozinha, a partir do conteúdo.
 *
 * Receitas, fornalha e a lista de itens saem dos mesmos JSON que o jogo lê:
 * um item novo no conteúdo já aparece na ajuda, com figura, para que serve e
 * como conseguir.
 */

const LIST = new Intl.ListFormat('pt-BR', { type: 'conjunction' });
const ALTERNATIVES = new Intl.ListFormat('pt-BR', { type: 'disjunction' });

/** Quantos usos de um material a ajuda cita; mais que isso vira "e outras coisas". */
const MAX_USES_LISTED = 4;

const TOOL_PURPOSE: Readonly<Record<ToolType, string>> = {
  pickaxe: 'Quebra pedra, minério e tijolos.',
  axe: 'Quebra troncos e tábuas bem rápido.',
  shovel: 'Cava terra, areia e cascalho.',
  hoe: 'Transforma grama e terra em terra arada, para plantar.',
  sword: 'Defende você dos inimigos da noite.',
  shears: 'Tira a lã da ovelha e pega folhas inteiras.',
};

const STATION_NAMES: Readonly<Record<CraftingStation, string>> = {
  hand: 'Mochila',
  workbench: 'Mesa de trabalho',
};

export interface RecipeHelp {
  readonly id: string;
  readonly output: ItemAmount;
  readonly ingredients: readonly ItemAmount[];
  readonly station: string;
}

export interface SmeltingHelp {
  readonly id: string;
  readonly input: string;
  readonly output: ItemAmount;
  readonly seconds: number;
}

export interface ItemHelp {
  readonly id: string;
  readonly name: string;
  /** Para que serve, em uma ou duas frases. */
  readonly use: string;
  /** Como conseguir; vazio quando o item só vem da mochila inicial. */
  readonly obtain: string;
}

export function recipeHelp(catalog: CraftCatalog): readonly RecipeHelp[] {
  return catalog.craftingRecipes.map((recipe) => ({
    id: recipe.id,
    output: recipe.output,
    ingredients: recipeRequirements(recipe),
    station: STATION_NAMES[recipe.station],
  }));
}

export function smeltingHelp(catalog: CraftCatalog): readonly SmeltingHelp[] {
  return catalog.content.recipes.smelting.map((recipe) => ({
    id: recipe.id,
    input: recipe.input,
    output: recipe.output,
    seconds: Math.round(recipe.timeMs / 1000),
  }));
}

export function itemHelp(catalog: CraftCatalog): readonly ItemHelp[] {
  return catalog.items.map((item) => ({ id: item.id, name: item.name, use: describeUse(item, catalog), obtain: describeObtain(item, catalog) }));
}

function describeUse(item: ItemDefinition, catalog: CraftCatalog): string {
  const sentences = [kindSentence(item, catalog), ...creatureUses(item, catalog)];
  const smelting = catalog.smeltingFor(item.id);
  const usedIn = catalog.craftingRecipes
    .filter((recipe) => recipe.output.item !== item.id && recipeRequirements(recipe).some((entry) => entry.item === item.id))
    .map((recipe) => catalog.item(recipe.output.item).name.toLowerCase());
  const uniqueUses = [...new Set(usedIn)];

  if (smelting) {
    sentences.push(`Na fornalha, vira ${catalog.item(smelting.output.item).name.toLowerCase()}.`);
  }

  if (catalog.fuelFor(item.id)) {
    sentences.push('Serve de combustível na fornalha.');
  }

  if (uniqueUses.length > 0) {
    const listed = uniqueUses.slice(0, MAX_USES_LISTED);
    const extra = uniqueUses.length > MAX_USES_LISTED ? [...listed, 'outras coisas'] : listed;

    sentences.push(`Serve para fazer ${LIST.format(extra)}.`);
  }

  return sentences.filter((sentence) => sentence.length > 0).join(' ');
}

function kindSentence(item: ItemDefinition, catalog: CraftCatalog): string {
  if (item.heal !== null) {
    const leftover = item.leftover ? ` Depois, sobra ${catalog.item(item.leftover).name.toLowerCase()}.` : '';

    return `Comida: recupera ${item.heal} ${item.heal === 1 ? 'coração' : 'corações'}.${leftover}`;
  }

  if (item.ranged) {
    return `Atira de longe. Precisa de ${catalog.item(item.ranged.ammo).name.toLowerCase()} na mochila.`;
  }

  if (item.tool) {
    return `${TOOL_PURPOSE[item.tool.type]}${usesSentence(item)}`;
  }

  if (item.bucket?.collects) {
    return `Pega ${catalog.block(item.bucket.collects).name.toLowerCase()} parada do lago ou do riacho.`;
  }

  if (item.bucket?.places) {
    return `Despeja ${catalog.block(item.bucket.places).name.toLowerCase()} onde você quiser.`;
  }

  if (item.vehicle) {
    return 'Use em cima de um trilho para passear. Pule para descer.';
  }

  if (item.summons) {
    return 'Use no chão para chamar um amigo que enfrenta os monstros com você.';
  }

  if (item.plants) {
    const crop = catalog.crop(item.plants);
    const soils = ALTERNATIVES.format(crop.soil.map((soil) => catalog.block(soil).name.toLowerCase()));

    return `Planta ${crop.name.toLowerCase()}: use em ${soils}.`;
  }

  if (item.places) {
    return blockSentence(item.places, catalog);
  }

  const lights = catalog.content.blocks.filter((block) => block.explosive?.igniters.includes(item.id)).map((block) => block.name);

  if (lights.length > 0) {
    return `Acende o pavio de ${LIST.format(lights)}.${usesSentence(item)}`;
  }

  return item.kind === 'ammo' ? 'Munição do arco.' : 'Material para fabricar.';
}

/** " Aguenta 64 usos.", com o espaço da frase anterior; vazio para o que não gasta. */
function usesSentence(item: ItemDefinition): string {
  return item.durability ? ` Aguenta ${item.durability} usos.` : '';
}

/** "Use em ovelha para ganhar lã": o que o item faz nos bichos, direto das interações do conteúdo. */
function creatureUses(item: ItemDefinition, catalog: CraftCatalog): readonly string[] {
  return catalog.creatures.flatMap((creature) =>
    creature.interactions
      .filter((interaction) => interaction.item === item.id)
      .map((interaction) => `Use em ${creature.name.toLowerCase()} para ganhar ${gainsOf(interaction, catalog)}.`),
  );
}

function gainsOf(interaction: CreatureInteraction, catalog: CraftCatalog): string {
  if (interaction.convertsItemTo) {
    return catalog.item(interaction.convertsItemTo).name.toLowerCase();
  }

  const loot = interaction.loot ? catalog.lootTable(interaction.loot).entries : [];

  return LIST.format(loot.map((entry) => catalog.item(entry.item).name.toLowerCase()));
}

function blockSentence(blockId: string, catalog: CraftCatalog): string {
  const block = catalog.block(blockId);

  switch (block.interaction) {
    case 'workbench':
      return 'Coloque no chão e use para abrir a grade grande de fabricar.';
    case 'furnace':
      return 'Coloque no chão e use para assar e derreter coisas.';
    case 'chest':
      return 'Coloque no chão e use para guardar até 27 coisas.';
    case 'bed':
      return 'Use de dia para virar a sua casa; use de noite para dormir até de manhã.';
    default:
      break;
  }

  if (block.light > 0) {
    return 'Ilumina a noite e espanta os inimigos.';
  }

  if (block.shape === 'carpet') {
    return 'Enfeita o chão: coloque em cima de um bloco firme e ande por cima.';
  }

  if (block.explosive) {
    const igniters = ALTERNATIVES.format(block.explosive.igniters.map((igniter) => catalog.item(igniter).name.toLowerCase()));

    return `Coloque no chão e, para acender, use nela o item ${igniters}. Depois, corra para longe!`;
  }

  if (block.blastResistant) {
    return 'Bloco para construir que aguenta explosão.';
  }

  return block.toggleInto ? 'Coloque e use para abrir e fechar.' : 'Bloco para construir.';
}

/** De onde o item vem: receita, fornalha, blocos, plantações e bichos. */
function describeObtain(item: ItemDefinition, catalog: CraftCatalog): string {
  const { content } = catalog;
  const tables = new Set(content.lootTables.filter((table) => table.entries.some((entry) => entry.item === item.id)).map((table) => table.id));
  const ways: string[] = [];

  if (catalog.craftingRecipes.some((recipe) => recipe.output.item === item.id)) {
    ways.push('fabricando (veja as Receitas)');
  }

  const smelted = content.recipes.smelting.filter((recipe) => recipe.output.item === item.id);

  if (smelted.length > 0) {
    ways.push(`assando ${ALTERNATIVES.format(smelted.map((recipe) => catalog.item(recipe.input).name.toLowerCase()))} na fornalha`);
  }

  const blocks = content.blocks.filter((block) => block.drops !== null && tables.has(block.drops));

  if (blocks.length > 0) {
    ways.push(`quebrando ${ALTERNATIVES.format([...new Set(blocks.map((block) => block.name.toLowerCase()))])}`);
  }

  // A tesoura colhe o próprio bloco (folhas, lã), como em `BlockActions.dropFrom`.
  const sheared = content.blocks.filter((block) => block.tool === 'shears' && block.id === item.places && !blocks.includes(block));

  if (sheared.length > 0) {
    ways.push(`quebrando ${ALTERNATIVES.format(sheared.map((block) => block.name.toLowerCase()))} com a tesoura`);
  }

  const crops = content.crops.filter((crop) => crop.mature.type === 'harvest' && tables.has(crop.mature.loot));

  if (crops.length > 0) {
    ways.push(`colhendo ${ALTERNATIVES.format(crops.map((crop) => crop.name.toLowerCase()))}`);
  }

  const creatures = content.creatures.filter(
    (creature) =>
      (creature.drops !== null && tables.has(creature.drops)) ||
      creature.interactions.some((interaction) => (interaction.loot !== null && tables.has(interaction.loot)) || interaction.convertsItemTo === item.id) ||
      creature.lays?.item === item.id,
  );

  if (creatures.length > 0) {
    ways.push(`com ${ALTERNATIVES.format(creatures.map((creature) => creature.name.toLowerCase()))}`);
  }

  const buckets = catalog.items.filter((bucket) => bucket.bucket?.collects && bucket.bucket.becomes === item.id);

  if (buckets.length > 0) {
    ways.push(`usando ${ALTERNATIVES.format(buckets.map((bucket) => bucket.name.toLowerCase()))} na água parada`);
  }

  return ways.length > 0 ? `Consiga ${ALTERNATIVES.format(ways)}.` : '';
}
