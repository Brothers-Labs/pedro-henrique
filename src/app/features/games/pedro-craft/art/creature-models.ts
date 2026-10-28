import { box, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { CreatureDefinition } from '../models/content.model';

const EYE = '#ffffff';
const PUPIL = '#1f1f1f';

/**
 * Modelos de cubos dos bichos, em blocos, com os pés em y = 0 e a cabeça
 * para -z (a frente do olhar, como a do herói).
 *
 * As cores vêm do `creatures.json`: a posição de cada cor na lista é a parte
 * do corpo que ela pinta. Os inimigos são fofos de propósito — olhos grandes,
 * nada de dentes nem sangue.
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
    case 'slime':
      return slime(definition, color(0), color(1));
    case 'scarecrow':
      return scarecrow(color(0), color(1), color(2), color(3));
    case 'spider':
      return spider(color(0), color(1), color(2));
    case 'skeleton':
      return skeleton(color(0), color(1), color(2));
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

/** Cores: corpo e boca. Um cubo de lama com olhos grandes; o tamanho vem do JSON (o grande e o pequeno). */
function slime(definition: CreatureDefinition, body: string, mouth: string): readonly VoxelBox[] {
  const size = definition.width;
  const front = -size / 2;

  return [
    box(0, definition.height / 2, 0, size, definition.height, size, body),
    ...eyes(size * 0.2, definition.height * 0.62, front - 0.01, size * 0.18),
    box(0, definition.height * 0.32, front - 0.005, size * 0.3, size * 0.06, 0.01, mouth),
  ];
}

/** Cores: palha, camisa, calça e chapéu, nariz de cenoura. Anda de braços esticados, como nos desenhos. */
function scarecrow(straw: string, shirt: string, cloth: string, nose: string): readonly VoxelBox[] {
  return [
    box(0.12, 0.38, 0, 0.2, 0.76, 0.22, cloth),
    box(-0.12, 0.38, 0, 0.2, 0.76, 0.22, cloth),
    box(0, 1.06, 0, 0.5, 0.6, 0.28, shirt),
    box(0.33, 1.26, -0.2, 0.15, 0.15, 0.55, straw),
    box(-0.33, 1.26, -0.2, 0.15, 0.15, 0.55, straw),
    box(0, 1.58, 0, 0.42, 0.42, 0.42, straw),
    box(0, 1.82, 0, 0.62, 0.05, 0.62, cloth),
    box(0, 1.93, 0, 0.36, 0.18, 0.36, cloth),
    box(0, 1.55, -0.25, 0.06, 0.06, 0.1, nose),
    ...eyes(0.1, 1.65, -0.215),
  ];
}

/** Cores: corpo, olhos e brilho dos olhos. Quatro pernas de cada lado, dobradas até o chão. */
function spider(body: string, eye: string, shine: string): readonly VoxelBox[] {
  const legs = [-0.2, 0, 0.2, 0.4].flatMap((legZ) => [
    box(0.45, 0.3, legZ, 0.4, 0.06, 0.06, body),
    box(-0.45, 0.3, legZ, 0.4, 0.06, 0.06, body),
    box(0.65, 0.15, legZ, 0.06, 0.3, 0.06, body),
    box(-0.65, 0.15, legZ, 0.06, 0.3, 0.06, body),
  ]);

  return [
    ...legs,
    box(0, 0.33, 0.12, 0.55, 0.36, 0.6, body),
    box(0, 0.3, -0.32, 0.4, 0.3, 0.3, body),
    box(0.09, 0.34, -0.475, 0.1, 0.1, 0.01, eye),
    box(-0.09, 0.34, -0.475, 0.1, 0.1, 0.01, eye),
    box(0.11, 0.36, -0.481, 0.03, 0.03, 0.005, shine),
    box(-0.07, 0.36, -0.481, 0.03, 0.03, 0.005, shine),
  ];
}

/** Cores: osso, olhos e arco. Segura o arco à frente, pronto para atirar. */
function skeleton(bone: string, dark: string, bow: string): readonly VoxelBox[] {
  return [
    box(0.12, 0.4, 0, 0.12, 0.8, 0.12, bone),
    box(-0.12, 0.4, 0, 0.12, 0.8, 0.12, bone),
    box(0, 1.08, 0, 0.42, 0.56, 0.22, bone),
    box(0, 1.08, -0.115, 0.3, 0.06, 0.01, dark),
    box(0, 0.96, -0.115, 0.3, 0.06, 0.01, dark),
    box(0.27, 1.18, -0.18, 0.1, 0.1, 0.45, bone),
    box(-0.27, 1.18, -0.18, 0.1, 0.1, 0.45, bone),
    box(0, 1.18, -0.42, 0.62, 0.06, 0.06, bow),
    box(0, 1.58, 0, 0.4, 0.4, 0.4, bone),
    box(0.09, 1.62, -0.205, 0.09, 0.1, 0.01, dark),
    box(-0.09, 1.62, -0.205, 0.09, 0.1, 0.01, dark),
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
function eyes(offsetX: number, y: number, z: number, size = 0.08): readonly VoxelBox[] {
  const pupil = size / 2;

  return [
    box(offsetX, y, z, size, size, 0.02, EYE),
    box(-offsetX, y, z, size, size, 0.02, EYE),
    box(offsetX, y - size / 8, z - 0.012, pupil, pupil * 1.25, 0.01, PUPIL),
    box(-offsetX, y - size / 8, z - 0.012, pupil, pupil * 1.25, 0.01, PUPIL),
  ];
}
