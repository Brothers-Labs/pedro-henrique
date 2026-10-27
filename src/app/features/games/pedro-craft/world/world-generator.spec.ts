import type { CraftCatalog } from '../content/craft-catalog';
import { loadTestCatalog } from '../testing/craft-test-content';
import { type GeneratedWorld, generateWorld } from './world-generator';

function sameCells(first: Uint8Array, second: Uint8Array): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
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

  it('planta árvores no bosque e enche o lago', () => {
    expect(countBlocks(catalog.world.blocks.log, generated.layout.forest, catalog.world.forest.radius)).toBeGreaterThan(8);
    expect(countBlocks(catalog.world.blocks.water, generated.layout.lake, catalog.world.lake.radius)).toBeGreaterThan(20);
  });

  it('prepara a horta com terra arada ao lado da água', () => {
    expect(countBlocks(catalog.world.blocks.farmland, generated.layout.farm, catalog.world.farm.radius)).toBeGreaterThan(6);
  });
});
