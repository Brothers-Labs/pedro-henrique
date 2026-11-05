import type { ContentFile, CraftContent, GoalDefinition } from '../models/content.model';

/** Id reservado para o vazio: nenhum bloco do JSON pode usá-lo. */
export const AIR_ID = 'air';

export interface IntegrityProblem {
  readonly file: ContentFile;
  readonly message: string;
}

/**
 * Referência quebrada entre arquivos de conteúdo.
 *
 * Junta todos os problemas de uma vez: quem edita o JSON corrige tudo numa
 * passada, em vez de descobrir um erro por carregamento.
 */
export class ContentIntegrityError extends Error {
  constructor(readonly problems: readonly IntegrityProblem[]) {
    super(`Conteúdo do PedroCraft com ${problems.length} referência(s) quebrada(s): ${problems.map(describe).join(' | ')}`);
    this.name = 'ContentIntegrityError';
  }
}

function describe(problem: IntegrityProblem): string {
  return `${problem.file}.json › ${problem.message}`;
}

/**
 * Confere que toda referência entre arquivos aponta para algo que existe.
 *
 * Os parsers garantem a forma de cada arquivo; aqui se garante que eles
 * conversam: a receita usa itens que existem, a plantação nasce num bloco que
 * existe, a missão aponta para uma criatura de verdade.
 */
export function findIntegrityProblems(content: CraftContent): readonly IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];
  const blocks = new Set(content.blocks.map((block) => block.id));
  const items = new Set(content.items.map((item) => item.id));
  const creatures = new Set(content.creatures.map((creature) => creature.id));
  const crops = new Set(content.crops.map((crop) => crop.id));
  const lootTables = new Set(content.lootTables.map((table) => table.id));

  const check = (file: ContentFile, owner: string, kind: string, id: string | null, known: ReadonlySet<string>): void => {
    if (id !== null && !known.has(id)) {
      problems.push({ file, message: `${owner}: ${kind} "${id}" não existe` });
    }
  };
  const block = (file: ContentFile, owner: string, id: string | null): void => check(file, owner, 'bloco', id, blocks);
  const item = (file: ContentFile, owner: string, id: string | null): void => check(file, owner, 'item', id, items);
  const loot = (file: ContentFile, owner: string, id: string | null): void =>
    check(file, owner, 'tabela de drop', id, lootTables);
  const creature = (file: ContentFile, owner: string, id: string | null): void => check(file, owner, 'criatura', id, creatures);

  for (const definition of content.blocks) {
    const owner = `bloco "${definition.id}"`;

    if (definition.id === AIR_ID) {
      problems.push({ file: 'blocks', message: `o id "${AIR_ID}" é reservado para o vazio` });
    }

    if (definition.shape === 'liquid' && definition.solid) {
      problems.push({ file: 'blocks', message: `${owner}: um líquido não pode ser sólido` });
    }

    loot('blocks', owner, definition.drops);
    block('blocks', owner, definition.toggleInto);
  }

  for (const definition of content.items) {
    const owner = `item "${definition.id}"`;

    block('items', owner, definition.icon.type === 'block' ? definition.icon.block : null);
    block('items', owner, definition.places);
    check('items', owner, 'plantação', definition.plants, crops);
    item('items', owner, definition.ranged?.ammo ?? null);
    item('items', owner, definition.leftover);
    block('items', owner, definition.bucket?.places ?? null);
    block('items', owner, definition.bucket?.collects ?? null);
    item('items', owner, definition.bucket?.becomes ?? null);
  }

  if (content.items.some((definition) => definition.vehicle) && !content.blocks.some((definition) => definition.shape === 'rail')) {
    problems.push({ file: 'items', message: 'existe trem, mas nenhum bloco de trilho (shape "rail") para ele andar' });
  }

  for (const recipe of content.recipes.crafting) {
    const owner = `receita "${recipe.id}"`;
    const ingredients = recipe.type === 'shaped' ? Object.values(recipe.key) : recipe.ingredients.map((entry) => entry.item);

    ingredients.forEach((ingredient) => item('recipes', owner, ingredient));
    item('recipes', owner, recipe.output.item);
  }

  for (const recipe of content.recipes.smelting) {
    item('recipes', `receita "${recipe.id}"`, recipe.input);
    item('recipes', `receita "${recipe.id}"`, recipe.output.item);
  }

  content.recipes.fuels.forEach((fuel) => item('recipes', 'combustível', fuel.item));

  for (const definition of content.creatures) {
    const owner = `criatura "${definition.id}"`;

    loot('creatures', owner, definition.drops);
    definition.spawn?.on.forEach((ground) => block('creatures', owner, ground));
    check('creatures', owner, 'criatura', definition.splitInto?.creature ?? null, creatures);
    item('creatures', owner, definition.lays?.item ?? null);
    item('creatures', owner, definition.breedsWith);

    if (definition.splitInto?.creature === definition.id) {
      problems.push({ file: 'creatures', message: `${owner}: não pode se dividir em si mesma` });
    }

    for (const interaction of definition.interactions) {
      item('creatures', owner, interaction.item);
      loot('creatures', owner, interaction.loot);
      item('creatures', owner, interaction.convertsItemTo);
    }
  }

  for (const crop of content.crops) {
    const owner = `plantação "${crop.id}"`;
    const seed = content.items.find((candidate) => candidate.id === crop.seed);

    block('crops', owner, crop.block);
    item('crops', owner, crop.seed);
    crop.soil.forEach((ground) => block('crops', owner, ground));

    if (seed && seed.plants !== crop.id) {
      problems.push({ file: 'crops', message: `${owner}: o item "${crop.seed}" precisa de "plants": "${crop.id}"` });
    }

    if (crop.mature.type === 'harvest') {
      loot('crops', owner, crop.mature.loot);
    } else {
      block('crops', owner, crop.mature.log);
      block('crops', owner, crop.mature.leaves);
    }
  }

  checkWorld(content, block, item, creature);

  for (const table of content.lootTables) {
    table.entries.forEach((entry) => item('loot-tables', `tabela "${table.id}"`, entry.item));
  }

  for (const goal of content.goals) {
    checkGoal(goal, { blocks, items, creatures, crops }, problems);
  }

  return problems;
}

/** Lança `ContentIntegrityError` quando houver qualquer referência quebrada. */
export function assertContentIntegrity(content: CraftContent): void {
  const problems = findIntegrityProblems(content);

  if (problems.length > 0) {
    throw new ContentIntegrityError(problems);
  }
}

type Checker = (file: ContentFile, owner: string, id: string | null) => void;

function checkWorld(content: CraftContent, block: Checker, item: Checker, creature: Checker): void {
  const world = content.world;
  const { decorations, ...named } = world.blocks;

  for (const [role, id] of Object.entries(named)) {
    block('world', `blocks.${role}`, id);
  }

  decorations.forEach((id) => block('world', 'blocks.decorations', id));
  world.quarry.ores.forEach((ore) => block('world', 'quarry.ores', ore.block));
  world.quarry.rareOres.forEach((ore) => block('world', 'quarry.rareOres', ore.block));
  block('world', 'calendar.greenhouseBlock', world.calendar.greenhouseBlock);
  creature('world', 'calendar.fullMoonVisitor', world.calendar.fullMoonVisitor);
  world.hero.startingInventory.forEach((entry) => item('world', 'hero.startingInventory', entry.item));

  for (const [symbol, id] of Object.entries(world.house.palette)) {
    block('world', `house.palette.${symbol}`, id);
  }
}

interface KnownIds {
  readonly blocks: ReadonlySet<string>;
  readonly items: ReadonlySet<string>;
  readonly creatures: ReadonlySet<string>;
  readonly crops: ReadonlySet<string>;
}

const GOAL_TARGETS = {
  obtain: { kind: 'item', set: 'items' },
  place: { kind: 'bloco', set: 'blocks' },
  harvest: { kind: 'plantação', set: 'crops' },
  defeat: { kind: 'criatura', set: 'creatures' },
} as const;

function checkGoal(goal: GoalDefinition, known: KnownIds, problems: IntegrityProblem[]): void {
  if (goal.trigger === 'sleep' || goal.target === null) {
    return;
  }

  const target = GOAL_TARGETS[goal.trigger];

  if (!known[target.set].has(goal.target)) {
    problems.push({ file: 'goals', message: `missão "${goal.id}": ${target.kind} "${goal.target}" não existe` });
  }
}
