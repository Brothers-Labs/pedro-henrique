import { darken, lighten } from '../../../art/canvas';
import type { CharacterPalette } from '../../../config/character.config';
import { box, type VoxelBox } from '../voxel-geometry';
import type { CharacterParts } from './character-parts';

const SKIN = '#f2c29b';
const HAIR = '#5a3a22';
const JEANS = '#3b5bdb';
const SHOE = '#2a2350';
const EYE = '#2a2350';

/** O Pedro de cubos, com o boné, a camiseta e a mochila escolhidos em "Meu personagem". */
export function pedroParts(palette: CharacterPalette): CharacterParts {
  return {
    upperBody: [...pedroUpperBody(palette), ...backpack(palette)],
    arm: [box(0, -0.12, 0, 0.14, 0.26, 0.16, palette.shirt), box(0, -0.32, 0, 0.13, 0.16, 0.14, SKIN)],
    leg: [box(0, -0.19, 0, 0.18, 0.38, 0.2, JEANS), box(0, -0.38, 0.03, 0.2, 0.08, 0.27, SHOE)],
    shoulderX: 0.33,
    shoulderY: 0.84,
    hipX: 0.12,
    hipY: 0.42,
  };
}

function pedroUpperBody(palette: CharacterPalette): readonly VoxelBox[] {
  const cap = palette.cap;

  return [
    // Tronco e cinto.
    box(0, 0.64, 0, 0.52, 0.44, 0.3, palette.shirt),
    box(0, 0.44, 0, 0.53, 0.06, 0.31, darken(palette.shirt, 0.35)),
    box(0, 0.76, 0.152, 0.18, 0.1, 0.01, lighten(palette.shirt, 0.3)),
    // Cabeça, cabelo e rosto.
    box(0, 1.08, 0, 0.46, 0.44, 0.42, SKIN),
    box(0, 1.2, -0.1, 0.48, 0.24, 0.26, HAIR),
    box(-0.235, 1.06, -0.02, 0.03, 0.26, 0.3, HAIR),
    box(0.235, 1.06, -0.02, 0.03, 0.26, 0.3, HAIR),
    box(-0.1, 1.09, 0.215, 0.08, 0.1, 0.02, EYE),
    box(0.1, 1.09, 0.215, 0.08, 0.1, 0.02, EYE),
    box(-0.08, 1.115, 0.226, 0.03, 0.03, 0.01, '#ffffff'),
    box(0.12, 1.115, 0.226, 0.03, 0.03, 0.01, '#ffffff'),
    box(0, 0.97, 0.215, 0.12, 0.04, 0.02, '#c9605a'),
    box(-0.17, 1.0, 0.212, 0.07, 0.04, 0.01, '#f59a9a'),
    box(0.17, 1.0, 0.212, 0.07, 0.04, 0.01, '#f59a9a'),
    // Boné com aba para a frente.
    box(0, 1.36, 0, 0.5, 0.14, 0.46, cap),
    box(0, 1.3, 0.3, 0.46, 0.05, 0.2, darken(cap, 0.15)),
    box(0, 1.44, 0, 0.08, 0.03, 0.08, lighten(cap, 0.35)),
  ];
}

function backpack(palette: CharacterPalette): readonly VoxelBox[] {
  const color = palette.backpack;

  switch (palette.backpackStyle) {
    case 'none':
      return [];
    case 'dino':
      return [
        box(0, 0.66, -0.24, 0.38, 0.42, 0.18, color),
        box(0, 0.9, -0.3, 0.08, 0.08, 0.08, darken(color, 0.25)),
        box(0, 0.76, -0.35, 0.08, 0.08, 0.08, darken(color, 0.25)),
        box(0, 0.6, -0.35, 0.08, 0.08, 0.08, darken(color, 0.25)),
      ];
    case 'rocket':
      return [
        box(-0.1, 0.68, -0.25, 0.14, 0.44, 0.16, color),
        box(0.1, 0.68, -0.25, 0.14, 0.44, 0.16, color),
        box(-0.1, 0.42, -0.25, 0.1, 0.08, 0.1, '#ff8a3d'),
        box(0.1, 0.42, -0.25, 0.1, 0.08, 0.1, '#ff8a3d'),
      ];
    case 'star':
      return [
        box(0, 0.66, -0.24, 0.36, 0.4, 0.16, color),
        box(0, 0.68, -0.33, 0.16, 0.16, 0.02, '#fff3bf'),
      ];
  }
}
