import { darken } from '../../../art/canvas';
import type { CharacterPalette } from '../../../config/character.config';
import { box, type VoxelBox } from '../voxel-geometry';
import type { CharacterParts } from './character-parts';

const SKIN = '#f2c29b';
const NOSE = '#e8a984';
const HAIR = '#3a2516';
const MUSTACHE = '#2a1a10';
const EYE = '#2a2350';
const OVERALLS = '#2f5fd0';
const BUTTON = '#ffd23f';
const SHOE = '#6b3f22';

/** Perna mais comprida do grupo, a do Gui e do Luigi; as medidas abaixo partem dela. */
const TALL_LEG = 0.46;

/** O que muda entre os heróis de macacão: o comprimento das pernas e o bigode. */
export interface OverallsBuild {
  readonly legLength: number;
  readonly hasMustache: boolean;
}

export const WARIO_BUILD: OverallsBuild = { legLength: 0.32, hasMustache: true };

export const GUI_BUILD: OverallsBuild = { legLength: TALL_LEG, hasMustache: false };
export const LUIGI_BUILD: OverallsBuild = { legLength: TALL_LEG, hasMustache: true };
export const MARIO_BUILD: OverallsBuild = { legLength: 0.36, hasMustache: true };

/**
 * Herói de cubos de boné, camiseta e macacão azul com botões amarelos: o
 * Gui, o Luigi e o Mario.
 *
 * Gui e Luigi são altos e magros; o Mario tem as pernas mais curtas, e todo o
 * corpo desce junto. A cabeça é um pouco menor que a do Pedro, e eles parecem
 * esguios mesmo do lado dele.
 */
export function overallsParts(palette: CharacterPalette, build: OverallsBuild): CharacterParts {
  const overalls = palette.hero === 'wario' ? '#7b35b5' : OVERALLS;
  const drop = build.legLength - TALL_LEG;
  const upperBody = [...torso(palette.shirt, overalls), ...head(palette.cap), ...(build.hasMustache ? mustache() : [])];

  return {
    upperBody: upperBody.map((part) => ({ ...part, y: part.y + drop })),
    arm: [box(0, -0.13, 0, 0.13, 0.28, 0.15, palette.shirt), box(0, -0.35, 0, 0.12, 0.16, 0.13, SKIN)],
    leg: [
      box(0, -build.legLength / 2, 0, 0.16, build.legLength, 0.18, overalls),
      box(0, -build.legLength, 0.04, 0.19, 0.08, 0.28, SHOE),
    ],
    shoulderX: 0.29,
    shoulderY: 0.96 + drop,
    hipX: 0.11,
    hipY: 0.5 + drop,
  };
}

function torso(shirt: string, overalls: string): readonly VoxelBox[] {
  return [
    // Camiseta por baixo e o macacão por cima, com peitilho, alças e botões.
    box(0, 0.8, 0, 0.44, 0.44, 0.28, shirt),
    box(0, 0.6, 0, 0.45, 0.2, 0.29, overalls),
    box(0, 0.8, 0.142, 0.26, 0.2, 0.01, overalls),
    box(-0.13, 0.95, 0.142, 0.06, 0.12, 0.01, overalls),
    box(0.13, 0.95, 0.142, 0.06, 0.12, 0.01, overalls),
    box(-0.13, 0.85, -0.142, 0.06, 0.32, 0.01, overalls),
    box(0.13, 0.85, -0.142, 0.06, 0.32, 0.01, overalls),
    box(-0.09, 0.87, 0.15, 0.05, 0.05, 0.01, BUTTON),
    box(0.09, 0.87, 0.15, 0.05, 0.05, 0.01, BUTTON),
  ];
}

function head(cap: string): readonly VoxelBox[] {
  return [
    // Cabeça, cabelo, costeletas e rosto com o nariz redondo.
    box(0, 1.22, 0, 0.4, 0.4, 0.4, SKIN),
    box(0, 1.32, -0.1, 0.42, 0.22, 0.22, HAIR),
    box(-0.205, 1.2, -0.02, 0.03, 0.22, 0.28, HAIR),
    box(0.205, 1.2, -0.02, 0.03, 0.22, 0.28, HAIR),
    box(-0.09, 1.24, 0.205, 0.07, 0.1, 0.02, EYE),
    box(0.09, 1.24, 0.205, 0.07, 0.1, 0.02, EYE),
    box(-0.07, 1.265, 0.216, 0.03, 0.03, 0.01, '#ffffff'),
    box(0.11, 1.265, 0.216, 0.03, 0.03, 0.01, '#ffffff'),
    box(0, 1.17, 0.22, 0.08, 0.07, 0.05, NOSE),
    box(0, 1.1, 0.205, 0.12, 0.035, 0.02, '#c9605a'),
    box(-0.15, 1.13, 0.202, 0.06, 0.04, 0.01, '#f59a9a'),
    box(0.15, 1.13, 0.202, 0.06, 0.04, 0.01, '#f59a9a'),
    // Boné com aba para a frente e o emblema redondo.
    box(0, 1.48, 0, 0.44, 0.14, 0.42, cap),
    box(0, 1.42, 0.27, 0.4, 0.05, 0.2, darken(cap, 0.15)),
    box(0, 1.49, 0.212, 0.14, 0.1, 0.01, '#ffffff'),
    box(0, 1.49, 0.218, 0.06, 0.05, 0.01, cap),
  ];
}

/** Bigodão logo abaixo do nariz, por cima do sorriso. */
function mustache(): readonly VoxelBox[] {
  return [box(0, 1.12, 0.222, 0.26, 0.05, 0.03, MUSTACHE), box(0, 1.105, 0.222, 0.16, 0.03, 0.03, MUSTACHE)];
}
