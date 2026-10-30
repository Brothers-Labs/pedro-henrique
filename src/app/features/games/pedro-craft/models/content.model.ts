/**
 * Conteúdo do PedroCraft: tudo o que o jogo sabe sobre blocos, itens,
 * receitas, criaturas, plantações, o mundo, os drops e as missões.
 *
 * Estes tipos são o espelho dos JSON de `public/data/pedro-craft/` depois de
 * validados. O código de jogo só enxerga esta forma — nunca o JSON cru — e
 * referências entre arquivos são sempre ids de texto, nunca posições em lista.
 */

/** Versão dos arquivos de conteúdo que este código entende. */
export const CONTENT_SCHEMA_VERSION = 1;

export const CONTENT_FILES = [
  'blocks',
  'items',
  'recipes',
  'creatures',
  'crops',
  'world',
  'loot-tables',
  'goals',
] as const;

export type ContentFile = (typeof CONTENT_FILES)[number];

/* Texturas ------------------------------------------------------------------------ */

export const TEXTURE_PATTERNS = [
  'speckle',
  'cobble',
  'grass-side',
  'planks',
  'log-side',
  'log-top',
  'leaves',
  'ore',
  'bricks',
  'glass',
  'farmland',
  'water',
  'plant',
  'crop',
  'torch',
  'panel',
] as const;

export type TexturePattern = (typeof TEXTURE_PATTERNS)[number];

/** Variações de um padrão: o desenho do meio de um painel, o tipo de planta. */
export const TEXTURE_DETAILS = [
  'sapling',
  'flower',
  'grass',
  'grid',
  'oven',
  'latch',
  'pillow',
  'door',
  'door-open',
  'plain',
] as const;

export type TextureDetail = (typeof TEXTURE_DETAILS)[number];

/**
 * Receita de uma face de bloco: um padrão de pixels e as cores dele.
 *
 * É dado, e não desenho: um bloco novo pode nascer só no JSON, combinando um
 * padrão que o jogo já sabe pintar com cores novas.
 */
export interface TextureSpec {
  readonly pattern: TexturePattern;
  /** Pelo menos uma cor; o que cada posição significa depende do padrão. */
  readonly colors: readonly string[];
  readonly detail: TextureDetail | null;
}

/* Blocos ---------------------------------------------------------------------------- */

export const BLOCK_SHAPES = ['cube', 'cross', 'liquid', 'torch', 'fence', 'slab'] as const;

export type BlockShape = (typeof BLOCK_SHAPES)[number];

export const TOOL_TYPES = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword', 'shears'] as const;

export type ToolType = (typeof TOOL_TYPES)[number];

export const BLOCK_INTERACTIONS = ['workbench', 'furnace', 'chest', 'bed'] as const;

export type BlockInteraction = (typeof BLOCK_INTERACTIONS)[number];

export interface BlockFaces {
  readonly top: TextureSpec;
  readonly side: TextureSpec;
  readonly bottom: TextureSpec;
}

export interface BlockDefinition {
  readonly id: string;
  readonly name: string;
  readonly shape: BlockShape;
  /** Sólido: o herói e as criaturas não atravessam. */
  readonly solid: boolean;
  /** Tem partes vazadas (folhas, vidro, plantas): é desenhado depois e não esconde vizinhos. */
  readonly transparent: boolean;
  /** Segundos para quebrar com a mão; `null` quando o bloco não quebra (rocha-mãe, água). */
  readonly hardness: number | null;
  /** Ferramenta que acelera a quebra; `null` quando nenhuma ajuda. */
  readonly tool: ToolType | null;
  /** Nível mínimo de ferramenta para o bloco dar item; 0 dispensa ferramenta. */
  readonly minTier: number;
  /** Tabela de drop ao quebrar; `null` quando não dá nada. */
  readonly drops: string | null;
  /** Brilho emitido, de 0 a 15. */
  readonly light: number;
  /** Altura da caixa de colisão, em blocos: a cerca passa de 1 para ninguém pular. */
  readonly collisionHeight: number;
  /** Pode ser ocupado por outro bloco colocado em cima (capim, água). */
  readonly replaceable: boolean;
  /** Ocupa duas células na vertical (a porta): colocar, quebrar e abrir vale para as duas. */
  readonly pairsVertically: boolean;
  /** Bloco que este vira ao ser usado (porta fechada ↔ aberta). */
  readonly toggleInto: string | null;
  readonly interaction: BlockInteraction | null;
  /** Cor no mapa visto de cima, usado na miniatura do mundo. */
  readonly mapColor: string;
  readonly textures: BlockFaces;
}

/* Itens ------------------------------------------------------------------------------- */

/** `armor` protege da mochila mesmo, gastando um uso por golpe; `shield` na mão segura as flechas. */
export const ITEM_KINDS = ['block', 'tool', 'weapon', 'food', 'material', 'seed', 'bucket', 'ammo', 'armor', 'shield'] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

export const ICON_SHAPES = [
  'pickaxe',
  'axe',
  'shovel',
  'hoe',
  'sword',
  'bow',
  'arrow',
  'bucket',
  'shears',
  'apple',
  'bread',
  'carrot',
  'wheat',
  'seeds',
  'stick',
  'lump',
  'ingot',
  'egg',
  'fried-egg',
  'feather',
  'string',
  'potato',
  'beetroot',
  'bowl',
  'pumpkin',
  'pie',
  'melon-slice',
  'cake',
  'bone',
  'powder',
  'cane',
  'armor',
  'shield',
  'crown',
] as const;

export type IconShape = (typeof ICON_SHAPES)[number];

/** Ícone de um item: o próprio bloco em miniatura, ou um desenho com cores. */
export type ItemIcon =
  | { readonly type: 'block'; readonly block: string }
  | { readonly type: 'sprite'; readonly shape: IconShape; readonly colors: readonly string[] };

export interface ToolStats {
  readonly type: ToolType;
  /** 1 madeira, 2 pedra, 3 ferro, 4 ouro. */
  readonly tier: number;
  /** Quantas vezes mais rápido que a mão nos blocos da ferramenta. */
  readonly speed: number;
}

export interface RangedStats {
  /** Item gasto a cada disparo. */
  readonly ammo: string;
  readonly damage: number;
  /** Blocos por segundo. */
  readonly speed: number;
}

export interface BucketStats {
  /** Bloco que o balde coloca ao ser esvaziado; `null` no balde vazio. */
  readonly places: string | null;
  /** Bloco que o balde vazio recolhe; `null` no balde cheio. */
  readonly collects: string | null;
  /** Item em que o balde se transforma depois de usado. */
  readonly becomes: string;
}

export interface ItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  readonly maxStack: number;
  readonly icon: ItemIcon;
  /** Bloco colocado ao usar o item no mundo. */
  readonly places: string | null;
  /** Plantação semeada ao usar o item no solo certo. */
  readonly plants: string | null;
  readonly tool: ToolStats | null;
  /** Usos até quebrar; `null` para itens que não gastam. */
  readonly durability: number | null;
  /** Dano de um golpe com o item na mão. */
  readonly damage: number;
  readonly attackCooldownMs: number;
  readonly knockback: number;
  readonly ranged: RangedStats | null;
  /** Corações recuperados ao comer; `null` para o que não se come. */
  readonly heal: number | null;
  /** Item devolvido depois de comer (o balde do leite). */
  readonly leftover: string | null;
  readonly bucket: BucketStats | null;
  /** Estágios que o adubo faz uma planta crescer de uma vez; `null` para o que não aduba. */
  readonly fertilizer: number | null;
}

/* Receitas ---------------------------------------------------------------------------- */

/** Onde a receita pode ser feita: na grade 2 × 2 do inventário ou na mesa 3 × 3. */
export type CraftingStation = 'hand' | 'workbench';

export interface ItemAmount {
  readonly item: string;
  readonly count: number;
}

export interface ShapedRecipe {
  readonly id: string;
  readonly type: 'shaped';
  readonly station: CraftingStation;
  /** Linhas da grade; espaço é casa vazia. */
  readonly pattern: readonly string[];
  /** O item de cada letra do desenho. */
  readonly key: Readonly<Record<string, string>>;
  readonly output: ItemAmount;
}

export interface ShapelessRecipe {
  readonly id: string;
  readonly type: 'shapeless';
  readonly station: CraftingStation;
  readonly ingredients: readonly ItemAmount[];
  readonly output: ItemAmount;
}

export type CraftingRecipe = ShapedRecipe | ShapelessRecipe;

export interface SmeltingRecipe {
  readonly id: string;
  readonly input: string;
  readonly output: ItemAmount;
  readonly timeMs: number;
}

export interface FuelDefinition {
  readonly item: string;
  readonly burnMs: number;
}

export interface RecipeBook {
  readonly crafting: readonly CraftingRecipe[];
  readonly smelting: readonly SmeltingRecipe[];
  readonly fuels: readonly FuelDefinition[];
}

/* Criaturas --------------------------------------------------------------------------- */

export const CREATURE_BEHAVIORS = ['grazer', 'chaser', 'hopper', 'archer'] as const;

export type CreatureBehavior = (typeof CREATURE_BEHAVIORS)[number];

export const CREATURE_MODELS = ['chicken', 'cow', 'sheep', 'slime', 'king-slime', 'scarecrow', 'spider', 'skeleton'] as const;

export type CreatureModel = (typeof CREATURE_MODELS)[number];

export type Temperament = 'passive' | 'hostile';

export type SpawnPeriod = 'day' | 'night';

export interface CreatureSpawn {
  readonly period: SpawnPeriod;
  /** Blocos de chão onde a criatura pode nascer. */
  readonly on: readonly string[];
  readonly groupMin: number;
  readonly groupMax: number;
  /** Peso no sorteio entre as criaturas do mesmo período. */
  readonly weight: number;
}

/** O que acontece ao usar um item numa criatura: tesoura na ovelha, balde na vaca. */
export interface CreatureInteraction {
  readonly item: string;
  /** Drop ganho; `null` quando o ganho é só a troca do item. */
  readonly loot: string | null;
  /** Item da mão trocado por outro (balde vazio vira balde de leite). */
  readonly convertsItemTo: string | null;
  /** Espera até poder repetir (a lã crescer de novo). */
  readonly cooldownMs: number;
}

export interface CreatureDefinition {
  readonly id: string;
  readonly name: string;
  readonly temperament: Temperament;
  readonly health: number;
  /** Blocos por segundo andando. */
  readonly speed: number;
  /** Corações tirados por ataque. */
  readonly damage: number;
  readonly attackCooldownMs: number;
  readonly behavior: CreatureBehavior;
  readonly model: CreatureModel;
  readonly colors: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly drops: string | null;
  /** `null` para criaturas que só nascem de outras (o slime pequeno). */
  readonly spawn: CreatureSpawn | null;
  /** Ao ser derrotada, vira outras criaturas (o slime que se divide). */
  readonly splitInto: { readonly creature: string; readonly count: number } | null;
  readonly interactions: readonly CreatureInteraction[];
  /** Item que a criatura deixa no chão de tempos em tempos (o ovo da galinha). */
  readonly lays: { readonly item: string; readonly everyMs: number } | null;
  /** Comida que faz o animal querer ter filhote; `null` para quem não tem. */
  readonly breedsWith: string | null;
  /** Quanto o filhote leva para crescer. */
  readonly babyGrowMs: number;
}

/* Plantações -------------------------------------------------------------------------- */

export type CropMaturity =
  | { readonly type: 'harvest'; readonly loot: string }
  | {
      readonly type: 'tree';
      readonly log: string;
      readonly leaves: string;
      readonly minHeight: number;
      readonly maxHeight: number;
    };

export interface CropDefinition {
  readonly id: string;
  readonly name: string;
  /** Bloco que representa a planta no mundo. */
  readonly block: string;
  /** Item que planta. */
  readonly seed: string;
  readonly stages: number;
  readonly stageMs: number;
  /** Multiplicador da velocidade com água a até 4 blocos. */
  readonly wateredSpeedup: number;
  /** Blocos em que a semente pode ser plantada. */
  readonly soil: readonly string[];
  readonly mature: CropMaturity;
}

/* Mundo ------------------------------------------------------------------------------- */

export interface OreVein {
  readonly block: string;
  /** Chance de cada bloco de pedra da pedreira virar este minério. */
  readonly chance: number;
  /** Altura máxima em que aparece. */
  readonly maxY: number;
}

/** Construção desenhada em camadas, do chão para cima; cada letra é um bloco. */
export interface StructureTemplate {
  readonly palette: Readonly<Record<string, string>>;
  /** `layers[y][z]` é uma linha de letras ao longo de x; `.` é ar. */
  readonly layers: readonly (readonly string[])[];
}

export interface WorldBlocks {
  readonly surface: string;
  readonly soil: string;
  readonly stone: string;
  readonly sand: string;
  readonly gravel: string;
  /** A nascente: a água do lago, do riacho e do balde. */
  readonly water: string;
  /** Água que escorreu de uma nascente; nasce e some sozinha, sem ir para o save. */
  readonly flowingWater: string;
  readonly bedrock: string;
  readonly log: string;
  readonly leaves: string;
  /** O que a enxada faz da grama e da terra. */
  readonly farmland: string;
  readonly decorations: readonly string[];
}

/** Uma estação do ano: duração do dia, crescimento das plantas, clima e cores do mundo. */
export interface SeasonDefinition {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  /** O aviso quando a estação chega. */
  readonly arrival: string;
  /** Multiplica o dia e a noite do relógio: o verão tem dias longos, o inverno noites longas. */
  readonly dayScale: number;
  readonly nightScale: number;
  /** Multiplica o crescimento das plantas; 0 é planta parada (fora da estufa). */
  readonly growth: number;
  /** Chance, a cada manhã, de chover e de nevar. */
  readonly rain: number;
  readonly snow: number;
  /** Troca de cores no mundo: a cor de antes e a da estação (a grama branca de neve). */
  readonly palette: Readonly<Record<string, string>>;
}

export interface CalendarDefinition {
  readonly daysPerSeason: number;
  /** Bloco de telhado que protege as plantas do inverno (a estufa). */
  readonly greenhouseBlock: string;
  /** A cada quantas noites tem lua cheia. */
  readonly fullMoonEvery: number;
  /** Quem aparece na lua cheia (o Rei Slime); `null` para ninguém. */
  readonly fullMoonVisitor: string | null;
  /** Em ordem: o ano começa na primeira. */
  readonly seasons: readonly SeasonDefinition[];
}

export interface WorldDefinition {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly chunkSize: number;
  readonly seaLevel: number;
  readonly blocks: WorldBlocks;
  readonly terrain: {
    readonly baseHeight: number;
    readonly hillAmplitude: number;
    readonly hillScale: number;
    /** Faixa da borda que afunda até virar água: o limite natural do mundo. */
    readonly edgeWidth: number;
  };
  readonly lake: { readonly radius: number; readonly depth: number };
  readonly river: { readonly width: number; readonly meander: number };
  readonly forest: { readonly radius: number; readonly treeChance: number };
  readonly quarry: { readonly radius: number; readonly height: number; readonly ores: readonly OreVein[] };
  readonly farm: { readonly radius: number };
  readonly tree: { readonly minHeight: number; readonly maxHeight: number };
  readonly decorationChance: number;
  readonly house: StructureTemplate;
  readonly clock: { readonly dayMs: number; readonly nightMs: number };
  readonly calendar: CalendarDefinition;
  readonly water: { readonly maxSpread: number; readonly tickMs: number };
  readonly creatures: {
    readonly passiveCap: number;
    readonly hostileCap: number;
    readonly spawnIntervalMs: number;
    readonly minSpawnDistance: number;
    readonly maxSpawnDistance: number;
    /** Raio em volta de uma tocha onde inimigo nenhum nasce. */
    readonly torchSafeRadius: number;
  };
  readonly hero: {
    readonly maxHealth: number;
    readonly regenEveryMs: number;
    readonly reach: number;
    readonly invulnerableMs: number;
    /** Energia do modo Sobrevivência gentil. */
    readonly energy: { readonly max: number; readonly drainEveryMs: number; readonly lowAt: number };
    readonly startingInventory: readonly ItemAmount[];
  };
}

/* Drops e missões --------------------------------------------------------------------- */

export interface LootEntry {
  readonly item: string;
  readonly min: number;
  readonly max: number;
  /** De 0 a 1. */
  readonly chance: number;
}

export interface LootTable {
  readonly id: string;
  readonly entries: readonly LootEntry[];
}

export const GOAL_TRIGGERS = ['obtain', 'place', 'harvest', 'defeat', 'sleep'] as const;

export type GoalTriggerType = (typeof GOAL_TRIGGERS)[number];

export interface GoalDefinition {
  readonly id: string;
  readonly title: string;
  readonly emoji: string;
  readonly hint: string;
  readonly trigger: GoalTriggerType;
  /** Item, bloco, plantação ou criatura do gatilho; `null` em "dormir". */
  readonly target: string | null;
  readonly count: number;
}

/* Tudo junto -------------------------------------------------------------------------- */

export interface CraftContent {
  readonly blocks: readonly BlockDefinition[];
  readonly items: readonly ItemDefinition[];
  readonly recipes: RecipeBook;
  readonly creatures: readonly CreatureDefinition[];
  readonly crops: readonly CropDefinition[];
  readonly world: WorldDefinition;
  readonly lootTables: readonly LootTable[];
  readonly goals: readonly GoalDefinition[];
}
