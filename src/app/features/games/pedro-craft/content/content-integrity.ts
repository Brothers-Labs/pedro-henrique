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

    // Sólido, o tapete ganharia uma caixa de colisão de pelo menos 0,1 bloco: um degrau onde a criança só vê chão.
    if (definition.shape === 'carpet' && definition.solid) {
      problems.push({ file: 'blocks', message: `${owner}: um tapete não pode ser sólido, o herói anda por cima dele` });
    }

    // O desenho do meio bloco tem meia altura: a colisão precisa bater, senão o herói flutua ou afunda nele.
    if (definition.shape === 'half' && (!definition.solid || definition.collisionHeight !== 0.5)) {
      problems.push({ file: 'blocks', message: `${owner}: um meio bloco precisa ser sólido e ter collisionHeight 0.5` });
    }

    // A explosão acende a TNT vizinha em vez de quebrá-la: uma TNT que aguenta explosão nunca entraria na reação em cadeia.
    if (definition.explosive && definition.blastResistant) {
      problems.push({ file: 'blocks', message: `${owner}: um bloco que estoura não pode aguentar explosão` });
    }

    loot('blocks', owner, definition.drops);
    block('blocks', owner, definition.toggleInto);
    definition.explosive?.igniters.forEach((igniter) => item('blocks', owner, igniter));
    block('blocks', owner, definition.portal?.frame ?? null);
    definition.portal?.igniters.forEach((igniter) => item('blocks', owner, igniter));

    // O herói precisa entrar no portal para viajar: sólido, ele bateria de cara.
    if (definition.portal && definition.solid) {
      problems.push({ file: 'blocks', message: `${owner}: um portal não pode ser sólido, o herói entra nele` });
    }

    if (definition.portal?.frame === definition.id) {
      problems.push({ file: 'blocks', message: `${owner}: o portal não pode ser a própria moldura` });
    }

    block('blocks', owner, definition.stacksInto);
    block('blocks', owner, definition.circuit?.switchesInto ?? null);
    Object.values(definition.wallVariants ?? {}).forEach((variant) => block('blocks', owner, variant));
  }

  problems.push(...findStackingProblems(content), ...findCircuitProblems(content), ...findWallProblems(content));

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
    creature('items', owner, definition.summons);
  }

  problems.push(...findObtainableTameSummons(content));

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

    // O pavio só acende quando o bicho vai atrás do herói: um animal manso que estoura nunca chegaria a estourar.
    if (definition.explodes && definition.temperament !== 'hostile') {
      problems.push({ file: 'creatures', message: `${owner}: só um inimigo pode estourar` });
    }

    // O amigo só aparece quando a criança chama: nascido sozinho, o mundo lotaria de golens.
    if (definition.temperament === 'guardian' && definition.spawn) {
      problems.push({ file: 'creatures', message: `${owner}: um amigo não nasce sozinho, tire o "spawn"` });
    }

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

/** Só o meio bloco empilha, e os dois juntos fecham um cubo inteiro: o desenho e a colisão continuam batendo. */
function findStackingProblems(content: CraftContent): readonly IntegrityProblem[] {
  const blocks = new Map(content.blocks.map((block) => [block.id, block]));

  return content.blocks.flatMap((definition): IntegrityProblem[] => {
    if (definition.stacksInto === null) {
      return [];
    }

    const whole = blocks.get(definition.stacksInto);
    const owner = `bloco "${definition.id}"`;

    if (definition.shape !== 'half') {
      return [{ file: 'blocks', message: `${owner}: só um meio bloco (shape "half") empilha em outro igual` }];
    }

    return whole && whole.shape !== 'cube'
      ? [{ file: 'blocks', message: `${owner}: dois meios blocos viram um bloco inteiro (shape "cube"), não "${whole.shape}"` }]
      : [];
  });
}

/**
 * As peças de circuito andam em pares: o bloco troca para o outro jeito e
 * volta. A linha é sempre a forma `wire`, e a forma `wire` é sempre linha —
 * é ela que o desenho liga às vizinhas.
 */
function findCircuitProblems(content: CraftContent): readonly IntegrityProblem[] {
  const blocks = new Map(content.blocks.map((block) => [block.id, block]));
  const problems: IntegrityProblem[] = [];

  for (const definition of content.blocks) {
    const owner = `bloco "${definition.id}"`;
    const circuit = definition.circuit;
    const isWire = circuit?.role === 'wire';

    if ((definition.shape === 'wire') !== isWire) {
      problems.push({ file: 'blocks', message: `${owner}: a linha do circuito precisa de shape "wire", e só ela usa essa forma` });
    }

    if (isWire && definition.solid) {
      problems.push({ file: 'blocks', message: `${owner}: a linha não pode ser sólida, o herói anda por cima dela` });
    }

    if (!circuit) {
      continue;
    }

    const otherId = circuit.role === 'source' ? definition.toggleInto : circuit.switchesInto;
    const other = otherId ? blocks.get(otherId) : undefined;

    if (circuit.role === 'source' && !otherId) {
      problems.push({ file: 'blocks', message: `${owner}: a alavanca precisa de "toggleInto" para o herói ligar e desligar` });
    }

    if (!other) {
      continue;
    }

    const pairsBack = (circuit.role === 'source' ? other.toggleInto : other.circuit?.switchesInto) === definition.id;

    if (other.circuit?.role !== circuit.role || other.circuit.powered === circuit.powered || !pairsBack) {
      problems.push({
        file: 'blocks',
        message: `${owner}: "${other.id}" precisa ser o mesmo tipo de peça no outro jeito (ligado ↔ desligado) e voltar para "${definition.id}"`,
      });
    }
  }

  return problems;
}

/**
 * Só a linha cola na parede. Cada bloco de `wallVariants` precisa estar colado
 * na parede daquele lado, e o jeito ligado e o desligado de uma linha da parede
 * ficam na mesma parede: o circuito troca o bloco sem a linha pular de lugar.
 */
function findWallProblems(content: CraftContent): readonly IntegrityProblem[] {
  const blocks = new Map(content.blocks.map((block) => [block.id, block]));
  const problems: IntegrityProblem[] = [];

  for (const definition of content.blocks) {
    const owner = `bloco "${definition.id}"`;
    const isWire = definition.circuit?.role === 'wire';

    if ((definition.attachedTo !== null || definition.wallVariants !== null) && !isWire) {
      problems.push({ file: 'blocks', message: `${owner}: só a linha do circuito ("attachedTo", "wallVariants") cola na parede` });
    }

    if (definition.attachedTo !== null && definition.wallVariants !== null) {
      problems.push({ file: 'blocks', message: `${owner}: a linha já colada na parede não tem "wallVariants"` });
    }

    for (const [side, variantId] of Object.entries(definition.wallVariants ?? {})) {
      const variant = blocks.get(variantId);

      if (variant && variant.attachedTo !== side) {
        problems.push({ file: 'blocks', message: `${owner}: "${variantId}" precisa ter "attachedTo": "${side}"` });
      }
    }

    const otherId = isWire ? definition.circuit?.switchesInto : null;
    const other = otherId ? blocks.get(otherId) : undefined;

    if (other && other.attachedTo !== definition.attachedTo) {
      problems.push({ file: 'blocks', message: `${owner}: "${other.id}" precisa ficar colado na mesma parede` });
    }
  }

  return problems;
}

/**
 * Item que chama quem não é amigo (a Falsity, a Verity) só pode existir na
 * mochila do Criativo, onde a criatura vem mansa. Se saísse de receita, drop
 * ou mochila inicial, chegaria ao modo Normal e furaria o Modo Paz.
 */
function findObtainableTameSummons(content: CraftContent): readonly IntegrityProblem[] {
  const guardians = new Set(content.creatures.filter((creature) => creature.temperament === 'guardian').map((creature) => creature.id));
  const obtainable = new Set<string>([
    ...content.recipes.crafting.map((recipe) => recipe.output.item),
    ...content.recipes.smelting.map((recipe) => recipe.output.item),
    ...content.lootTables.flatMap((table) => table.entries.map((entry) => entry.item)),
    ...content.world.hero.startingInventory.map((entry) => entry.item),
    ...content.creatures.flatMap((creature) => [
      creature.lays?.item ?? null,
      ...creature.interactions.map((interaction) => interaction.convertsItemTo),
    ]).filter((id) => id !== null),
    ...content.items.flatMap((item) => [item.leftover, item.bucket?.becomes ?? null]).filter((id) => id !== null),
  ]);

  return content.items
    .filter((item) => item.summons !== null && !guardians.has(item.summons) && obtainable.has(item.id))
    .map((item): IntegrityProblem => ({
      file: 'items',
      message: `item "${item.id}": só um amigo (temperament "guardian") pode ser chamado fora do Criativo; tire o item de receitas, drops e da mochila inicial`,
    }));
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
