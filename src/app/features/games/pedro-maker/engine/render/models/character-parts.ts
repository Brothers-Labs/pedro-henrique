import type { CharacterPalette } from '../../../config/character.config';
import type { VoxelBox } from '../voxel-geometry';
import { guiParts } from './gui-parts';
import { pedroParts } from './pedro-parts';

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
    case 'gui':
      return guiParts(palette);
  }
}
