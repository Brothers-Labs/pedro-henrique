import { HEROES } from '../../pedro-maker/config/hero.config';
import { TestBed } from '@angular/core/testing';

import { recipeRequirements } from '../engine/simulation/crafting';
import type { ContentFile, CraftContent, CraftingRecipe } from '../models/content.model';
import { CraftContentService } from '../services/craft-content.service';
import {
  type ContentFiles as MutableFiles,
  fetchPublishedContentFiles,
  type JsonRecord,
  type JsonValue,
} from '../testing/craft-test-content';
import { ContentIntegrityError } from './content-integrity';
import { AIR, CraftCatalog } from './craft-catalog';
import { CRAFT_CONTENT_GATEWAY, StaticCraftContentGateway } from './craft-content.gateway';
import { ContentError } from './json-reader';
import { parseCraftContent } from './parse-content';

function record(value: JsonValue | undefined): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('O teste esperava um objeto JSON.');
  }

  return value;
}

function list(value: JsonValue | undefined): JsonValue[] {
  if (!Array.isArray(value)) {
    throw new Error('O teste esperava uma lista JSON.');
  }

  return value;
}

/** Primeira entrada da lista `listName` do arquivo cujo `id` é o pedido. */
function entry(files: MutableFiles, file: ContentFile, listName: string, id: string): JsonRecord {
  const found = list(record(files[file])[listName]).map(record).find((candidate) => candidate['id'] === id);

  if (!found) {
    throw new Error(`O teste não achou "${id}" em ${file}.json.`);
  }

  return found;
}

function errorOf(action: () => unknown): Error {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }

  throw new Error('Era esperado um erro.');
}

describe('Conteúdo do PedroCraft', () => {
  let files: MutableFiles;

  beforeEach(async () => {
    files = await fetchPublishedContentFiles();
  });

  describe('arquivos publicados', () => {
    let content: CraftContent;

    beforeEach(() => {
      content = parseCraftContent(files);
    });

    it('passam na validação e na integridade referencial', () => {
      expect(content.blocks.length).toBeGreaterThan(20);
      expect(content.items.length).toBeGreaterThan(40);
      expect(content.recipes.crafting.length).toBeGreaterThan(20);
      expect(content.goals.length).toBeGreaterThan(0);
    });

    it('têm todos os blocos e itens que o motor usa no mundo inicial', () => {
      const catalog = new CraftCatalog(content);
      const { blocks } = content.world;

      for (const id of [blocks.surface, blocks.soil, blocks.stone, blocks.water, blocks.bedrock, blocks.log, blocks.leaves]) {
        expect(catalog.blockNumber(id)).toBeGreaterThan(AIR);
      }

      for (const starting of content.world.hero.startingInventory) {
        expect(catalog.hasItem(starting.item)).toBeTrue();
      }
    });

    it('fazem toda receita de ferramenta caber na grade do lugar dela', () => {
      for (const recipe of content.recipes.crafting) {
        if (recipe.type === 'shaped') {
          const size = recipe.station === 'hand' ? 2 : 3;

          expect(recipe.pattern.length).withContext(recipe.id).toBeLessThanOrEqual(size);
          expect(Math.max(...recipe.pattern.map((row) => row.length))).withContext(recipe.id).toBeLessThanOrEqual(size);
        }
      }
    });

    it('ligam cada semente à própria plantação', () => {
      for (const crop of content.crops) {
        const seed = content.items.find((item) => item.id === crop.seed);

        expect(seed?.plants).withContext(crop.id).toBe(crop.id);
      }
    });

    it('fazem cada tapete na mão, com 2 lãs e ingredientes que nenhuma outra receita usa igual', () => {
      const carpets = content.blocks.filter((block) => block.shape === 'carpet');
      const ingredientsOf = (recipe: CraftingRecipe): string =>
        recipeRequirements(recipe)
          .map((requirement) => `${requirement.count} ${requirement.item}`)
          .sort()
          .join(' + ');
      const handRecipes = content.recipes.crafting.filter((recipe) => recipe.station === 'hand').map(ingredientsOf);

      expect(carpets.length).toBeGreaterThan(1);

      for (const carpet of carpets) {
        const recipe = content.recipes.crafting.find((candidate) => candidate.output.item === carpet.id);
        const ingredients = recipe ? ingredientsOf(recipe) : '';

        expect(recipe?.station).withContext(carpet.id).toBe('hand');
        expect(ingredients).withContext(carpet.id).toContain('2 wool');
        expect(handRecipes.filter((other) => other === ingredients).length).withContext(carpet.id).toBe(1);
      }
    });

    it('troca 9 barras de ouro por um bloco de ouro e o bloco de volta pelas 9 barras', () => {
      const toBlock = content.recipes.crafting.find((recipe) => recipe.id === 'gold-block');
      const fromBlock = content.recipes.crafting.find((recipe) => recipe.type === 'shapeless' && recipe.ingredients.some((ingredient) => ingredient.item === 'gold-block'));

      expect(toBlock?.type === 'shaped' ? toBlock.pattern.join('').length : 0).toBe(9);
      expect(fromBlock?.output).toEqual({ item: 'gold-ingot', count: 9 });
    });

    it('troca 9 esmeraldas por um bloco de esmeralda e o bloco de volta pelas 9 esmeraldas', () => {
      const toBlock = content.recipes.crafting.find((recipe) => recipe.id === 'emerald-block');
      const fromBlock = content.recipes.crafting.find((recipe) => recipe.type === 'shapeless' && recipe.ingredients.some((ingredient) => ingredient.item === 'emerald-block'));

      expect(toBlock?.type === 'shaped' ? toBlock.pattern.join('').length : 0).toBe(9);
      expect(fromBlock?.output).toEqual({ item: 'emerald', count: 9 });
    });

    for (const material of ['gold', 'diamond', 'emerald', 'netherite'] as const) {
      it(`3 blocos de ${material} viram 6 meios blocos, e 2 meios blocos voltam a ser o bloco, na mochila e empilhados`, () => {
        const halfId = `${material}-half`;
        const wholeId = `${material}-block`;
        const toHalves = content.recipes.crafting.find((recipe) => recipe.output.item === halfId);
        const fromHalves = content.recipes.crafting.find((recipe) => recipe.output.item === wholeId && recipe.type === 'shapeless');
        const half = content.blocks.find((block) => block.id === halfId);
        const whole = content.blocks.find((block) => block.id === wholeId);

        expect(toHalves ? recipeRequirements(toHalves) : []).toEqual([{ item: wholeId, count: 3 }]);
        expect(toHalves?.output.count).toBe(6);
        expect(fromHalves ? recipeRequirements(fromHalves) : []).toEqual([{ item: halfId, count: 2 }]);
        expect(half?.shape).toBe('half');
        expect(half?.collisionHeight).toBe(0.5);
        expect(half?.stacksInto).toBe(wholeId);
        expect(half?.minTier).toBe(whole?.minTier);
        expect(half?.blastResistant).withContext('aguenta a TNT como o bloco inteiro').toBe(whole?.blastResistant);
        expect(content.items.find((item) => item.id === halfId)?.places).toBe(halfId);
      });
    }

    it('as TNTs gigantes são feitas da anterior, estouram cada vez mais longe e esperam mais para dar tempo de correr', () => {
      const chain = ['tnt', 'tnt-5x', 'tnt-10x', 'tnt-50x', 'tnt-100x', 'tnt-500x', 'nuclear-bomb'];
      const explosives = chain.map((id) => content.blocks.find((block) => block.id === id)?.explosive ?? null);

      chain.slice(1).forEach((id, index) => {
        const previous = explosives[index];
        const current = explosives[index + 1];
        const recipe = content.recipes.crafting.find((candidate) => candidate.output.item === id);

        expect(recipe?.station).withContext(id).toBe('workbench');
        expect(recipe ? recipeRequirements(recipe).map((requirement) => requirement.item) : []).withContext(id).toContain(chain[index]);
        expect(current?.breaksBlocks).withContext(id).toBeTrue();
        expect(current?.radius).withContext(id).toBeGreaterThan(previous?.radius ?? Infinity);
        expect(current?.fuseMs).withContext(id).toBeGreaterThanOrEqual(previous?.fuseMs ?? Infinity);
        expect(current?.damage).withContext(id).toBeGreaterThanOrEqual(previous?.damage ?? Infinity);
        expect(content.items.find((item) => item.id === id)?.places).withContext(id).toBe(id);
      });
    });

    it('o número na faixa da TNT gigante é quantas TNTs ela tem dentro', () => {
      const tntInside = (id: string): number => {
        const recipe = content.recipes.crafting.find((candidate) => candidate.output.item === id);

        if (id === 'tnt' || !recipe) {
          return id === 'tnt' ? 1 : 0;
        }

        return recipeRequirements(recipe).reduce((total, requirement) => total + requirement.count * tntInside(requirement.item), 0);
      };

      for (const id of ['tnt-5x', 'tnt-10x', 'tnt-50x', 'tnt-100x', 'tnt-500x']) {
        const block = content.blocks.find((candidate) => candidate.id === id);

        expect(block?.textures.side.label).withContext(id).toBe(String(tntInside(id)));
        expect(block?.name).withContext(id).toBe(`TNT ${tntInside(id)}x`);
      }
    });

    it('a bomba nuclear é a explosão mais forte do jogo, com o símbolo de radiação', () => {
      const bomb = content.blocks.find((block) => block.id === 'nuclear-bomb');
      const strongest = Math.max(...content.blocks.map((block) => block.explosive?.radius ?? 0));

      expect(bomb?.explosive?.radius).toBe(strongest);
      expect([bomb?.textures.top.detail, bomb?.textures.side.detail]).toEqual(['radiation', 'radiation']);
    });

    it('a alavanca sai da mochila com graveto e pedregulho, e liga e desliga como peça que dá o comando', () => {
      const recipe = content.recipes.crafting.find((candidate) => candidate.output.item === 'lever');
      const lever = content.blocks.find((block) => block.id === 'lever');
      const leverOn = content.blocks.find((block) => block.id === 'lever-on');

      expect(recipe?.station).toBe('hand');
      expect(recipe ? recipeRequirements(recipe) : []).toEqual(jasmine.arrayWithExactContents([{ item: 'stick', count: 1 }, { item: 'cobblestone', count: 1 }]));
      expect(lever?.toggleInto).toBe('lever-on');
      expect(leverOn?.toggleInto).toBe('lever');
      expect(lever?.circuit).toEqual({ role: 'source', powered: false, switchesInto: null });
      expect(leverOn?.circuit).toEqual({ role: 'source', powered: true, switchesInto: null });
      expect(leverOn?.drops).toBe('lever');
    });

    it('a linha da mochila agora se coloca no chão e leva o comando; a porta obedece a ele', () => {
      const line = content.blocks.find((block) => block.id === 'string-line');

      expect(content.items.find((item) => item.id === 'string')?.places).toBe('string-line');
      expect(line?.shape).toBe('wire');
      expect(line?.solid).toBeFalse();
      expect(line?.circuit).toEqual({ role: 'wire', powered: false, switchesInto: 'string-line-on' });
      expect(content.blocks.find((block) => block.id === 'string-line-on')?.drops).toBe('string');
      expect(content.blocks.find((block) => block.id === 'door')?.circuit).toEqual({ role: 'receiver', powered: false, switchesInto: 'door-open' });
    });

    it('o bloco de netherite sai da mesa com diamante, obsidiana e ouro, só quebra com a picareta de diamante e aguenta a TNT', () => {
      const recipe = content.recipes.crafting.find((candidate) => candidate.output.item === 'netherite-block');
      const netherite = content.blocks.find((block) => block.id === 'netherite-block');
      const strongestPickaxe = Math.max(...content.items.filter((item) => item.tool?.type === 'pickaxe').map((item) => item.tool?.tier ?? 0));

      expect(recipe?.station).toBe('workbench');
      expect(recipe ? recipeRequirements(recipe) : []).toEqual(
        jasmine.arrayWithExactContents([
          { item: 'diamond-block', count: 4 },
          { item: 'obsidian', count: 4 },
          { item: 'gold-block', count: 1 },
        ]),
      );
      expect(netherite?.minTier).toBe(strongestPickaxe);
      expect(netherite?.blastResistant).toBeTrue();
      expect(netherite?.hardness).toBeGreaterThan(content.blocks.find((block) => block.id === 'obsidian')?.hardness ?? 0);
    });

    it('a pólvora da TNT vem de um inimigo que estoura, e a TNT acende com um item que se fabrica', () => {
      const tnt = content.blocks.find((block) => block.id === 'tnt');
      const recipe = content.recipes.crafting.find((candidate) => candidate.output.item === 'tnt');
      const creeper = content.creatures.find((creature) => creature.id === 'creeper');
      const creeperLoot = content.lootTables.find((table) => table.id === creeper?.drops);

      expect(tnt?.explosive?.breaksBlocks).toBeTrue();
      expect(recipe ? recipeRequirements(recipe).map((requirement) => requirement.item) : []).toContain('gunpowder');
      expect(creeper?.explodes?.breaksBlocks).toBeFalse();
      expect(creeperLoot?.entries.map((entry) => entry.item)).toContain('gunpowder');
      expect(tnt?.explosive?.igniters.every((igniter) => content.recipes.crafting.some((candidate) => candidate.output.item === igniter))).toBeTrue();
    });

    it('o isqueiro sai da mochila com ferro e a pederneira do cascalho, gasta e acende a TNT junto com a tocha', () => {
      const recipe = content.recipes.crafting.find((candidate) => candidate.output.item === 'flint-and-steel');
      const lighter = content.items.find((item) => item.id === 'flint-and-steel');
      const gravel = content.blocks.find((block) => block.id === 'gravel');
      const gravelLoot = content.lootTables.find((table) => table.id === gravel?.drops);
      const tnt = content.blocks.find((block) => block.id === 'tnt');

      expect(recipe?.station).toBe('hand');
      expect(recipe ? recipeRequirements(recipe) : []).toEqual(
        jasmine.arrayWithExactContents([
          { item: 'iron-ingot', count: 1 },
          { item: 'flint', count: 1 },
        ]),
      );
      expect(gravelLoot?.entries.find((entry) => entry.item === 'flint')?.chance).toBeLessThan(1);
      expect(lighter?.durability).toBeGreaterThan(0);
      expect(tnt?.explosive?.igniters).toEqual(jasmine.arrayWithExactContents(['torch', 'flint-and-steel']));
    });

    it('o golem de ferro sai da mesa com blocos de ferro e uma abóbora, e chama um amigo', () => {
      const ironBlock = content.recipes.crafting.find((recipe) => recipe.output.item === 'iron-block');
      const fromBlock = content.recipes.crafting.find((recipe) => recipe.type === 'shapeless' && recipe.ingredients.some((ingredient) => ingredient.item === 'iron-block'));
      const golemRecipe = content.recipes.crafting.find((recipe) => recipe.output.item === 'iron-golem');
      const golemItem = content.items.find((item) => item.id === 'iron-golem');
      const golem = content.creatures.find((creature) => creature.id === golemItem?.summons);

      expect(ironBlock?.type === 'shaped' ? ironBlock.pattern.join('').length : 0).toBe(9);
      expect(fromBlock?.output).toEqual({ item: 'iron-ingot', count: 9 });
      expect(golemRecipe?.station).toBe('workbench');
      expect(golemRecipe ? recipeRequirements(golemRecipe) : []).toEqual(
        jasmine.arrayWithExactContents([
          { item: 'pumpkin', count: 1 },
          { item: 'iron-block', count: 4 },
        ]),
      );
      expect(golem?.temperament).toBe('guardian');
      expect(golem?.spawn).toBeNull();
    });

    it('cada herói do Pedro Maker tem um boneco manso, com item de retrato só na mochila do Criativo', () => {
      for (const hero of HEROES) {
        const creature = content.creatures.find((candidate) => candidate.id === `boneco-${hero.id}`);
        const item = content.items.find((candidate) => candidate.summons === creature?.id);

        expect(creature?.model).withContext(hero.id).toBe('maker-hero');
        expect(creature?.hero).withContext(hero.id).toBe(hero.id);
        expect(creature?.name).withContext(hero.id).toBe(hero.name);
        expect(creature?.temperament).withContext(hero.id).toBe('passive');
        expect(creature?.spawn).withContext('não aparece sozinho no mundo').toBeNull();
        expect(item?.icon).withContext(hero.id).toEqual({ type: 'hero', hero: hero.id });
      }
    });

    it('a Verity fala, e só ela', () => {
      const speakers = content.creatures.filter((creature) => creature.greeting !== null);

      expect(speakers.map((creature) => [creature.id, creature.greeting])).toEqual([
        ['verity', 'Olá, eu sou Verity, eu posso falar tudo!'],
      ]);
    });

    it('Verity, Falsity, Cruelty e Lovity têm item na mochila do Criativo, que não sai de receita nem de drop', () => {
      const dolls = ['verity', 'falsity', 'cruelty', 'lovity'];
      const obtainable = new Set([
        ...content.recipes.crafting.map((recipe) => recipe.output.item),
        ...content.lootTables.flatMap((table) => table.entries.map((entry) => entry.item)),
      ]);

      for (const id of dolls) {
        const item = content.items.find((candidate) => candidate.id === id);

        expect(item?.kind).withContext(id).toBe('summon');
        expect(item?.summons).withContext(id).toBe(id);
        expect(item?.icon).withContext(id).toEqual(jasmine.objectContaining({ type: 'sprite', shape: 'blob' }));
        expect(obtainable.has(id)).withContext(id).toBeFalse();
      }
    });

    it('o minério de ferro e o de diamante viram blocos para colocar', () => {
      for (const ore of ['iron-ore', 'diamond-ore']) {
        expect(content.items.find((item) => item.id === ore)?.places).withContext(ore).toBe(ore);
      }
    });

    it('Verity e Lovity são bonecos amigos do dia; Falsity e Cruelty, inimigos da noite', () => {
      const dolls = ['verity', 'lovity', 'falsity', 'cruelty'].map((id) => content.creatures.find((creature) => creature.id === id));

      expect(dolls.map((doll) => [doll?.name, doll?.temperament, doll?.spawn?.period, doll?.model])).toEqual([
        ['Verity', 'passive', 'day', 'verity'],
        ['Lovity', 'passive', 'day', 'lovity'],
        ['Falsity', 'hostile', 'night', 'falsity'],
        ['Cruelty', 'hostile', 'night', 'cruelty'],
      ]);
      expect(dolls.every((doll) => doll?.drops === doll?.id && content.lootTables.some((table) => table.id === doll?.drops))).toBeTrue();
    });

    it('Obesity e Squareity são bonecos amigos do dia; Pointy atira flechas à noite', () => {
      const dolls = ['obesity', 'squareity', 'pointy'].map((id) => content.creatures.find((creature) => creature.id === id));

      expect(dolls.map((doll) => [doll?.name, doll?.temperament, doll?.spawn?.period, doll?.behavior])).toEqual([
        ['Obesity', 'passive', 'day', 'grazer'],
        ['Squareity', 'passive', 'day', 'grazer'],
        ['Pointy', 'hostile', 'night', 'archer'],
      ]);
      expect(dolls.every((doll) => doll?.drops === doll?.id && content.lootTables.some((table) => table.id === doll?.drops))).toBeTrue();
    });

    it('a comida do Obesity é hambúrguer e batata frita: ele deixa os dois e tem filhote com hambúrguer', () => {
      const obesity = content.creatures.find((creature) => creature.id === 'obesity');
      const drops = content.lootTables.find((table) => table.id === 'obesity')?.entries.map((entry) => entry.item);
      const foods = ['hamburger', 'fries'].map((id) => content.items.find((item) => item.id === id));

      expect(obesity?.breedsWith).toBe('hamburger');
      expect(drops).toEqual(['fries', 'hamburger']);
      expect(foods.map((food) => [food?.name, food?.kind])).toEqual([
        ['Hambúrguer', 'food'],
        ['Batata frita', 'food'],
      ]);
      expect(content.recipes.crafting.some((recipe) => recipe.output.item === 'hamburger')).toBeTrue();
      expect(content.recipes.crafting.some((recipe) => recipe.output.item === 'fries')).toBeTrue();
    });
  });

  describe('validação da forma', () => {
    it('recusa uma versão de schema desconhecida, citando o arquivo', () => {
      record(files.items)['schemaVersion'] = 99;

      const error = errorOf(() => parseCraftContent(files));

      expect(error).toBeInstanceOf(ContentError);
      expect(error.message).toContain('items.json');
      expect(error.message).toContain('schemaVersion 99');
    });

    it('aponta o caminho exato de um campo inválido', () => {
      list(record(files.blocks)['blocks']).map(record)[2]['hardness'] = -1;

      const error = errorOf(() => parseCraftContent(files));

      expect(error.message).toContain('blocks.json: blocks[2].hardness: deve ser no mínimo 0');
    });

    it('recusa campo obrigatório ausente', () => {
      delete entry(files, 'creatures', 'creatures', 'cow')['health'];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('campo "health" é obrigatório');
    });

    it('recusa id fora do kebab-case', () => {
      entry(files, 'items', 'items', 'stick')['id'] = 'Graveto Grande';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('não é um id válido');
    });

    it('recusa cor fora do formato #rrggbb', () => {
      entry(files, 'blocks', 'blocks', 'dirt')['mapColor'] = 'marrom';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('#rrggbb');
    });

    it('recusa ids repetidos', () => {
      entry(files, 'items', 'items', 'stick')['id'] = 'coal';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('id repetido: coal');
    });

    it('recusa desenho de receita maior que a grade da mão', () => {
      entry(files, 'recipes', 'crafting', 'workbench')['pattern'] = ['PPP', 'PPP'];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('não cabe na grade 2 × 2');
    });

    it('recusa letra de receita sem legenda', () => {
      entry(files, 'recipes', 'crafting', 'stick')['pattern'] = ['P', 'Q'];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('a letra "Q" do desenho não está na legenda');
    });

    it('recusa item com durabilidade que empilha', () => {
      entry(files, 'items', 'items', 'wooden-sword')['maxStack'] = 2;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('durabilidade precisa de maxStack 1');
    });

    it('recusa item que chama criatura sem ser do tipo "summon"', () => {
      entry(files, 'items', 'items', 'iron-golem')['kind'] = 'material';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('item do tipo "summon" precisa de "summons", e só ele');
    });

    it('recusa mundo que não se divide em chunks', () => {
      record(files.world)['width'] = 100;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('múltiplos de chunkSize');
    });

    it('recusa construção com letra fora da legenda', () => {
      const house = record(record(files.world)['house']);

      list(house['layers'])[0] = ['ZZZZZZZ', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP'];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('a letra "Z" da construção');
    });

    it('recusa número pintado fora da faixa da TNT', () => {
      record(record(entry(files, 'blocks', 'blocks', 'tnt-5x')['textures'])['top'])['label'] = '5';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('"label" só vale com o "detail" "band"');
    });

    it('recusa número da faixa que não cabe ou não é número', () => {
      record(record(entry(files, 'blocks', 'blocks', 'tnt-5x')['textures'])['side'])['label'] = '5x';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('use de 1 a 3 algarismos');
    });

    it('recusa explosão maior que a da bomba nuclear', () => {
      record(entry(files, 'blocks', 'blocks', 'nuclear-bomb')['explosive'])['radius'] = 31;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('explosive.radius: deve ser no máximo 30');
    });

    it('recusa missão de dormir com alvo', () => {
      entry(files, 'goals', 'goals', 'sleep')['target'] = 'bed';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('a missão de dormir não tem alvo');
    });
  });

  describe('integridade referencial', () => {
    it('junta todas as referências quebradas numa única mensagem', () => {
      entry(files, 'blocks', 'blocks', 'dirt')['drops'] = 'tabela-sumida';
      entry(files, 'recipes', 'crafting', 'torch')['key'] = { C: 'carvao-magico', S: 'stick' };

      const error = errorOf(() => parseCraftContent(files));

      expect(error).toBeInstanceOf(ContentIntegrityError);
      expect(error.message).toContain('blocks.json › bloco "dirt": tabela de drop "tabela-sumida" não existe');
      expect(error.message).toContain('recipes.json › receita "torch": item "carvao-magico" não existe');
    });

    it('exige que a semente aponte de volta para a plantação', () => {
      entry(files, 'items', 'items', 'wheat-seeds')['plants'] = 'carrot';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('o item "wheat-seeds" precisa de "plants": "wheat"');
    });

    it('confere o alvo das missões pelo tipo do gatilho', () => {
      entry(files, 'goals', 'goals', 'harvest-wheat')['target'] = 'oak-log';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('missão "harvest-wheat": plantação "oak-log" não existe');
    });

    it('confere os blocos da casa inicial', () => {
      record(record(record(files.world)['house'])['palette'])['P'] = 'tabuas-de-ouro';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('house.palette.P: bloco "tabuas-de-ouro" não existe');
    });

    it('não aceita o id reservado do ar', () => {
      entry(files, 'blocks', 'blocks', 'gravel')['id'] = 'air';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('o id "air" é reservado');
    });

    it('não aceita tapete sólido: o herói anda por cima dele', () => {
      entry(files, 'blocks', 'blocks', 'carpet-red')['solid'] = true;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('bloco "carpet-red": um tapete não pode ser sólido');
    });

    it('não aceita boneco do Maker com herói que não existe', () => {
      entry(files, 'creatures', 'creatures', 'boneco-mario')['hero'] = 'bowser';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('"bowser" não é um herói do Pedro Maker');
    });

    it('não aceita herói em criatura que não é boneco do Maker', () => {
      entry(files, 'creatures', 'creatures', 'verity')['hero'] = 'mario';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('só o modelo "maker-hero" tem "hero"');
    });

    it('não aceita meio bloco com colisão diferente da metade: o herói flutuaria ou afundaria nele', () => {
      entry(files, 'blocks', 'blocks', 'diamond-half')['collisionHeight'] = 1;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('bloco "diamond-half": um meio bloco precisa ser sólido');
    });

    it('só o meio bloco empilha, e dois meios blocos viram um cubo inteiro', () => {
      entry(files, 'blocks', 'blocks', 'stone')['stacksInto'] = 'stone-bricks';
      entry(files, 'blocks', 'blocks', 'gold-half')['stacksInto'] = 'fence';

      const message = errorOf(() => parseCraftContent(files)).message;

      expect(message).toContain('bloco "stone": só um meio bloco (shape "half") empilha em outro igual');
      expect(message).toContain('bloco "gold-half": dois meios blocos viram um bloco inteiro (shape "cube"), não "fence"');
    });

    it('não aceita peça de circuito que não volta para o próprio par', () => {
      record(entry(files, 'blocks', 'blocks', 'string-line-on')['circuit'])['switchesInto'] = 'door';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('bloco "string-line": "string-line-on" precisa ser o mesmo tipo de peça');
    });

    it('não aceita a forma de linha fora do circuito, nem alavanca sem par para o herói', () => {
      delete entry(files, 'blocks', 'blocks', 'string-line')['circuit'];
      delete entry(files, 'blocks', 'blocks', 'lever')['toggleInto'];

      const message = errorOf(() => parseCraftContent(files)).message;

      expect(message).toContain('bloco "string-line": a linha do circuito precisa de shape "wire"');
      expect(message).toContain('bloco "lever": a alavanca precisa de "toggleInto"');
    });

    it('recusa linha sem o outro jeito para onde o circuito a troca', () => {
      delete record(entry(files, 'blocks', 'blocks', 'string-line')['circuit'])['switchesInto'];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('falta "switchesInto"');
    });

    it('recusa alavanca com "switchesInto": quem a troca é o herói', () => {
      record(entry(files, 'blocks', 'blocks', 'lever')['circuit'])['switchesInto'] = 'lever-on';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('a alavanca não tem "switchesInto"');
    });

    it('não aceita TNT que aguenta explosão: a reação em cadeia nunca chegaria nela', () => {
      entry(files, 'blocks', 'blocks', 'tnt')['blastResistant'] = true;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('bloco "tnt": um bloco que estoura não pode aguentar explosão');
    });

    it('aponta o item que acende a TNT quando ele não existe', () => {
      record(entry(files, 'blocks', 'blocks', 'tnt')['explosive'])['igniters'] = ['torch', 'fosforo'];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('bloco "tnt": item "fosforo" não existe');
    });

    it('não aceita TNT sem nenhum item que acenda', () => {
      record(entry(files, 'blocks', 'blocks', 'tnt')['explosive'])['igniters'] = [];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('explosive.igniters');
    });

    it('não aceita portal sólido: o herói precisa entrar nele', () => {
      entry(files, 'blocks', 'blocks', 'nether-portal')['solid'] = true;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('bloco "nether-portal": um portal não pode ser sólido');
    });

    it('aponta a moldura do portal quando ela não existe', () => {
      record(entry(files, 'blocks', 'blocks', 'nether-portal')['portal'])['frame'] = 'obsidiana-dourada';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('bloco "nether-portal": bloco "obsidiana-dourada" não existe');
    });

    it('não aceita animal manso que estoura', () => {
      entry(files, 'creatures', 'creatures', 'creeper')['temperament'] = 'passive';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('criatura "creeper": só um inimigo pode estourar');
    });

    it('não aceita que um item de receita chame inimigo: furaria o Modo Paz', () => {
      entry(files, 'items', 'items', 'iron-golem')['summons'] = 'creeper';

      expect(errorOf(() => parseCraftContent(files)).message).toContain(
        'item "iron-golem": só um amigo (temperament "guardian") pode ser chamado fora do Criativo',
      );
    });

    it('não aceita que um boneco da mochila do Criativo saia de drop', () => {
      list(entry(files, 'loot-tables', 'lootTables', 'verity')['entries']).push({ item: 'falsity', chance: 0.5 });

      expect(errorOf(() => parseCraftContent(files)).message).toContain('item "falsity": só um amigo');
    });

    it('aponta a criatura chamada quando ela não existe', () => {
      entry(files, 'items', 'items', 'iron-golem')['summons'] = 'golem-de-barro';

      expect(errorOf(() => parseCraftContent(files)).message).toContain('item "iron-golem": criatura "golem-de-barro" não existe');
    });

    it('não aceita amigo que nasce sozinho', () => {
      entry(files, 'creatures', 'creatures', 'iron-golem')['spawn'] = { period: 'day', on: ['grass'], groupMin: 1, groupMax: 1, weight: 1 };

      expect(errorOf(() => parseCraftContent(files)).message).toContain('criatura "iron-golem": um amigo não nasce sozinho');
    });
  });

  describe('catálogo', () => {
    let catalog: CraftCatalog;

    beforeEach(() => {
      catalog = new CraftCatalog(parseCraftContent(files));
    });

    it('dá números internos a partir de 1 e reserva o 0 para o ar', () => {
      expect(catalog.blockAt(AIR)).toBeNull();
      expect(catalog.blockAt(catalog.blockNumber('stone'))?.id).toBe('stone');
      expect(catalog.findBlockNumber('bloco-que-nao-existe')).toBeNull();
    });

    it('falha alto ao pedir um id desconhecido', () => {
      expect(() => catalog.item('item-fantasma')).toThrowError(/Item "item-fantasma" não existe/);
      expect(() => catalog.blockNumber('bloco-fantasma')).toThrowError(/Bloco "bloco-fantasma" não existe/);
    });

    it('encontra plantação pelo bloco e receitas de fornalha e combustível pelo item', () => {
      expect(catalog.cropForBlock('wheat-crop')?.id).toBe('wheat');
      expect(catalog.cropForBlock('stone')).toBeNull();
      expect(catalog.smeltingFor('iron-ore')?.output.item).toBe('iron-ingot');
      expect(catalog.fuelFor('coal')?.burnMs).toBeGreaterThan(0);
      expect(catalog.fuelFor('dirt')).toBeNull();
    });
  });

  describe('porta de conteúdo', () => {
    it('avisa qual arquivo não respondeu', async () => {
      const gateway = new StaticCraftContentGateway('/data/pasta-que-nao-existe');

      await expectAsync(gateway.loadContent()).toBeRejectedWithError(/PedroCraft: \S+\.json respondeu 404/);
    });

    it('carrega uma vez e tenta de novo depois de uma falha', async () => {
      const content = parseCraftContent(files);
      const loadContent = jasmine
        .createSpy('loadContent')
        .and.returnValues(Promise.reject(new Error('sem internet')), Promise.resolve(content));

      TestBed.configureTestingModule({ providers: [{ provide: CRAFT_CONTENT_GATEWAY, useValue: { loadContent } }] });

      const service = TestBed.inject(CraftContentService);

      await expectAsync(service.load()).toBeRejectedWithError('sem internet');

      const first = await service.load();
      const second = await service.load();

      expect(first).toBe(second);
      expect(loadContent).toHaveBeenCalledTimes(2);
    });
  });
});
