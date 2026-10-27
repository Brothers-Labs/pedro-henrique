import { TestBed } from '@angular/core/testing';

import type { ContentFile, CraftContent } from '../models/content.model';
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

    it('recusa mundo que não se divide em chunks', () => {
      record(files.world)['width'] = 100;

      expect(errorOf(() => parseCraftContent(files)).message).toContain('múltiplos de chunkSize');
    });

    it('recusa construção com letra fora da legenda', () => {
      const house = record(record(files.world)['house']);

      list(house['layers'])[0] = ['ZZZZZZZ', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP'];

      expect(errorOf(() => parseCraftContent(files)).message).toContain('a letra "Z" da construção');
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
