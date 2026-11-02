import { paintCharacterIcon } from '../../../art/texture-catalog';
import { DEFAULT_LOOK, paletteFor } from '../../../config/character.config';
import { HEROES } from '../../../config/hero.config';
import {
  ANA_OVERALLS,
  BRUNO_OVERALLS,
  CAIO_OVERALLS,
  GIUSEPPE_OVERALLS,
  NINA_OVERALLS,
  OTTO_OVERALLS,
  TINA_OVERALLS,
  ZECA_OVERALLS,
} from '../../../config/overalls.config';
import type { HeroId } from '../../../models/progress.model';
import { characterParts } from './character-parts';

const ORIGINAL_HEROES: readonly { readonly id: HeroId; readonly overalls: string; readonly hair: string }[] = [
  { id: 'giuseppe', overalls: GIUSEPPE_OVERALLS.overalls, hair: GIUSEPPE_OVERALLS.hair },
  { id: 'zeca', overalls: ZECA_OVERALLS.overalls, hair: ZECA_OVERALLS.hair },
  { id: 'tina', overalls: TINA_OVERALLS.overalls, hair: TINA_OVERALLS.hair },
  { id: 'bruno', overalls: BRUNO_OVERALLS.overalls, hair: BRUNO_OVERALLS.hair },
  { id: 'ana', overalls: ANA_OVERALLS.overalls, hair: ANA_OVERALLS.hair },
  { id: 'caio', overalls: CAIO_OVERALLS.overalls, hair: CAIO_OVERALLS.hair },
  { id: 'nina', overalls: NINA_OVERALLS.overalls, hair: NINA_OVERALLS.hair },
  { id: 'otto', overalls: OTTO_OVERALLS.overalls, hair: OTTO_OVERALLS.hair },
];

describe('Heróis originais do Pedro Maker', () => {
  it('nenhum herói pula menos que o Pedro, para toda fase validada continuar possível', () => {
    expect(HEROES.every((hero) => hero.abilities.jumpMultiplier >= 1)).toBeTrue();
  });

  for (const hero of ORIGINAL_HEROES) {
    it(`${hero.id} veste macacão e cabelo próprios em 3D`, () => {
      const parts = characterParts(paletteFor(DEFAULT_LOOK, hero.id));

      expect(parts.leg.some((part) => part.color === hero.overalls)).toBeTrue();
      expect(parts.upperBody.some((part) => part.color === hero.hair)).toBeTrue();
    });

    it(`${hero.id} tem retrato nos menus`, () => {
      const canvas = paintCharacterIcon(paletteFor(DEFAULT_LOOK, hero.id));

      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });
  }

  it('cada herói tem nome único', () => {
    const names = HEROES.map((hero) => hero.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('o Mario continua de macacão azul clássico', () => {
    const parts = characterParts(paletteFor(DEFAULT_LOOK, 'mario'));

    expect(parts.leg.some((part) => part.color === '#2f5fd0')).toBeTrue();
  });
});
