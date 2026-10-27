import { box, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { CreatureDefinition } from '../models/content.model';

const EYE = '#ffffff';
const PUPIL = '#1f1f1f';

/**
 * Modelos de cubos dos animais, em blocos, com os pés em y = 0 e a cabeça
 * para -z (a frente do olhar, como a do herói).
 *
 * As cores vêm do `creatures.json`: a posição de cada cor na lista é a parte
 * do corpo que ela pinta. Animal sem desenho próprio ainda aparece, como um
 * bloco com cabeça das cores dele — nunca some do mundo.
 */
export function creatureBoxes(definition: CreatureDefinition, isShorn: boolean): readonly VoxelBox[] {
  const colors = definition.colors;
  const color = (index: number): string => colors[index] ?? colors[0];

  switch (definition.model) {
    case 'sheep':
      return sheep(color(0), color(1), color(2), isShorn);
    case 'cow':
      return cow(color(0), color(1), color(2));
    case 'chicken':
      return chicken(color(0), color(1), color(2));
    default:
      return placeholder(definition, color(0), color(1));
  }
}

/** Cores: lã, cara e patas, pele tosquiada. Sem lã, o corpo fica fino e rosado. */
function sheep(wool: string, face: string, skin: string, isShorn: boolean): readonly VoxelBox[] {
  const coat = isShorn
    ? [box(0, 0.68, 0.05, 0.56, 0.4, 0.8, skin)]
    : [box(0, 0.72, 0.05, 0.82, 0.58, 1, wool), box(0, 1.17, -0.5, 0.42, 0.12, 0.3, wool)];

  return [
    ...legs(0.24, 0.32, 0.18, 0.46, face),
    ...coat,
    box(0, 0.95, -0.58, 0.36, 0.36, 0.32, face),
    ...eyes(0.1, 1.01, -0.745),
  ];
}

/** Cores: manchas e cabeça, corpo, focinho. */
function cow(patches: string, hide: string, snout: string): readonly VoxelBox[] {
  return [
    ...legs(0.26, 0.38, 0.22, 0.55, patches),
    box(0, 0.85, 0.05, 0.84, 0.6, 1.2, hide),
    box(0.3, 0.92, 0.2, 0.26, 0.36, 0.5, patches),
    box(-0.3, 0.8, -0.15, 0.26, 0.3, 0.4, patches),
    box(0, 1.05, -0.72, 0.5, 0.46, 0.36, patches),
    box(0, 0.93, -0.92, 0.4, 0.2, 0.06, snout),
    box(0.2, 1.33, -0.72, 0.08, 0.12, 0.08, hide),
    box(-0.2, 1.33, -0.72, 0.08, 0.12, 0.08, hide),
    ...eyes(0.14, 1.12, -0.905),
  ];
}

/** Cores: penas, crista, bico e pés. */
function chicken(feathers: string, comb: string, beak: string): readonly VoxelBox[] {
  return [
    box(0.08, 0.1, 0, 0.05, 0.2, 0.05, beak),
    box(-0.08, 0.1, 0, 0.05, 0.2, 0.05, beak),
    box(0, 0.35, 0.04, 0.36, 0.3, 0.44, feathers),
    box(0, 0.6, -0.16, 0.22, 0.26, 0.2, feathers),
    box(0, 0.58, -0.3, 0.1, 0.07, 0.08, beak),
    box(0, 0.76, -0.16, 0.06, 0.06, 0.12, comb),
    box(0, 0.5, -0.27, 0.06, 0.08, 0.04, comb),
    ...eyes(0.07, 0.65, -0.265),
  ];
}

function placeholder(definition: CreatureDefinition, bodyColor: string, headColor: string): readonly VoxelBox[] {
  const bodyHeight = definition.height * 0.7;
  const headSize = Math.min(definition.width, definition.height * 0.3);

  return [
    box(0, bodyHeight / 2, 0, definition.width, bodyHeight, definition.width, bodyColor),
    box(0, bodyHeight + headSize / 2, -definition.width * 0.1, headSize, headSize, headSize, headColor),
  ];
}

function legs(offsetX: number, offsetZ: number, size: number, height: number, color: string): readonly VoxelBox[] {
  return [
    box(offsetX, height / 2, offsetZ, size, height, size, color),
    box(-offsetX, height / 2, offsetZ, size, height, size, color),
    box(offsetX, height / 2, -offsetZ, size, height, size, color),
    box(-offsetX, height / 2, -offsetZ, size, height, size, color),
  ];
}

/** Olhos grandes e redondinhos: um branco com a pupila por cima, um de cada lado da cara. */
function eyes(offsetX: number, y: number, z: number): readonly VoxelBox[] {
  return [
    box(offsetX, y, z, 0.08, 0.08, 0.02, EYE),
    box(-offsetX, y, z, 0.08, 0.08, 0.02, EYE),
    box(offsetX, y - 0.01, z - 0.012, 0.04, 0.05, 0.01, PUPIL),
    box(-offsetX, y - 0.01, z - 0.012, 0.04, 0.05, 0.01, PUPIL),
  ];
}
