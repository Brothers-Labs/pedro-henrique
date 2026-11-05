import { box, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';

const BOILER = '#e53935';
const CAB = '#2f8fe0';
const CHASSIS = '#3d3d45';
const WHEEL = '#24242b';
const CHIMNEY = '#2b2b2b';
const BUMPER = '#f5c542';
const HEADLIGHT = '#fff3b0';

/**
 * A locomotiva, em blocos, com as rodas em y = 0 e a frente para -z, como os bichos.
 *
 * O herói vai sentado no meio da cabine. A cabine não tem teto: olhando para
 * baixo, a criança vê o próprio trem e a caldeira vermelha lá na frente.
 */
export const TRAIN_BOXES: readonly VoxelBox[] = [
  box(0, 0.22, 0, 0.9, 0.16, 1.5, CHASSIS),
  ...[-0.45, 0.45].flatMap((x) => [-0.45, 0.45].map((z) => box(x, 0.14, z, 0.08, 0.28, 0.28, WHEEL))),
  box(0, 0.55, -0.42, 0.7, 0.5, 0.66, BOILER),
  box(0, 0.95, -0.6, 0.18, 0.32, 0.18, CHIMNEY),
  box(0, 0.6, -0.77, 0.18, 0.16, 0.04, HEADLIGHT),
  box(0, 0.16, -0.8, 0.84, 0.12, 0.1, BUMPER),
  box(0, 0.6, 0.7, 0.9, 0.6, 0.1, CAB),
  ...[-0.42, 0.42].map((x) => box(x, 0.6, 0.35, 0.06, 0.6, 0.6, CAB)),
];
