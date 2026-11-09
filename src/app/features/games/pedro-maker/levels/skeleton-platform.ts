import type { LevelObject } from '../models/level.model';

/** Quantos esqueletos vão enfileirados na plataforma: uma ponte comprida, que leva o herói com folga. */
export const SKELETON_PLATFORM_SEGMENTS = 4;

/** Cada esqueleto tem a largura de uma plataforma móvel comum. */
export const SKELETON_SEGMENT_CELLS = 2;

export const SKELETON_PLATFORM_CELLS = SKELETON_PLATFORM_SEGMENTS * SKELETON_SEGMENT_CELLS;

/**
 * A coluna da primeira parede sólida à direita da plataforma de esqueleto, na
 * linha dela, ou a largura da fase se não houver nenhuma: é onde ela para.
 *
 * O jogo, o validador e o editor perguntam "é parede?" cada um à sua grade,
 * mas a regra do caminho é esta, a mesma para os três.
 */
export function skeletonWallColumn(
  platform: Pick<LevelObject, 'x' | 'y'>,
  levelWidth: number,
  isWall: (x: number, y: number) => boolean,
): number {
  let column = platform.x;

  while (column < levelWidth && !isWall(column, platform.y)) {
    column += 1;
  }

  return column;
}
