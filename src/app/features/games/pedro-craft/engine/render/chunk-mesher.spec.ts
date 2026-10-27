import type { CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties } from '../block-properties';
import { type ChunkMeshData, type ChunkMeshes, type LightSource, meshChunk, type TileSource } from './chunk-mesher';

const FULL_TILE: TileSource = { tile: () => ({ u0: 0, v0: 0, u1: 1, v1: 1 }) };

function faces(data: ChunkMeshData): number {
  return data.indices.length / 6;
}

describe('Malha dos chunks do PedroCraft', () => {
  let catalog: CraftCatalog;
  let properties: BlockProperties;
  let world: VoxelWorld;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
    properties = new BlockProperties(catalog);
  });

  beforeEach(() => {
    world = new VoxelWorld(16, 16, 16);
  });

  const put = (id: string, x: number, y: number, z: number): void => world.fill(x, y, z, catalog.blockNumber(id));

  const mesh = (options: { readonly tiles?: TileSource; readonly lights?: readonly LightSource[]; readonly stage?: number } = {}): ChunkMeshes =>
    meshChunk(
      {
        world,
        properties,
        tiles: options.tiles ?? FULL_TILE,
        chunkSize: 16,
        lights: options.lights ?? [],
        stageAt: () => options.stage ?? 0,
      },
      0,
      0,
    );

  it('desenha as seis faces de um bloco sozinho', () => {
    put('stone', 5, 5, 5);

    expect(faces(mesh().opaque)).toBe(6);
  });

  it('não desenha a face escondida entre dois blocos', () => {
    put('stone', 5, 5, 5);
    put('stone', 6, 5, 5);

    expect(faces(mesh().opaque)).toBe(10);
  });

  it('não desenha a face de baixo do fundo do mundo', () => {
    put('bedrock', 5, 0, 5);

    expect(faces(mesh().opaque)).toBe(5);
  });

  it('separa os passes: vidro recortado, água transparente', () => {
    put('glass', 5, 5, 5);
    put('glass', 6, 5, 5);
    put('water', 9, 5, 9);

    const result = mesh();

    expect(faces(result.opaque)).toBe(0);
    expect(faces(result.cutout)).toBe(10);
    expect(faces(result.water)).toBe(6);
  });

  it('desenha a face do vidro encostada na pedra só do lado da pedra', () => {
    put('glass', 5, 5, 5);
    put('stone', 6, 5, 5);

    const result = mesh();

    expect(faces(result.cutout)).toBe(5);
    expect(faces(result.opaque)).toBe(6);
  });

  it('deixa a água parada um pouco abaixo da borda', () => {
    put('water', 5, 5, 5);

    const positions = mesh().water.positions;
    let top = 0;

    for (let index = 1; index < positions.length; index += 3) {
      top = Math.max(top, positions[index]);
    }

    expect(top).toBeCloseTo(5.875, 3);
  });

  it('escurece os cantos da face encostados em outro bloco', () => {
    put('stone', 5, 5, 5);
    put('stone', 6, 6, 5);

    const colors = mesh().opaque.colors;

    expect(Math.min(...colors)).toBeLessThan(0.5);
    expect(Math.max(...colors)).toBe(1);
  });

  it('acende a tocha por inteiro e clareia o que está perto', () => {
    put('torch', 5, 5, 5);
    put('stone', 7, 5, 5);

    const result = mesh({ lights: [{ x: 5, y: 5, z: 5, radius: 7 }] });

    expect(Math.min(...result.cutout.lights)).toBe(1);
    expect(Math.max(...result.opaque.lights)).toBeGreaterThan(0.6);
  });

  it('pede a face do estágio certo da plantação', () => {
    const asked: number[] = [];
    const tiles: TileSource = {
      tile: (_block, _face, stage) => {
        asked.push(stage);
        return { u0: 0, v0: 0, u1: 1, v1: 1 };
      },
    };

    put('wheat-crop', 5, 5, 5);
    mesh({ tiles, stage: 2 });

    expect(asked).toEqual([2]);
  });

  it('só desenha o chunk pedido', () => {
    world = new VoxelWorld(32, 16, 32);
    put('stone', 20, 5, 20);

    expect(faces(mesh().opaque)).toBe(0);
  });
});
