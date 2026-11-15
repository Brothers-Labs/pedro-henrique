import { darken } from '../../../art/canvas';
import {
  CORAL_PRINCESS,
  CROWN_GOLD,
  DAISY_PRINCESS,
  ESTRELA_PRINCESS,
  JADE_PRINCESS,
  PEACH_PRINCESS,
  type PrincessColors,
} from '../../../config/princess.config';
import { box, type VoxelBox } from '../voxel-geometry';
import type { CharacterParts } from './character-parts';

const SKIN = '#f2c29b';
const EYE = '#2a2350';
const TIGHTS = '#fff4f8';

/** Perna de referência, a mesma do herói alto de macacão: o resto do corpo desce junto quando ela é menor. */
const TALL_LEG = 0.46;

export interface PrincessBuild {
  readonly legLength: number;
  readonly colors: PrincessColors;
}

export const ESTRELA_BUILD: PrincessBuild = { legLength: 0.42, colors: ESTRELA_PRINCESS };
export const JADE_BUILD: PrincessBuild = { legLength: 0.38, colors: JADE_PRINCESS };
export const CORAL_BUILD: PrincessBuild = { legLength: TALL_LEG, colors: CORAL_PRINCESS };
export const PEACH_BUILD: PrincessBuild = { legLength: TALL_LEG, colors: PEACH_PRINCESS };
export const DAISY_BUILD: PrincessBuild = { legLength: 0.44, colors: DAISY_PRINCESS };

/**
 * Princesa de cubos: vestido rodado em dois andares, cabelo comprido caindo
 * nas costas e coroa de ouro com uma pedra. As pernas balançam por baixo da
 * saia como as dos outros heróis, então ela anda e pula do mesmo jeito.
 */
export function princessParts(build: PrincessBuild): CharacterParts {
  const { colors } = build;
  const drop = build.legLength - TALL_LEG;
  const upperBody = [...dress(colors), ...head(colors), ...earrings(colors)];

  return {
    upperBody: upperBody.map((part) => ({ ...part, y: part.y + drop })),
    arm: [box(0, -0.11, 0, 0.14, 0.22, 0.16, colors.dress), box(0, -0.32, 0, 0.11, 0.2, 0.12, SKIN)],
    leg: [
      box(0, -build.legLength / 2, 0, 0.14, build.legLength, 0.16, TIGHTS),
      box(0, -build.legLength, 0.04, 0.17, 0.08, 0.26, colors.shoe),
    ],
    shoulderX: 0.28,
    shoulderY: 0.96 + drop,
    hipX: 0.1,
    hipY: 0.5 + drop,
  };
}

function dress(colors: PrincessColors): readonly VoxelBox[] {
  const { dress: color, trim, gem } = colors;

  return [
    // Corpete, faixa na cintura e a saia que abre em dois andares até a barra.
    box(0, 0.8, 0, 0.42, 0.44, 0.27, color),
    box(0, 0.94, 0.137, 0.07, 0.07, 0.01, gem),
    box(0, 0.62, 0, 0.44, 0.05, 0.28, trim),
    box(0, 0.5, 0, 0.52, 0.2, 0.36, color),
    box(0, 0.3, 0, 0.64, 0.22, 0.46, darken(color, 0.08)),
    box(0, 0.2, 0, 0.66, 0.04, 0.48, trim),
  ];
}

/** Mechas dos lados e o cabelo de trás: comprido até as costas, ou curto na altura dos ombros. */
function hairDown(colors: PrincessColors): readonly VoxelBox[] {
  const { hair } = colors;

  if (colors.shortHair) {
    return [
      box(-0.215, 1.2, -0.04, 0.04, 0.26, 0.32, hair),
      box(0.215, 1.2, -0.04, 0.04, 0.26, 0.32, hair),
      box(0, 1.17, -0.215, 0.44, 0.4, 0.08, hair),
      // As pontas viradas para fora, como o cabelo da Daisy.
      box(-0.25, 1.08, -0.04, 0.06, 0.06, 0.3, hair),
      box(0.25, 1.08, -0.04, 0.06, 0.06, 0.3, hair),
    ];
  }

  return [
    box(-0.215, 1.12, -0.04, 0.04, 0.42, 0.32, hair),
    box(0.215, 1.12, -0.04, 0.04, 0.42, 0.32, hair),
    box(0, 1.06, -0.215, 0.44, 0.62, 0.08, hair),
  ];
}

/** Brincos pendurados por baixo das mechas, um de cada lado do rosto. */
function earrings(colors: PrincessColors): readonly VoxelBox[] {
  const { earring } = colors;

  if (!earring) {
    return [];
  }

  return [-1, 1].map((side) => box(side * 0.25, 1.0, 0.06, 0.05, 0.07, 0.05, earring));
}

function head(colors: PrincessColors): readonly VoxelBox[] {
  const { hair, gem } = colors;

  return [
    // Rosto com olhos grandes, bochechas e boca rosada.
    box(0, 1.22, 0, 0.4, 0.4, 0.4, SKIN),
    box(-0.09, 1.24, 0.205, 0.07, 0.11, 0.02, EYE),
    box(0.09, 1.24, 0.205, 0.07, 0.11, 0.02, EYE),
    box(-0.07, 1.27, 0.216, 0.03, 0.03, 0.01, '#ffffff'),
    box(0.11, 1.27, 0.216, 0.03, 0.03, 0.01, '#ffffff'),
    box(0, 1.1, 0.205, 0.1, 0.035, 0.02, '#e0607e'),
    box(-0.15, 1.14, 0.202, 0.06, 0.04, 0.01, '#f59a9a'),
    box(0.15, 1.14, 0.202, 0.06, 0.04, 0.01, '#f59a9a'),
    // Cabelo: topo, franja, mechas dos lados e o comprido que cai nas costas.
    box(0, 1.38, -0.02, 0.43, 0.12, 0.43, hair),
    box(0, 1.385, 0.195, 0.42, 0.07, 0.04, hair),
    ...hairDown(colors),
    // Coroa de ouro com três pontas e a pedra na frente.
    box(0, 1.48, 0, 0.3, 0.07, 0.3, CROWN_GOLD),
    box(-0.11, 1.55, 0.11, 0.06, 0.08, 0.05, CROWN_GOLD),
    box(0, 1.57, 0.11, 0.06, 0.12, 0.05, CROWN_GOLD),
    box(0.11, 1.55, 0.11, 0.06, 0.08, 0.05, CROWN_GOLD),
    box(0, 1.48, 0.152, 0.06, 0.05, 0.01, gem),
  ];
}
