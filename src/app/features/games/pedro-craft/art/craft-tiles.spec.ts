import type { TextureSpec } from '../models/content.model';
import { paintTile, textureKey, TILE_SIZE } from './craft-tiles';

const INK = '#1f1f1f';
const BAND = '#f4f1e8';

function painted(spec: TextureSpec): (x: number, y: number) => string {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('canvas 2D indisponível no navegador dos testes');
  }

  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  paintTile(context, spec);

  return (x, y) => {
    const [red, green, blue] = context.getImageData(x, y, 1, 1).data;

    return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  };
}

const band = (label: string | null): TextureSpec => ({ pattern: 'panel', colors: ['#ef7d1a', INK, BAND], detail: 'band', label });

describe('Faces pintadas do PedroCraft', () => {
  it('pinta o número da TNT gigante na faixa, centralizado', () => {
    const five = painted(band('5'));
    const fiveHundred = painted(band('500'));

    // "5" tem 3 pixels de largura: começa na coluna 6; a primeira linha do algarismo é cheia.
    expect([five(6, 6), five(7, 6), five(8, 6)]).toEqual([INK, INK, INK]);
    expect(five(5, 6)).withContext('a faixa em volta do número').toBe(BAND);
    // "500" tem 11 pixels: começa na coluna 2; o meio do "0" é vazado.
    expect(fiveHundred(2, 6)).toBe(INK);
    expect(fiveHundred(7, 8)).withContext('o furo do primeiro zero').toBe(BAND);
  });

  it('desenha o símbolo de radiação: a bolinha no meio e o vão entre as pás', () => {
    const radiation = painted({ pattern: 'panel', colors: ['#f2c418', INK, INK], detail: 'radiation', label: null });

    expect(radiation(7, 7)).toBe(INK);
    expect(radiation(7, 3)).withContext('a pá de cima').toBe(INK);
    expect(radiation(11, 5)).withContext('o vão entre a pá de cima e a da direita').not.toBe(INK);
  });

  it('a face com número tem chave própria, e a chave das faces sem número continua a mesma', () => {
    expect(textureKey(band(null))).toBe(`panel|#ef7d1a,${INK},${BAND}|band`);
    expect(textureKey(band('5'))).not.toBe(textureKey(band('50')));
  });
});
