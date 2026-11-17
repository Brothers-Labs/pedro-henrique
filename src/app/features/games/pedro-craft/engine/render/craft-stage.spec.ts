import { AVATAR_LAYERS, PLAYER_VIEW_LAYERS, playerViewports } from './craft-stage';

describe('Tela dividida do PedroCraft', () => {
  it('com um jogador, a vista é a tela inteira', () => {
    expect(playerViewports(1, 1280, 720)).toEqual([{ x: 0, y: 0, width: 1280, height: 720 }]);
  });

  it('com dois, divide ao meio: Jogador 1 à esquerda e Jogador 2 à direita', () => {
    expect(playerViewports(2, 1280, 720)).toEqual([
      { x: 0, y: 0, width: 640, height: 720 },
      { x: 640, y: 0, width: 640, height: 720 },
    ]);
  });

  it('com três, divide em quatro: Jogadores 1 e 2 em cima e o Jogador 3 embaixo à esquerda', () => {
    // O WebGL conta a altura a partir de baixo: a linha de cima começa no meio.
    expect(playerViewports(3, 1280, 720)).toEqual([
      { x: 0, y: 360, width: 640, height: 360 },
      { x: 640, y: 360, width: 640, height: 360 },
      { x: 0, y: 0, width: 640, height: 360 },
    ]);
  });

  it('com três, cada vista tem o formato da tela inteira, sem faixa esticada', () => {
    for (const viewport of playerViewports(3, 1920, 1080)) {
      expect(viewport.width / viewport.height).toBeCloseTo(1920 / 1080, 5);
    }
  });

  it('numa tela de tamanho ímpar, as vistas cobrem tudo, sem buraco nem sobra', () => {
    const [first, second, third] = playerViewports(3, 1281, 721);

    expect(first.width + second.width).toBe(1281);
    expect(second.x).toBe(first.width);
    expect(third.height + first.height).toBe(721);
    expect(first.y).toBe(third.height);
  });

  it('a mão de cada um e o corpo de cada um moram em camadas diferentes', () => {
    const layers: readonly number[] = [...PLAYER_VIEW_LAYERS, ...AVATAR_LAYERS];

    expect(new Set(layers).size).toBe(layers.length);
    expect(layers).not.toContain(0);
  });
});
