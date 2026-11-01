import { darken } from '../../../art/canvas';
import type { CharacterPalette } from '../../../config/character.config';
import { WARIO_COLORS as COLOR, WARIO_EMBLEM } from '../../../config/wario.config';
import { box, type VoxelBox } from '../voxel-geometry';
import type { CharacterParts } from './character-parts';

/** Modelo próprio: largo e baixo, com membros presos às mesmas juntas da animação. */
export function warioParts(palette: CharacterPalette): CharacterParts {
  return {
    upperBody: [...torso(palette.shirt), ...head(palette.cap), ...emblem()],
    arm: [
      box(0, -0.12, 0, 0.2, 0.26, 0.22, palette.shirt),
      box(0, -0.28, 0, 0.16, 0.14, 0.18, COLOR.skin),
      box(0, -0.38, 0.02, 0.22, 0.18, 0.24, COLOR.glove),
      box(0, -0.37, 0.146, 0.08, 0.035, 0.012, COLOR.emblem),
    ],
    leg: [
      box(0, -0.15, 0, 0.22, 0.3, 0.24, COLOR.overalls),
      box(0, -0.3, 0.055, 0.27, 0.1, 0.35, COLOR.shoe),
    ],
    shoulderX: 0.39,
    shoulderY: 0.87,
    hipX: 0.17,
    hipY: 0.38,
  };
}

function torso(shirt: string): readonly VoxelBox[] {
  return [
    box(0, 0.66, 0, 0.62, 0.48, 0.4, shirt),
    box(0, 0.45, 0.025, 0.64, 0.24, 0.43, COLOR.overalls),
    box(0, 0.64, 0.215, 0.34, 0.24, 0.025, COLOR.overalls),
    ...[-1, 1].flatMap((side) => [
      box(side * 0.19, 0.79, 0.21, 0.075, 0.23, 0.025, COLOR.overalls),
      box(side * 0.19, 0.69, 0.235, 0.07, 0.07, 0.025, '#ffffff'),
      box(side * 0.19, 0.67, -0.21, 0.075, 0.42, 0.025, COLOR.overalls),
    ]),
  ];
}

function head(cap: string): readonly VoxelBox[] {
  return [
    box(0, 1.1, 0, 0.55, 0.42, 0.44, COLOR.skin),
    box(0, 1.22, -0.12, 0.56, 0.22, 0.24, COLOR.hair),
    ...[-1, 1].flatMap((side) => [
      box(side * 0.29, 1.09, 0, 0.1, 0.18, 0.14, COLOR.skin),
      box(side * 0.12, 1.15, 0.23, 0.14, 0.1, 0.025, '#ffffff'),
      box(side * 0.1, 1.14, 0.25, 0.055, 0.07, 0.02, COLOR.emblem),
      box(side * 0.12, 1.22, 0.25, 0.17, 0.035, 0.025, COLOR.mustache),
      // Pontas alternadas do bigode em zigue-zague.
      box(side * 0.1, 1.025, 0.265, 0.12, 0.04, 0.035, COLOR.mustache),
      box(side * 0.19, 1.05, 0.265, 0.1, 0.04, 0.035, COLOR.mustache),
      box(side * 0.24, 1.08, 0.265, 0.055, 0.04, 0.035, COLOR.mustache),
    ]),
    box(0, 0.975, 0.235, 0.27, 0.07, 0.025, '#ffffff'),
    box(0, 1.095, 0.29, 0.18, 0.13, 0.13, COLOR.nose),
    box(0, 1.35, 0, 0.62, 0.16, 0.5, cap),
    box(0, 1.28, 0.3, 0.56, 0.055, 0.24, darken(cap, 0.15)),
    box(0, 1.355, 0.257, 0.21, 0.14, 0.018, '#ffffff'),
  ];
}

function emblem(): readonly VoxelBox[] {
  return WARIO_EMBLEM.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '1'
    ? [box((x - 2) * 0.028, 1.41 - y * 0.024, 0.275, 0.028, 0.024, 0.014, COLOR.emblem)]
    : []));
}
