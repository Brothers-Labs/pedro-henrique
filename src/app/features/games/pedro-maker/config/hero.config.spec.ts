import { characterParts } from '../engine/render/models/character-parts';
import { pedroParts } from '../engine/render/models/pedro-parts';
import { DEFAULT_LOOK, paletteFor } from './character.config';
import { HEROES, heroDefinition, isHeroId, PEDRERE_RED } from './hero.config';

describe('Pedro Pedrerê no Pedro Maker', () => {
  it('é um herói da turma, sem pular menos que o Pedro', () => {
    expect(isHeroId('pedrere')).toBeTrue();
    expect(HEROES.map((hero) => hero.id)).toContain('pedrere');
    expect(heroDefinition('pedrere').abilities.jumpMultiplier).toBeGreaterThanOrEqual(1);
  });

  it('veste sempre a roupa do Pedro Pedrerê: boné e camiseta vermelhos, sem mochila', () => {
    const look = { cap: 'bone-verde', shirt: 'camiseta-azul', backpack: 'mochila-foguete' };

    expect(paletteFor(look, 'pedrere')).toEqual({
      hero: 'pedrere',
      cap: PEDRERE_RED,
      shirt: PEDRERE_RED,
      backpack: '#cccccc',
      backpackStyle: 'none',
    });
  });

  it('tem o corpo de cubos do Pedro, com as cores de lá', () => {
    const palette = paletteFor(DEFAULT_LOOK, 'pedrere');

    expect(characterParts(palette)).toEqual(pedroParts(palette));
  });
});
