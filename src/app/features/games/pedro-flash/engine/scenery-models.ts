import { sceneryParts as kartSceneryParts } from '../../pedro-kart/engine/scenery-models';
import { darken, lighten } from '../../pedro-maker/art/canvas';
import { box, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { FlashSceneryKind } from '../config/theme.config';

const WINDOW_LIT = '#ffe27a';
const WINDOW_DARK = '#2a2752';

/**
 * Os enfeites do cenário, em cubos.
 *
 * Os do Pedro Kart vêm de lá; os novos são da cidade, da tempestade e do
 * vulcão. Cada um é desenhado uma vez, e o cenário espalha cópias com tamanho
 * e giro diferentes, todas numa chamada só à placa de vídeo.
 */
export function sceneryParts(kind: FlashSceneryKind): readonly VoxelBox[] {
  switch (kind) {
    case 'predio':
      return buildingParts();
    case 'poste':
      return [
        box(0, 2.5, 0, 0.3, 5, 0.3, '#3a3a4a'),
        box(0.6, 5, 0, 1.4, 0.2, 0.3, '#3a3a4a'),
        box(1.1, 4.8, 0, 0.6, 0.25, 0.5, '#fff3bf'),
      ];
    case 'torre-raio':
      return [
        box(0, 1, 0, 2.2, 2, 2.2, '#4a5578'),
        box(0, 4.5, 0, 1.2, 5, 1.2, '#5d6a92'),
        box(0, 8, 0, 0.5, 2, 0.5, '#8b96b8'),
        box(0, 9.4, 0, 0.9, 0.9, 0.9, '#ffd23f'),
        box(0.7, 6.5, 0, 0.2, 1.4, 0.2, '#ffd23f'),
        box(-0.7, 5.2, 0, 0.2, 1.4, 0.2, '#ffd23f'),
      ];
    case 'pedra-lava':
      return [
        box(0, 0.7, 0, 2.6, 1.4, 2.2, '#3a2a26'),
        box(0.3, 1.7, 0.2, 1.6, 0.8, 1.4, '#4a3530'),
        box(-0.6, 0.9, 1.0, 0.5, 0.3, 0.3, '#ff8a3d'),
        box(0.9, 1.3, -0.9, 0.3, 0.6, 0.3, '#ffb000'),
      ];
    default:
      return kartSceneryParts(kind);
  }
}

/** Prédio com janelas acesas e apagadas em xadrez, e uma faixa de neon no topo. */
function buildingParts(): readonly VoxelBox[] {
  const body = '#2d2a52';
  const parts: VoxelBox[] = [box(0, 6, 0, 5, 12, 5, body), box(0, 12.3, 0, 5.4, 0.6, 5.4, lighten(body, 0.15))];

  for (let floor = 0; floor < 5; floor += 1) {
    for (let column = 0; column < 2; column += 1) {
      const isLit = (floor + column) % 3 !== 0;
      const color = isLit ? WINDOW_LIT : WINDOW_DARK;
      const x = -1.1 + column * 2.2;
      const y = 2 + floor * 2.1;

      parts.push(box(x, y, 2.52, 1.2, 1.1, 0.06, color), box(2.52, y, x, 0.06, 1.1, 1.2, darken(color, 0.1)));
      parts.push(box(x, y, -2.52, 1.2, 1.1, 0.06, color), box(-2.52, y, x, 0.06, 1.1, 1.2, darken(color, 0.1)));
    }
  }

  parts.push(box(0, 12.7, 0, 5.6, 0.2, 5.6, '#ff4fd8'));

  return parts;
}
