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

  describe('trilho', () => {
    const corners = (data: ChunkMeshData): readonly (readonly [number, number, number])[] =>
      Array.from({ length: data.positions.length / 3 }, (_, index) => [data.positions[index * 3], data.positions[index * 3 + 1], data.positions[index * 3 + 2]] as const);

    it('desenha o trilho sozinho reto, chato e rente ao chão, no passe recortado', () => {
      put('rail', 5, 5, 5);

      const result = mesh();

      expect(faces(result.cutout)).toBe(2);
      expect(faces(result.opaque)).toBe(0);
      expect(corners(result.cutout).every(([, y]) => y > 5 && y < 5.1)).toBeTrue();
    });

    it('liga um trilho a todos os vizinhos: a encruzilhada tem quatro metades', () => {
      put('rail', 5, 5, 5);

      for (const [x, z] of [[5, 4], [6, 5], [5, 6], [4, 5]] as const) {
        put('rail', x, 5, z);
      }

      // O do meio tem 4 metades; cada vizinho, ligado só ao meio, vira um trilho reto de 2 metades.
      expect(faces(mesh().cutout)).toBe(4 + 4 * 2);
    });

    it('faz a curva só para os lados ligados', () => {
      put('rail', 5, 5, 5);
      put('rail', 6, 5, 5);
      put('rail', 5, 5, 6);

      // Na curva leste-sul, o canto noroeste da célula do meio fica sem trilho.
      expect(corners(mesh().cutout).some(([x, , z]) => x === 5 && z === 5)).toBeFalse();
    });

    it('não liga trilhos em alturas diferentes', () => {
      put('rail', 5, 5, 5);
      put('rail', 6, 6, 5);

      const lower = corners(mesh().cutout).filter(([, y]) => y < 6);

      // Sem ligação, o de baixo fica no padrão norte-sul: as metades se encontram no meio do z.
      expect(lower.some(([, , z]) => z === 5.5)).toBeTrue();
      expect(lower.some(([x]) => x === 5.5)).toBeFalse();
    });
  });

  describe('alavanca e linha', () => {
    it('a alavanca desligada não brilha sozinha; ligada, brilha como a tocha', () => {
      put('lever', 5, 5, 5);

      expect(Math.max(...mesh().cutout.lights)).toBe(0);

      put('lever-on', 5, 5, 5);

      expect(Math.min(...mesh().cutout.lights)).toBe(1);
    });

    it('desenha a linha chata no chão e liga até as vizinhas, a alavanca e a TNT, mas não a outros blocos', () => {
      put('string-line', 5, 5, 5);
      put('string-line', 6, 5, 5);
      put('lever', 4, 5, 5);
      put('tnt', 5, 5, 6);
      put('stone', 5, 5, 4);

      // A linha do meio liga a leste, a oeste (alavanca) e ao sul (TNT), não à pedra do norte: 3 metades.
      // A do leste, ligada só à do meio, vira reta: 2 metades. A alavanca é uma caixa fina de 6 faces.
      // A TNT e a pedra são cubos opacos, de outro passe.
      expect(faces(mesh().cutout)).toBe(3 + 2 + 6);
    });

    it('a linha acesa brilha sozinha no escuro, a apagada não', () => {
      put('string-line', 5, 5, 5);

      expect(Math.max(...mesh().cutout.lights)).toBe(0);

      put('string-line-on', 5, 5, 5);

      expect(Math.min(...mesh().cutout.lights)).toBe(1);
    });
  });

  describe('tapete', () => {
    const heights = (data: ChunkMeshData): readonly number[] =>
      Array.from({ length: data.positions.length / 3 }, (_, index) => data.positions[index * 3 + 1]);

    it('desenha o tapete fininho, deitado no chão e no passe recortado', () => {
      put('stone', 5, 4, 5);
      put('carpet-red', 5, 5, 5);

      const result = mesh();
      const carpet = heights(result.cutout);

      // Topo e as quatro beiradas; a face de baixo fica escondida pela pedra.
      expect(faces(result.cutout)).toBe(5);
      expect(Math.min(...carpet)).toBe(5);
      expect(Math.max(...carpet)).toBeCloseTo(5 + 1 / 16, 5);
    });

    it('esconde a beirada encostada noutro tapete, mesmo de outra cor', () => {
      put('stone', 5, 4, 5);
      put('stone', 6, 4, 5);
      put('carpet-red', 5, 5, 5);
      put('carpet-white', 6, 5, 5);

      // Cada tapete perde a beirada do meio: 2 × (topo + 3 beiradas).
      expect(faces(mesh().cutout)).toBe(8);
    });
  });

  describe('meio bloco', () => {
    const heights = (data: ChunkMeshData): readonly number[] =>
      Array.from({ length: data.positions.length / 3 }, (_, index) => data.positions[index * 3 + 1]);

    it('desenha o meio bloco de diamante com metade da altura, no passe recortado', () => {
      put('stone', 5, 4, 5);
      put('diamond-half', 5, 5, 5);

      const result = mesh();
      const half = heights(result.cutout);

      // Topo e quatro lados; a face de baixo fica escondida pela pedra.
      expect(faces(result.cutout)).toBe(5);
      expect(Math.min(...half)).toBe(5);
      expect(Math.max(...half)).toBeCloseTo(5.5, 5);
    });

    it('não esconde a face do vizinho, que continua aparecendo acima da metade', () => {
      put('diamond-half', 5, 5, 5);
      put('stone', 6, 5, 5);

      expect(faces(mesh().opaque)).toBe(6);
    });
  });

  it('só desenha o chunk pedido', () => {
    world = new VoxelWorld(32, 16, 32);
    put('stone', 20, 5, 20);

    expect(faces(mesh().opaque)).toBe(0);
  });
});
