import { DEFAULT_LOOK, paletteFor } from '../config/character.config';
import { HEROES } from '../config/hero.config';
import { OBJECT_BEHAVIOR } from '../config/object-catalog';
import { TILE_SIZE } from '../config/physics.config';
import { POWER_UP_KINDS, type LevelObjectType, type LevelTheme } from '../models/level.model';
import { THEME_PALETTES } from './palettes';
import { PEDRO_FRAME_HEIGHT, PEDRO_FRAME_WIDTH } from './pedro-art';
import { paintCharacterIcon, paintObjectIcon } from './texture-catalog';

function pixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D indisponível');
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

function paintedPixels(canvas: HTMLCanvasElement): number {
  return pixels(canvas).filter((value, index) => index % 4 === 3 && value > 0).length;
}

describe('Catálogo de arte integrado ao Canvas 2D', () => {
  const types = Object.keys(OBJECT_BEHAVIOR) as LevelObjectType[];

  for (const type of types.filter((type) => type !== 'hint' && type !== 'mascot-tip')) {
    it(`produz um ícone visível, na grade e determinístico para ${type}`, () => {
      const icon = paintObjectIcon({ type }, 'vale');

      expect(icon.width).toBe(TILE_SIZE);
      expect(icon.height).toBe(TILE_SIZE);
      expect(paintedPixels(icon)).toBeGreaterThan(20);
      expect(icon.toDataURL()).toBe(paintObjectIcon({ type }, 'vale').toDataURL());
    });
  }

  for (const type of ['hint', 'mascot-tip'] as const) {
    it(`mantém o gatilho ${type} invisível`, () => {
      expect(paintedPixels(paintObjectIcon({ type }, 'vale'))).toBe(0);
    });
  }

  it('diferencia visualmente os valores das moedas, das pequenas às de milhão', () => {
    const coins = types.filter((type) => type.startsWith('coin-'));
    const images = coins.map((type) => paintObjectIcon({ type }, 'vale').toDataURL());

    expect(coins).toContain('coin-2500');
    expect(coins).toContain('coin-5000');
    expect(coins).toContain('coin-10000');
    expect(coins).toContain('coin-50000');
    expect(coins).toContain('coin-5');
    expect(coins).toContain('coin-25000');
    expect(coins).toContain('coin-1000000');
    expect(new Set(images).size).toBe(coins.length);
  });

  it('distingue cada poder no editor pelo seu desenho', () => {
    const images = POWER_UP_KINDS.map((powerUp) => {
      const icon = paintObjectIcon({ type: 'power-up', properties: { powerUp } }, 'vale');
      expect(paintedPixels(icon)).withContext(powerUp).toBeGreaterThan(20);
      return icon.toDataURL();
    });

    expect(new Set(images).size).toBe(POWER_UP_KINDS.length);
  });

  it('distingue o Lucky Block e o bloco de moedas do bloco surpresa comum', () => {
    const images = (['coins', 'lucky', 'multi-coins'] as const).map((contents) =>
      paintObjectIcon({ type: 'surprise', properties: { contents } }, 'vale').toDataURL(),
    );

    expect(new Set(images).size).toBe(3);
  });

  it('mostra no selo da surpresa o que sai dela: vazia, moedas, cristal, coração, cogumelo ou outro poder', () => {
    const images = (
      [
        { contents: 'empty' },
        { contents: 'coins' },
        { contents: 'crystal' },
        { contents: 'heart' },
        { contents: 'power-up', powerUp: 'mushroom' },
        { contents: 'power-up', powerUp: 'star' },
      ] as const
    ).map((properties) => paintObjectIcon({ type: 'surprise', properties }, 'vale').toDataURL());

    expect(new Set(images).size).toBe(6);
    expect(paintObjectIcon({ type: 'surprise' }, 'vale').toDataURL()).withContext('sem conteúdo, o selo das moedas').toBe(images[1]);
  });

  it('pinta o Bloco ON/OFF, o Vermelho e o Azul cada um com a sua cara', () => {
    const images = (['on-off-switch', 'red-block', 'blue-block'] as const).map((type) => paintObjectIcon({ type }, 'vale').toDataURL());

    expect(new Set(images).size).toBe(3);
  });

  for (const theme of Object.keys(THEME_PALETTES) as LevelTheme[]) {
    it(`adapta a vegetação e o terreno ao tema ${theme}`, () => {
      for (const type of ['ground', 'stone', 'ice', 'tree', 'bush', 'flower', 'rock', 'grass'] as const) {
        const icon = paintObjectIcon({ type }, theme);
        expect(paintedPixels(icon)).withContext(type).toBeGreaterThan(20);
        expect(icon.toDataURL()).withContext(type).toBe(paintObjectIcon({ type }, theme).toDataURL());
      }
    });
  }

  it('troca a silhueta da árvore entre vale, deserto, praia e neve', () => {
    const images = (['vale', 'deserto', 'praia', 'gelo'] as const).map((theme) =>
      paintObjectIcon({ type: 'tree' }, theme).toDataURL(),
    );
    expect(new Set(images).size).toBe(4);
  });

  for (const hero of HEROES) {
    it(`amplia o retrato de ${hero.name} com fundo transparente`, () => {
      const palette = paletteFor(DEFAULT_LOOK, hero.id);
      const icon = paintCharacterIcon(palette, 2);
      expect(icon.width).toBe(PEDRO_FRAME_WIDTH * 2);
      expect(icon.height).toBe(PEDRO_FRAME_HEIGHT * 2);
      expect(paintedPixels(icon)).toBeGreaterThan(paintedPixels(paintCharacterIcon(palette)));
      expect(pixels(icon)[3]).toBe(0);
      expect(icon.toDataURL()).toBe(paintCharacterIcon(palette, 2).toDataURL());
    });
  }

  it('mantém os retratos dos cinco heróis reconhecíveis e diferentes', () => {
    const images = HEROES.map((hero) => paintCharacterIcon(paletteFor(DEFAULT_LOOK, hero.id)).toDataURL());
    expect(new Set(images).size).toBe(HEROES.length);
  });

  it('mostra as mochilas escolhidas no retrato do Pedro', () => {
    const palette = paletteFor(DEFAULT_LOOK, 'pedro');
    const images = (['dino', 'rocket', 'star', 'none'] as const).map((backpackStyle) =>
      paintCharacterIcon({ ...palette, backpackStyle }).toDataURL(),
    );
    expect(new Set(images).size).toBe(4);
  });
});
