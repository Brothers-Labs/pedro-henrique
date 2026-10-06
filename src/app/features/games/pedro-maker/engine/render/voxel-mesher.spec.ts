import type { TerrainMaterial } from '../simulation/tile-grid';
import { meshTerrainChunk, type TerrainSource, TERRAIN_DEPTH, tileFor, type TileLookup } from './voxel-mesher';

const LOOKUP: TileLookup = () => ({ u0: 0, v0: 0, u1: 1, v1: 1 });

/** Terreno a partir de linhas de texto: `#` é terra, `S` é pedra, `.` é vazio. */
function terrain(...rows: string[]): TerrainSource {
  const materials: Readonly<Record<string, TerrainMaterial>> = { '#': 'ground', S: 'stone', '=': 'platform' };

  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    materialAt: (x, y) => materials[rows[y]?.[x] ?? '.'] ?? null,
  };
}

function faceCount(source: TerrainSource): number {
  return meshTerrainChunk(source, 0, LOOKUP).indices.length / 6;
}

describe('Malha do terreno em cubos', () => {
  it('desenha só as faces que dão para o vazio', () => {
    // Um bloco sozinho: topo nas três camadas e a frente. As laterais continuam além da fase.
    expect(faceCount(terrain('#'))).toBe(TERRAIN_DEPTH + 1);
  });

  it('abre as paredes de um buraco', () => {
    // Dois blocos com um vão no meio: cada um ganha a lateral voltada para o vão.
    expect(faceCount(terrain('#.#'))).toBe(2 * (TERRAIN_DEPTH + 1 + TERRAIN_DEPTH));
  });

  it('esconde a face entre dois blocos empilhados', () => {
    const tower = terrain('#', '#');

    // Só o de cima tem topo; nenhum dos dois mostra a face de baixo nem a do meio.
    expect(faceCount(tower)).toBe(TERRAIN_DEPTH + 2);
  });

  it('deixa a tábua de madeira de fora da malha de cubos', () => {
    expect(faceCount(terrain('='))).toBe(0);
  });

  it('escurece o canto do chão encostado numa parede', () => {
    const mesh = meshTerrainChunk(terrain('.S', '##'), 0, LOOKUP);
    const darkest = Math.min(...mesh.colors);

    expect(darkest).toBeLessThan(1);
    expect(Math.max(...mesh.colors)).toBe(1);
  });

  it('usa grama só na lateral de cima do chão', () => {
    expect(tileFor('ground', 'top', true)).toBe('grass-top');
    expect(tileFor('ground', 'front', true)).toBe('grass-side');
    expect(tileFor('ground', 'front', false)).toBe('dirt');
    expect(tileFor('pipe', 'top', true)).toBe('pipe-top');
  });
});
