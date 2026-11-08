import { CraftCatalog } from '../content/craft-catalog';
import { parseCraftContent } from '../content/parse-content';
import { type ContentFiles, fetchPublishedContentFiles, type JsonRecord, type JsonValue, loadTestCatalog } from '../testing/craft-test-content';
import { type GeneratedWorld, generateWorld } from './world-generator';

function sameCells(first: Uint8Array, second: Uint8Array): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

/** O conteúdo como era antes de os ids existirem: some toda entrada de lista que cita algum deles. */
function withoutMentionsOf(files: ContentFiles, ids: readonly string[]): ContentFiles {
  const mentions = (entry: JsonValue): boolean => ids.some((id) => JSON.stringify(entry).includes(`"${id}"`));
  const prune = (content: JsonValue): JsonValue =>
    Object.fromEntries(
      Object.entries(content as JsonRecord).map(([key, value]) => [key, Array.isArray(value) ? value.filter((entry) => !mentions(entry)) : value]),
    );

  return Object.fromEntries(Object.entries(files).map(([file, content]) => [file, prune(content)])) as ContentFiles;
}

describe('Gerador de mundo do PedroCraft', () => {
  let catalog: CraftCatalog;
  let generated: GeneratedWorld;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
    generated = generateWorld(catalog, 42);
  });

  const countBlocks = (id: string, near: { readonly x: number; readonly z: number }, radius: number): number => {
    const { world } = generated;
    const block = catalog.blockNumber(id);
    let count = 0;

    for (let y = 0; y < world.height; y += 1) {
      for (let z = near.z - radius; z <= near.z + radius; z += 1) {
        for (let x = near.x - radius; x <= near.x + radius; x += 1) {
          count += Number(world.get(x, y, z) === block);
        }
      }
    }

    return count;
  };

  /** Camada mais alta onde o bloco aparece no mundo inteiro; -1 quando não aparece. */
  const highestLayerOf = (id: string): number => {
    const block = catalog.blockNumber(id);
    const layerSize = generated.world.width * generated.world.depth;

    return generated.world.snapshot.reduce((top, cell, index) => (cell === block ? Math.max(top, Math.floor(index / layerSize)) : top), -1);
  };

  const oreDepth = (id: string): number =>
    [...catalog.world.quarry.ores, ...catalog.world.quarry.rareOres].find((vein) => vein.block === id)?.maxY ?? -1;

  it('gera o mesmo mundo, bloco a bloco, com a mesma semente', () => {
    const again = generateWorld(catalog, 42);

    expect(sameCells(again.world.snapshot, generated.world.snapshot)).toBeTrue();
    expect(again.layout).toEqual(generated.layout);
  });

  it('gera mundos diferentes com sementes diferentes', () => {
    expect(sameCells(generateWorld(catalog, 7).world.snapshot, generated.world.snapshot)).toBeFalse();
  });

  it('tem o tamanho do world.json', () => {
    const { world } = generated;

    expect([world.width, world.depth, world.height]).toEqual([catalog.world.width, catalog.world.depth, catalog.world.height]);
  });

  it('cobre o fundo inteiro com rocha-mãe', () => {
    const { world } = generated;
    const bedrock = catalog.blockNumber(catalog.world.blocks.bedrock);

    for (let z = 0; z < world.depth; z += 1) {
      for (let x = 0; x < world.width; x += 1) {
        expect(world.get(x, 0, z)).withContext(`${x},${z}`).toBe(bedrock);
      }
    }
  });

  it('cerca o mundo de água, o limite natural da fazenda', () => {
    const { world } = generated;
    const water = catalog.blockNumber(catalog.world.blocks.water);
    const sea = catalog.world.seaLevel;

    for (const [x, z] of [[0, 0], [world.width - 1, 0], [0, world.depth - 1], [Math.floor(world.width / 2), 0], [0, Math.floor(world.depth / 2)]]) {
      expect(world.get(x, sea, z)).withContext(`borda ${x},${z}`).toBe(water);
    }
  });

  it('faz o herói nascer em pé, com espaço livre e chão firme embaixo', () => {
    const { world, layout } = generated;
    const x = Math.floor(layout.spawn.x);
    const z = Math.floor(layout.spawn.z);
    const ground = catalog.blockAt(world.get(x, layout.spawn.y - 1, z));

    expect(world.get(x, layout.spawn.y, z)).toBe(0);
    expect(world.get(x, layout.spawn.y + 1, z)).toBe(0);
    expect(ground?.solid).toBeTrue();
  });

  it('ergue a casa inicial com porta, cama e baú', () => {
    const { house } = generated.layout;
    const center = { x: house.x + 3, z: house.z + 3 };

    expect(countBlocks('door', center, 4)).toBe(2);
    expect(countBlocks('bed', center, 4)).toBe(1);
    expect(countBlocks('chest', center, 4)).toBe(1);
  });

  it('esconde minérios na pedreira', () => {
    const { quarry } = generated.layout;
    const radius = catalog.world.quarry.radius;

    expect(countBlocks('coal-ore', quarry, radius)).toBeGreaterThan(0);
    expect(countBlocks('iron-ore', quarry, radius)).toBeGreaterThan(0);
  });

  it('esconde diamantes embaixo da pedreira, bem no fundo', () => {
    const [vein] = catalog.world.quarry.rareOres;

    expect(countBlocks('diamond-ore', generated.layout.quarry, catalog.world.quarry.radius)).toBeGreaterThan(0);
    expect(highestLayerOf('diamond-ore')).toBeLessThanOrEqual(vein.maxY);
  });

  it('esconde o ouro na pedreira, mais fundo que o ferro e mais raso que o diamante', () => {
    expect(countBlocks('gold-ore', generated.layout.quarry, catalog.world.quarry.radius)).toBeGreaterThan(0);
    expect(highestLayerOf('gold-ore')).toBeLessThanOrEqual(oreDepth('gold-ore'));
    expect(oreDepth('gold-ore')).toBeLessThan(oreDepth('iron-ore'));
    expect(oreDepth('gold-ore')).toBeGreaterThan(oreDepth('diamond-ore'));
  });

  it('gera o mesmo mundo, bloco a bloco, com ou sem o bloco de ouro e os tapetes no conteúdo', async () => {
    const added = ['gold-block', ...catalog.content.blocks.filter((block) => block.shape === 'carpet').map((block) => block.id)];
    const older = new CraftCatalog(parseCraftContent(withoutMentionsOf(await fetchPublishedContentFiles(), added)));
    const before = generateWorld(older, 42);
    const beforeCells = before.world.snapshot;
    const different = generated.world.snapshot.reduce(
      (count, cell, index) => count + Number(catalog.blockAt(cell)?.id !== older.blockAt(beforeCells[index])?.id),
      0,
    );

    expect(added.every((id) => older.findBlockNumber(id) === null)).toBeTrue();
    expect(different).toBe(0);
    expect(before.layout).toEqual(generated.layout);
  });

  it('esconde a esmeralda e o lápis-lazúli no fundo, e a obsidiana encostada na rocha-mãe', () => {
    for (const id of ['emerald-ore', 'lapis-ore']) {
      expect(countBlocks(id, generated.layout.quarry, catalog.world.quarry.radius)).withContext(id).toBeGreaterThan(0);
      expect(highestLayerOf(id)).withContext(id).toBeLessThanOrEqual(oreDepth(id));
    }

    expect(countBlocks('obsidian', generated.layout.quarry, catalog.world.quarry.radius)).toBeGreaterThan(0);
    expect(highestLayerOf('obsidian')).toBeLessThanOrEqual(oreDepth('obsidian'));
    expect(oreDepth('obsidian')).toBeLessThan(oreDepth('diamond-ore'));
  });

  it('os minérios raros novos não mudam os diamantes de mundos salvos', async () => {
    const files = await fetchPublishedContentFiles();
    const quarry = (files.world as JsonRecord)['quarry'] as JsonRecord;

    quarry['rareOres'] = (quarry['rareOres'] as JsonValue[]).slice(0, 1);

    const older = new CraftCatalog(parseCraftContent(files));
    const diamond = (cells: Uint8Array, source: CraftCatalog): number[] =>
      [...cells].flatMap((cell, index) => (source.blockAt(cell)?.id === 'diamond-ore' ? [index] : []));

    expect(diamond(generated.world.snapshot, catalog)).toEqual(diamond(generateWorld(older, 42).world.snapshot, older));
  });

  it('põe os minérios raros só no lugar de pedra: mundos salvos antes deles continuam iguais', async () => {
    const files = await fetchPublishedContentFiles();
    const quarry = (files.world as JsonRecord)['quarry'] as JsonRecord;

    quarry['rareOres'] = [];

    const before = generateWorld(new CraftCatalog(parseCraftContent(files)), 42);
    const stone = catalog.blockNumber('stone');
    const rareOres = new Set(catalog.world.quarry.rareOres.map((vein) => catalog.blockNumber(vein.block)));
    const beforeCells = before.world.snapshot;
    const changed = [...generated.world.snapshot].filter((block, index) => block !== beforeCells[index]).length;
    const swapped = [...generated.world.snapshot].filter((block, index) => rareOres.has(block) && beforeCells[index] === stone).length;

    expect(changed).toBeGreaterThan(0);
    expect(swapped).toBe(changed);
    expect(before.layout).toEqual(generated.layout);
  });

  it('planta árvores no bosque e enche o lago', () => {
    expect(countBlocks(catalog.world.blocks.log, generated.layout.forest, catalog.world.forest.radius)).toBeGreaterThan(8);
    expect(countBlocks(catalog.world.blocks.water, generated.layout.lake, catalog.world.lake.radius)).toBeGreaterThan(20);
  });

  it('prepara a horta com terra arada ao lado da água', () => {
    expect(countBlocks(catalog.world.blocks.farmland, generated.layout.farm, catalog.world.farm.radius)).toBeGreaterThan(6);
  });
});
