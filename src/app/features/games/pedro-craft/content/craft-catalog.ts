import type {
  BlockDefinition,
  CraftContent,
  CraftingRecipe,
  CreatureDefinition,
  CropDefinition,
  FuelDefinition,
  GoalDefinition,
  ItemDefinition,
  LootTable,
  SmeltingRecipe,
  WorldDefinition,
} from '../models/content.model';

/** Número interno do vazio no mundo. */
export const AIR = 0;

/** O mundo guarda blocos em `Uint8Array`: cabem 255 tipos além do ar. */
const MAX_BLOCK_TYPES = 255;

/**
 * Conteúdo pronto para consulta rápida durante o jogo.
 *
 * O motor pergunta "que bloco é o número 7?" milhares de vezes por segundo;
 * aqui as listas do JSON viram mapas e os ids de bloco ganham números
 * internos. Esses números nascem na carga e nunca saem do motor: o save usa
 * sempre o id de texto, então reordenar o JSON não estraga mundo nenhum.
 */
export class CraftCatalog {
  readonly world: WorldDefinition;
  readonly goals: readonly GoalDefinition[];
  readonly craftingRecipes: readonly CraftingRecipe[];
  readonly items: readonly ItemDefinition[];
  readonly creatures: readonly CreatureDefinition[];

  /** Posição = número interno do bloco; a posição 0 é o ar. */
  private readonly blocksByNumber: readonly (BlockDefinition | null)[];
  private readonly blockNumbers: ReadonlyMap<string, number>;
  private readonly itemsById: ReadonlyMap<string, ItemDefinition>;
  private readonly creaturesById: ReadonlyMap<string, CreatureDefinition>;
  private readonly cropsById: ReadonlyMap<string, CropDefinition>;
  private readonly cropsByBlock: ReadonlyMap<string, CropDefinition>;
  private readonly lootById: ReadonlyMap<string, LootTable>;
  private readonly smeltingByInput: ReadonlyMap<string, SmeltingRecipe>;
  private readonly fuelsByItem: ReadonlyMap<string, FuelDefinition>;

  constructor(readonly content: CraftContent) {
    if (content.blocks.length > MAX_BLOCK_TYPES) {
      throw new Error(`O PedroCraft aceita até ${MAX_BLOCK_TYPES} blocos; o conteúdo tem ${content.blocks.length}.`);
    }

    this.world = content.world;
    this.goals = content.goals;
    this.craftingRecipes = content.recipes.crafting;
    this.items = content.items;
    this.creatures = content.creatures;
    this.blocksByNumber = [null, ...content.blocks];
    this.blockNumbers = new Map(content.blocks.map((block, index) => [block.id, index + 1]));
    this.itemsById = byId(content.items);
    this.creaturesById = byId(content.creatures);
    this.cropsById = byId(content.crops);
    this.cropsByBlock = new Map(content.crops.map((crop) => [crop.block, crop]));
    this.lootById = byId(content.lootTables);
    this.smeltingByInput = new Map(content.recipes.smelting.map((recipe) => [recipe.input, recipe]));
    this.fuelsByItem = new Map(content.recipes.fuels.map((fuel) => [fuel.item, fuel]));
  }

  get blockCount(): number {
    return this.blocksByNumber.length;
  }

  /** Número interno de um bloco. Falha alto: id desconhecido aqui é erro de programação. */
  blockNumber(id: string): number {
    const number = this.blockNumbers.get(id);

    if (number === undefined) {
      throw new Error(`Bloco "${id}" não existe no conteúdo do PedroCraft.`);
    }

    return number;
  }

  /** Número interno de um bloco vindo de fora (save): `null` quando não existe mais. */
  findBlockNumber(id: string): number | null {
    return this.blockNumbers.get(id) ?? null;
  }

  /** Bloco de um número interno; `null` para o ar. */
  blockAt(number: number): BlockDefinition | null {
    return this.blocksByNumber[number] ?? null;
  }

  block(id: string): BlockDefinition {
    return this.content.blocks[this.blockNumber(id) - 1];
  }

  hasItem(id: string): boolean {
    return this.itemsById.has(id);
  }

  item(id: string): ItemDefinition {
    return required(this.itemsById, id, 'Item');
  }

  creature(id: string): CreatureDefinition {
    return required(this.creaturesById, id, 'Criatura');
  }

  hasCreature(id: string): boolean {
    return this.creaturesById.has(id);
  }

  crop(id: string): CropDefinition {
    return required(this.cropsById, id, 'Plantação');
  }

  /** Plantação representada por um bloco do mundo; `null` se o bloco não é planta. */
  cropForBlock(blockId: string): CropDefinition | null {
    return this.cropsByBlock.get(blockId) ?? null;
  }

  lootTable(id: string): LootTable {
    return required(this.lootById, id, 'Tabela de drop');
  }

  smeltingFor(itemId: string): SmeltingRecipe | null {
    return this.smeltingByInput.get(itemId) ?? null;
  }

  fuelFor(itemId: string): FuelDefinition | null {
    return this.fuelsByItem.get(itemId) ?? null;
  }
}

function byId<TEntry extends { readonly id: string }>(entries: readonly TEntry[]): ReadonlyMap<string, TEntry> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function required<TEntry>(map: ReadonlyMap<string, TEntry>, id: string, label: string): TEntry {
  const entry = map.get(id);

  if (!entry) {
    throw new Error(`${label} "${id}" não existe no conteúdo do PedroCraft.`);
  }

  return entry;
}
