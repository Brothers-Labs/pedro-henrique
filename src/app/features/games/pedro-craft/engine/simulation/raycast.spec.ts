import { castRay } from './raycast';

describe('Raio da mira do PedroCraft', () => {
  const solidAt = (cells: readonly (readonly [number, number, number])[]) => (x: number, y: number, z: number): boolean =>
    cells.some(([cellX, cellY, cellZ]) => cellX === x && cellY === y && cellZ === z);

  it('acerta o bloco à frente e diz por qual face entrou', () => {
    const hit = castRay({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 5, solidAt([[3, 0, 0]]));

    expect(hit).toEqual(jasmine.objectContaining({ x: 3, y: 0, z: 0, normalX: -1, normalY: 0, normalZ: 0 }));
    expect(hit?.distance).toBeCloseTo(2.5, 5);
  });

  it('acerta o chão olhando para baixo, pela face de cima', () => {
    const hit = castRay({ x: 0.5, y: 2.5, z: 0.5 }, { x: 0, y: -1, z: 0 }, 5, solidAt([[0, 0, 0]]));

    expect(hit).toEqual(jasmine.objectContaining({ x: 0, y: 0, z: 0, normalY: 1 }));
  });

  it('não alcança além do braço', () => {
    expect(castRay({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 5, solidAt([[7, 0, 0]]))).toBeNull();
  });

  it('não pula o bloco da quina ao passar na diagonal', () => {
    const direction = { x: Math.SQRT1_2, y: 0, z: Math.SQRT1_2 };
    const hit = castRay({ x: 0.5, y: 0.5, z: 0.9 }, direction, 5, solidAt([[1, 0, 1], [1, 0, 2]]));

    expect(hit).toEqual(jasmine.objectContaining({ x: 1, z: 1 }));
  });
});
