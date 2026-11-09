import { SKELETON_PLATFORM_CELLS, skeletonWallColumn } from './skeleton-platform';

describe('Caminho da plataforma de esqueleto', () => {
  const LEVEL_WIDTH = 40;
  const platform = { x: 5, y: 8 };

  it('são quatro esqueletos de duas células', () => {
    expect(SKELETON_PLATFORM_CELLS).toBe(8);
  });

  it('para na primeira parede da linha dela', () => {
    const walls = new Set(['20:8', '30:8', '10:7']);

    expect(skeletonWallColumn(platform, LEVEL_WIDTH, (x, y) => walls.has(`${x}:${y}`))).toBe(20);
  });

  it('sem parede, vai até o fim da fase', () => {
    expect(skeletonWallColumn(platform, LEVEL_WIDTH, () => false)).toBe(LEVEL_WIDTH);
  });
});
