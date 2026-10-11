import { buildTrailLayout, TRAIL_WIDTH, trailPath } from './trail-layout';

describe('buildTrailLayout', () => {
  it('posiciona uma fase por ponto, dentro da prancheta', () => {
    for (const columns of [1, 3, 5]) {
      const layout = buildTrailLayout(10, columns);

      expect(layout.points.length).withContext(`colunas: ${columns}`).toBe(10);
      expect(layout.points.every((point) => point.x > 0 && point.x < TRAIL_WIDTH)).toBeTrue();
      expect(layout.points.every((point) => point.y > 0 && point.y < layout.height)).toBeTrue();
    }
  });

  it('desce uma fileira por fase numa coluna só (celular)', () => {
    const layout = buildTrailLayout(10, 1);
    const ys = layout.points.map((point) => point.y);

    expect(ys.every((y, index) => index === 0 || y > ys[index - 1])).toBeTrue();
  });

  it('serpenteia: a segunda fileira volta no sentido contrário', () => {
    const layout = buildTrailLayout(10, 5);
    const firstRow = layout.points.slice(0, 5).map((point) => point.x);
    const secondRow = layout.points.slice(5, 10).map((point) => point.x);

    expect(firstRow[0]).toBeLessThan(firstRow[4]);
    expect(secondRow[0]).toBeGreaterThan(secondRow[4]);
  });

  it('fica mais baixa com mais colunas, para caber na tela larga', () => {
    expect(buildTrailLayout(10, 5).height).toBeLessThan(buildTrailLayout(10, 1).height);
  });

  it('não depende de dez fases: aceita 15, 20 ou 30', () => {
    for (const count of [15, 20, 30]) {
      const layout = buildTrailLayout(count, 5);

      expect(layout.points.length).toBe(count);
      expect(layout.segments.length).toBe(count - 1);
    }
  });

  it('guarda espaço para enfeites longe das fases', () => {
    const layout = buildTrailLayout(10, 3);

    expect(layout.decorationSpots.length).toBeGreaterThan(0);

    for (const spot of layout.decorationSpots) {
      const nearest = Math.min(...layout.points.map((point) => Math.hypot(point.x - spot.x, point.y - spot.y)));

      expect(nearest).toBeGreaterThan(100);
    }
  });

  it('desenha o caminho percorrido como começo do caminho inteiro', () => {
    const layout = buildTrailLayout(6, 3);
    const full = trailPath(layout);
    const walked = trailPath(layout, 2);

    expect(full.startsWith(walked)).toBeTrue();
    expect(walked.split('C').length - 1).toBe(2);
    expect(trailPath(layout, 0)).toMatch(/^M [\d.]+ [\d.]+$/);
  });

  it('não quebra sem fases', () => {
    const layout = buildTrailLayout(0, 5);

    expect(layout.points).toEqual([]);
    expect(trailPath(layout)).toBe('');
  });
});
