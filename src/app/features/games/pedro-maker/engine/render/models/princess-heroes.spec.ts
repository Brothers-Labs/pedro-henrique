import { paintCharacterIcon } from '../../../art/texture-catalog';
import { DEFAULT_LOOK, paletteFor, swappedPalette } from '../../../config/character.config';
import { HEROES, heroDefinition, nextHero } from '../../../config/hero.config';
import { CORAL_PRINCESS, CROWN_GOLD, ESTRELA_PRINCESS, JADE_PRINCESS, type PrincessColors } from '../../../config/princess.config';
import type { HeroId } from '../../../models/progress.model';
import { characterParts } from './character-parts';

const PRINCESSES: readonly { readonly id: HeroId; readonly colors: PrincessColors }[] = [
  { id: 'estrela', colors: ESTRELA_PRINCESS },
  { id: 'jade', colors: JADE_PRINCESS },
  { id: 'coral', colors: CORAL_PRINCESS },
];

describe('Princesas do Pedro Maker', () => {
  for (const { id, colors } of PRINCESSES) {
    it(`${id} veste vestido, cabelo comprido e coroa de ouro em 3D`, () => {
      const parts = characterParts(paletteFor(DEFAULT_LOOK, id));

      expect(parts.upperBody.some((part) => part.color === colors.dress)).toBeTrue();
      expect(parts.upperBody.some((part) => part.color === colors.hair)).toBeTrue();
      expect(parts.upperBody.some((part) => part.color === CROWN_GOLD)).toBeTrue();
      expect(parts.leg.some((part) => part.color === colors.shoe)).toBeTrue();
    });

    it(`${id} tem retrato nos menus e não pula menos que o Pedro`, () => {
      const canvas = paintCharacterIcon(paletteFor(DEFAULT_LOOK, id));

      expect(canvas.width).toBeGreaterThan(0);
      expect(heroDefinition(id).abilities.jumpMultiplier).toBeGreaterThanOrEqual(1);
      expect(heroDefinition(id).name).toMatch(/^Princesa /);
    });
  }
});

describe('Cogumelo Troca-Personagem: quem vem depois', () => {
  it('passa pela turma inteira em ordem e volta para o primeiro', () => {
    const visited: HeroId[] = [];
    let hero: HeroId = HEROES[0].id;

    for (let swap = 0; swap < HEROES.length; swap += 1) {
      hero = nextHero(hero);
      visited.push(hero);
    }

    expect(new Set(visited).size).toBe(HEROES.length);
    expect(hero).toBe(HEROES[0].id);
    expect(nextHero(HEROES[HEROES.length - 1].id)).toBe(HEROES[0].id);
  });

  it('o Pedro volta com o visual escolhido só quando começou a fase como Pedro', () => {
    const custom = { hero: 'pedro', cap: '#123456', shirt: '#654321', backpack: '#abcdef', backpackStyle: 'rocket' } as const;

    expect(swappedPalette(custom, 'pedro')).toBe(custom);
    expect(swappedPalette(custom, 'jade')).toEqual(paletteFor(DEFAULT_LOOK, 'jade'));
    expect(swappedPalette(paletteFor(DEFAULT_LOOK, 'jade'), 'pedro')).toEqual(paletteFor(DEFAULT_LOOK, 'pedro'));
  });
});
