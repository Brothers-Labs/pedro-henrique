import { DEFAULT_LOOK, paletteFor } from '../../pedro-maker/config/character.config';
import { characterParts } from '../../pedro-maker/engine/render/models/character-parts';
import { box, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { HeroId } from '../../pedro-maker/models/progress.model';
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
    case 'king-slime':
      return [...slime(definition, color(0), color(1)), ...crown(definition, color(2))];
    case 'scarecrow':
      return scarecrow(color(0), color(1), color(2), color(3));
    case 'spider':
      return spider(color(0), color(1), color(2));
    case 'skeleton':
      return skeleton(color(0), color(1), color(2));
    case 'creeper':
      return creeper(color(0), color(1), color(2));
    case 'iron-golem':
      return ironGolem(color(0), color(1), color(2), color(3));
    case 'verity':
      return verity(blobShape(definition), color(0), color(1), color(2));
    case 'falsity':
      return falsity(blobShape(definition), color(0), color(1), color(2));
    case 'cruelty':
      return cruelty(blobShape(definition), color(0), color(1), color(2));
    case 'lovity':
      return lovity(blobShape(definition), color(0), color(1), color(2));
    case 'obesity':
      return obesity(blobShape(definition), color(0), color(1), color(2), color(3));
    case 'squareity':
      return squareity(blobShape(definition), color(0), color(1), color(2));
    case 'pointy':
      return pointy(blobShape(definition), color(0), color(1), color(2));
    case 'maker-hero':
      return makerHero(definition.hero ?? 'pedro', definition.height);
  }
}

/**
 * Boneco de um herói do Pedro Maker: as mesmas peças de cubos de lá, com os
 * braços e as pernas presos nas juntas, de pé e parados. O Maker olha para +z
 * e o PedroCraft para -z, então o boneco dá meia-volta; e encolhe ou cresce
 * até a altura pedida no `creatures.json`, com os pés no chão.
 */
function makerHero(hero: HeroId, height: number): readonly VoxelBox[] {
  const parts = characterParts(paletteFor(DEFAULT_LOOK, hero));
  const at = (pieces: readonly VoxelBox[], x: number, y: number): readonly VoxelBox[] =>
    pieces.map((part) => box(part.x + x, part.y + y, part.z, part.width, part.height, part.depth, part.color));
  const whole = [
    ...parts.upperBody,
    ...[-1, 1].flatMap((side) => [
      ...at(parts.arm, side * parts.shoulderX, parts.shoulderY),
      ...at(parts.leg, side * parts.hipX, parts.hipY),
    ]),
  ];
  const lowest = Math.min(...whole.map((part) => part.y - part.height / 2));
  const highest = Math.max(...whole.map((part) => part.y + part.height / 2));
  const scale = height / (highest - lowest);

  return whole.map((part) =>
    box(-part.x * scale, (part.y - lowest) * scale, -part.z * scale, part.width * scale, part.height * scale, part.depth * scale, part.color),
  );
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

/** A coroa dourada do Rei Slime, em cima do cubo de lama. */
function crown(definition: CreatureDefinition, gold: string): readonly VoxelBox[] {
  const top = definition.height;
  const size = definition.width * 0.55;
  const spike = size * 0.22;

  return [
    box(0, top + 0.08, 0, size, 0.16, size, gold),
    ...[-1, 0, 1].map((step) => box(step * (size / 2 - spike / 2), top + 0.24, 0, spike, 0.16, spike, gold)),
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

/** Cores: corpo, rosto e manchas. Quatro pezinhos, corpo comprido e a cara de espanto, sem dentes. */
function creeper(skin: string, face: string, spots: string): readonly VoxelBox[] {
  return [
    ...legs(0.13, 0.13, 0.2, 0.3, skin),
    box(0, 0.75, 0, 0.44, 0.9, 0.3, skin),
    box(0.12, 0.95, -0.155, 0.1, 0.1, 0.01, spots),
    box(-0.1, 0.62, -0.155, 0.12, 0.1, 0.01, spots),
    box(0, 1.4, 0, 0.44, 0.4, 0.44, skin),
    box(0.11, 1.46, -0.225, 0.1, 0.1, 0.01, face),
    box(-0.11, 1.46, -0.225, 0.1, 0.1, 0.01, face),
    box(0, 1.34, -0.225, 0.08, 0.1, 0.01, face),
  ];
}

/** Cores: ferro, cipós, nariz e sobrancelha. Grandão de braços compridos, com cara de amigo. */
function ironGolem(iron: string, vines: string, nose: string, brow: string): readonly VoxelBox[] {
  return [
    box(0.2, 0.35, 0, 0.26, 0.7, 0.26, iron),
    box(-0.2, 0.35, 0, 0.26, 0.7, 0.26, iron),
    box(0, 0.78, 0, 0.6, 0.16, 0.36, iron),
    box(0, 1.2, 0, 0.9, 0.7, 0.5, iron),
    box(0.56, 0.95, 0, 0.22, 1.1, 0.24, iron),
    box(-0.56, 0.95, 0, 0.22, 1.1, 0.24, iron),
    box(0.2, 1.3, -0.255, 0.08, 0.4, 0.01, vines),
    box(-0.24, 1.08, -0.255, 0.08, 0.3, 0.01, vines),
    box(0.56, 0.7, -0.125, 0.08, 0.3, 0.01, vines),
    box(0, 1.72, -0.05, 0.4, 0.36, 0.4, iron),
    box(0, 1.83, -0.255, 0.36, 0.05, 0.02, brow),
    box(0, 1.63, -0.3, 0.1, 0.18, 0.1, nose),
    ...eyes(0.1, 1.74, -0.26),
  ];
}

/**
 * Medidas de um boneco-bolinha, tiradas do tamanho dele no `creatures.json`:
 * os bonecos foram desenhados pelo Pedro como bolinhas de uma cor só, com
 * olhos pretos grandes e dois pezinhos.
 */
interface BlobShape {
  readonly width: number;
  readonly depth: number;
  /** Altura dos pezinhos: o corpo começa aqui. */
  readonly feet: number;
  readonly bodyHeight: number;
  /** A frente da cara, um tiquinho para fora do corpo. */
  readonly faceZ: number;
}

function blobShape(definition: CreatureDefinition): BlobShape {
  const feet = definition.height * 0.1;
  const depth = definition.width * 0.8;

  return { width: definition.width, depth, feet, bodyHeight: definition.height - feet, faceZ: -depth / 2 - 0.01 };
}

/** Altura dentro do corpo, de 0 (embaixo) a 1 (em cima). */
function bodyY(shape: BlobShape, fraction: number): number {
  return shape.feet + shape.bodyHeight * fraction;
}

/** O corpo em forma de ovo: largo no meio e mais estreito em cima e embaixo, com dois pezinhos. */
function blob(shape: BlobShape, skin: string): readonly VoxelBox[] {
  const { width, depth, feet, bodyHeight } = shape;

  return [
    box(width * 0.22, feet / 2, 0, width * 0.22, feet, depth * 0.4, skin),
    box(-width * 0.22, feet / 2, 0, width * 0.22, feet, depth * 0.4, skin),
    box(0, bodyY(shape, 0.1), 0, width * 0.74, bodyHeight * 0.2, depth * 0.74, skin),
    box(0, bodyY(shape, 0.5), 0, width, bodyHeight * 0.6, depth, skin),
    box(0, bodyY(shape, 0.9), 0, width * 0.7, bodyHeight * 0.2, depth * 0.7, skin),
  ];
}

/** Dois olhos pretos e redondos, como bolinhas de caneta. */
function dotEyes(shape: BlobShape, y: number): readonly VoxelBox[] {
  const size = shape.width * 0.2;

  return [
    box(shape.width * 0.2, y, shape.faceZ, size, size, 0.02, PUPIL),
    box(-shape.width * 0.2, y, shape.faceZ, size, size, 0.02, PUPIL),
  ];
}

/** Um traço de boca ou de sorriso na frente da cara. */
function faceMark(shape: BlobShape, x: number, y: number, width: number, height: number, color: string, layer = 1): VoxelBox {
  return box(x, y, shape.faceZ - 0.01 * layer, width, height, 0.02, color);
}

/** Verity: amarela, com o sorrisão subindo para os dois lados e a bochecha mais clara. */
function verity(shape: BlobShape, skin: string, cheek: string, mouth: string): readonly VoxelBox[] {
  const { width } = shape;
  const smileY = bodyY(shape, 0.38);

  return [
    ...blob(shape, skin),
    box(width * 0.12, bodyY(shape, 0.32), shape.faceZ + 0.005, width * 0.5, shape.bodyHeight * 0.3, 0.01, cheek),
    ...dotEyes(shape, bodyY(shape, 0.72)),
    faceMark(shape, 0, smileY, width * 0.5, width * 0.1, mouth),
    faceMark(shape, -width * 0.27, smileY + width * 0.06, width * 0.1, width * 0.18, mouth),
    faceMark(shape, width * 0.27, smileY + width * 0.1, width * 0.1, width * 0.26, mouth),
  ];
}

/** Falsity: azul, com a mancha em volta dos olhos e a boca de dois dentinhos separados. */
function falsity(shape: BlobShape, skin: string, patch: string, mouth: string): readonly VoxelBox[] {
  const { width } = shape;
  const mouthY = bodyY(shape, 0.42);
  const tooth = width * 0.08;

  return [
    ...blob(shape, skin),
    box(width * 0.08, bodyY(shape, 0.66), shape.faceZ + 0.005, width * 0.36, shape.bodyHeight * 0.32, 0.01, patch),
    ...dotEyes(shape, bodyY(shape, 0.7)),
    faceMark(shape, 0, mouthY, width * 0.4, width * 0.13, mouth),
    faceMark(shape, -width * 0.1, mouthY, tooth, tooth, EYE, 2),
    faceMark(shape, width * 0.14, mouthY, tooth, tooth, EYE, 2),
  ];
}

/** Cruelty: vermelho, com uma ponta em cima e outra embaixo e a bocona de quatro dentões. */
function cruelty(shape: BlobShape, skin: string, mouth: string, teeth: string): readonly VoxelBox[] {
  const { width } = shape;
  const mouthY = bodyY(shape, 0.42);
  const tooth = width * 0.14;
  const tip = width * 0.14;

  return [
    ...blob(shape, skin),
    box(0, shape.feet + shape.bodyHeight + tip / 2, 0, tip, tip, tip, skin),
    box(0, shape.feet / 2, 0, tip, shape.feet, tip, skin),
    ...dotEyes(shape, bodyY(shape, 0.72)),
    faceMark(shape, 0, mouthY, width * 0.5, width * 0.4, mouth),
    ...[-1, 1].flatMap((side) => [
      faceMark(shape, side * width * 0.1, mouthY + tooth * 0.6, tooth, tooth, teeth, 2),
      faceMark(shape, side * width * 0.1, mouthY - tooth * 0.6, tooth, tooth, teeth, 2),
    ]),
  ];
}

/** Lovity: rosa, com os óculos de coração e o sorriso azul. */
function lovity(shape: BlobShape, skin: string, glasses: string, smile: string): readonly VoxelBox[] {
  const { width } = shape;
  const lensY = bodyY(shape, 0.72);
  const lens = width * 0.3;
  const smileY = bodyY(shape, 0.36);
  const heartLens = (side: number): readonly VoxelBox[] => {
    const x = side * width * 0.24;

    return [
      faceMark(shape, x - lens / 4, lensY + lens / 4, lens / 2, lens / 2, glasses),
      faceMark(shape, x + lens / 4, lensY + lens / 4, lens / 2, lens / 2, glasses),
      faceMark(shape, x, lensY, lens, lens / 2, glasses),
      faceMark(shape, x, lensY - lens / 3, lens / 2, lens / 3, glasses),
    ];
  };

  return [
    ...blob(shape, skin),
    ...heartLens(-1),
    ...heartLens(1),
    faceMark(shape, 0, smileY, width * 0.34, width * 0.06, smile),
    faceMark(shape, -width * 0.18, smileY + width * 0.05, width * 0.06, width * 0.1, smile),
    faceMark(shape, width * 0.18, smileY + width * 0.05, width * 0.06, width * 0.1, smile),
  ];
}

/** Obesity: o boneco redondão e comilão, sorrindo com um hambúrguer na mão. */
function obesity(shape: BlobShape, skin: string, bun: string, patty: string, lettuce: string): readonly VoxelBox[] {
  const { width } = shape;
  const smileY = bodyY(shape, 0.5);
  const burger = width * 0.24;
  const handX = width / 2 + burger / 2;
  const handY = bodyY(shape, 0.45);

  return [
    ...blob(shape, skin),
    ...dotEyes(shape, bodyY(shape, 0.7)),
    faceMark(shape, 0, smileY, width * 0.3, width * 0.05, PUPIL),
    faceMark(shape, -width * 0.14, smileY + width * 0.03, width * 0.05, width * 0.06, PUPIL),
    faceMark(shape, width * 0.14, smileY + width * 0.03, width * 0.05, width * 0.06, PUPIL),
    box(handX, handY - burger * 0.3, 0, burger, burger * 0.3, burger, bun),
    box(handX, handY, 0, burger * 1.05, burger * 0.25, burger * 1.05, patty),
    box(handX, handY + burger * 0.18, 0, burger * 1.1, burger * 0.1, burger * 1.1, lettuce),
    box(handX, handY + burger * 0.4, 0, burger, burger * 0.35, burger, bun),
  ];
}

/** Squareity: o boneco quadradão, um cubo inteiro, com olhos quadrados atrás de óculos quadrados. */
function squareity(shape: BlobShape, skin: string, frame: string, mouth: string): readonly VoxelBox[] {
  const { width, depth, feet, bodyHeight } = shape;
  const eyeY = bodyY(shape, 0.66);
  const lens = width * 0.3;
  const rim = 0.03;
  const lensFrame = (side: number): readonly VoxelBox[] => {
    const x = side * width * 0.2;

    return [
      faceMark(shape, x, eyeY + lens / 2, lens, rim, frame),
      faceMark(shape, x, eyeY - lens / 2, lens, rim, frame),
      faceMark(shape, x - lens / 2, eyeY, rim, lens, frame),
      faceMark(shape, x + lens / 2, eyeY, rim, lens, frame),
    ];
  };

  return [
    box(width * 0.25, feet / 2, 0, width * 0.2, feet, depth * 0.4, skin),
    box(-width * 0.25, feet / 2, 0, width * 0.2, feet, depth * 0.4, skin),
    box(0, feet + bodyHeight / 2, 0, width, bodyHeight, depth, skin),
    ...dotEyes(shape, eyeY),
    ...lensFrame(-1),
    ...lensFrame(1),
    faceMark(shape, 0, bodyY(shape, 0.36), width * 0.4, width * 0.06, mouth),
  ];
}

/** Pointy: coberto de pontas, em cima e nos lados, com a boca brava em zigue-zague. */
function pointy(shape: BlobShape, skin: string, spikes: string, mouth: string): readonly VoxelBox[] {
  const { width } = shape;
  const top = shape.feet + shape.bodyHeight;
  const spike = width * 0.14;
  const mouthY = bodyY(shape, 0.42);

  return [
    ...blob(shape, skin),
    ...[-0.24, 0, 0.24].map((x) => box(x * width, top + spike / 2, 0, spike, spike, spike, spikes)),
    ...[-1, 1].flatMap((side) =>
      [0.35, 0.65].map((fraction) => box(side * (width / 2 + spike / 2), bodyY(shape, fraction), 0, spike, spike, spike, spikes)),
    ),
    ...dotEyes(shape, bodyY(shape, 0.7)),
    ...[-0.15, -0.05, 0.05, 0.15].map((x, index) =>
      faceMark(shape, x * width, mouthY + (index % 2 === 0 ? 0 : width * 0.05), width * 0.1, width * 0.05, mouth),
    ),
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
