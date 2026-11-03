import type { CharacterPalette } from '../../../config/character.config';
import type { VoxelBox } from '../voxel-geometry';
import {
  ANA_BUILD,
  BRUNO_BUILD,
  CAIO_BUILD,
  DUDA_BUILD,
  GIUSEPPE_BUILD,
  GUI_BUILD,
  LUIGI_BUILD,
  MARIO_BUILD,
  NINA_BUILD,
  OTTO_BUILD,
  overallsParts,
  RAFA_BUILD,
  TINA_BUILD,
  VAVA_BUILD,
  ZECA_BUILD,
} from './overalls-parts';
import { pedroParts } from './pedro-parts';
import { warioParts } from './wario-parts';

/**
 * Peças de cubos de um herói e onde cada membro se prende ao corpo.
 *
 * Braços e pernas são desenhados a partir da junta (ombro ou quadril), para
 * girarem no lugar certo; o tronco já vem na altura final, com cabeça e boné.
 */
export interface CharacterParts {
  /** Tronco, cabeça, boné e acessórios das costas. */
  readonly upperBody: readonly VoxelBox[];
  readonly arm: readonly VoxelBox[];
  readonly leg: readonly VoxelBox[];
  readonly shoulderX: number;
  readonly shoulderY: number;
  readonly hipX: number;
  readonly hipY: number;
}

export function characterParts(palette: CharacterPalette): CharacterParts {
  switch (palette.hero) {
    case 'pedro':
      return pedroParts(palette);
    case 'wario':
      return warioParts(palette);
    case 'gui':
      return overallsParts(palette, GUI_BUILD);
    case 'mario':
      return overallsParts(palette, MARIO_BUILD);
    case 'luigi':
      return overallsParts(palette, LUIGI_BUILD);
    case 'giuseppe':
      return overallsParts(palette, GIUSEPPE_BUILD);
    case 'zeca':
      return overallsParts(palette, ZECA_BUILD);
    case 'tina':
      return overallsParts(palette, TINA_BUILD);
    case 'bruno':
      return overallsParts(palette, BRUNO_BUILD);
    case 'ana':
      return overallsParts(palette, ANA_BUILD);
    case 'caio':
      return overallsParts(palette, CAIO_BUILD);
    case 'nina':
      return overallsParts(palette, NINA_BUILD);
    case 'otto':
      return overallsParts(palette, OTTO_BUILD);
    case 'vava':
      return overallsParts(palette, VAVA_BUILD);
    case 'rafa':
      return overallsParts(palette, RAFA_BUILD);
    case 'duda':
      return overallsParts(palette, DUDA_BUILD);
  }
}
