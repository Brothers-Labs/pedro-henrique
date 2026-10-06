import { darken, lighten } from '../../pedro-maker/art/canvas';
import { box, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { SceneryKind } from '../config/theme.config';

/**
 * Os enfeites do cenário, em cubos.
 *
 * Cada um é desenhado uma vez só; a pista espalha cópias com tamanho e giro
 * diferentes, e a placa de vídeo desenha todas as cópias de uma vez.
 */
export function sceneryParts(kind: SceneryKind): readonly VoxelBox[] {
  switch (kind) {
    case 'arvore':
      return [
        box(0, 1.2, 0, 0.7, 2.4, 0.7, '#7a4b2a'),
        box(0, 3.2, 0, 2.8, 1.8, 2.8, '#3fa34d'),
        box(0, 4.4, 0, 1.8, 1.0, 1.8, lighten('#3fa34d', 0.2)),
      ];
    case 'flor':
      return [
        box(0, 0.3, 0, 0.12, 0.6, 0.12, '#2f8f3a'),
        box(0, 0.7, 0, 0.5, 0.25, 0.5, '#ff6fae'),
        box(0, 0.75, 0, 0.2, 0.2, 0.2, '#ffd43b'),
      ];
    case 'coqueiro':
      return [
        box(0, 1.0, 0, 0.5, 2.0, 0.5, '#9a6b3f'),
        box(0.15, 3.0, 0, 0.45, 2.0, 0.45, '#8a5d35'),
        box(0.3, 4.2, 0, 3.2, 0.25, 0.9, '#36a852'),
        box(0.3, 4.2, 0, 0.9, 0.25, 3.2, '#2f9447'),
        box(0.3, 3.95, 0.2, 0.4, 0.4, 0.4, '#6b4a2b'),
      ];
    case 'guarda-sol':
      return [
        box(0, 1.2, 0, 0.12, 2.4, 0.12, '#ffffff'),
        box(0, 2.5, 0, 2.6, 0.25, 2.6, '#ff6b6b'),
        box(0, 2.7, 0, 1.6, 0.2, 1.6, '#ffffff'),
        box(0.9, 0.12, 0.6, 1.4, 0.12, 0.8, '#3fa9f5'),
      ];
    case 'pinheiro':
      return [
        box(0, 0.6, 0, 0.5, 1.2, 0.5, '#6b4a2b'),
        box(0, 1.8, 0, 2.6, 1.2, 2.6, '#2e7d4f'),
        box(0, 2.9, 0, 1.8, 1.0, 1.8, '#2e7d4f'),
        box(0, 3.8, 0, 1.0, 0.9, 1.0, '#2e7d4f'),
        box(0, 4.3, 0, 0.8, 0.2, 0.8, '#ffffff'),
        box(0, 2.45, 0, 1.9, 0.12, 1.9, '#ffffff'),
      ];
    case 'boneco-de-neve':
      return [
        box(0, 0.6, 0, 1.2, 1.2, 1.2, '#ffffff'),
        box(0, 1.6, 0, 0.85, 0.85, 0.85, '#f4f8ff'),
        box(0, 1.65, 0.45, 0.12, 0.12, 0.4, '#ff8a3d'),
        box(-0.18, 1.8, 0.43, 0.1, 0.1, 0.02, '#2a2350'),
        box(0.18, 1.8, 0.43, 0.1, 0.1, 0.02, '#2a2350'),
        box(0, 2.15, 0, 0.7, 0.35, 0.7, '#2a2350'),
        box(0, 1.25, 0, 0.95, 0.15, 0.95, '#e03131'),
      ];
    case 'dino':
      return dinoParts('#4cc26b');
    case 'vulcao':
      return [
        box(0, 1.0, 0, 7, 2, 7, '#5b4636'),
        box(0, 2.8, 0, 5, 1.8, 5, '#6b5240'),
        box(0, 4.3, 0, 3, 1.4, 3, '#7a5d48'),
        box(0, 5.05, 0, 1.8, 0.2, 1.8, '#ff6b1a'),
        box(1.2, 3.6, 1.6, 0.6, 2.4, 0.3, '#ff8a3d'),
      ];
    case 'cristal':
      return [
        box(0, 1.2, 0, 0.9, 2.4, 0.9, '#8ef1ff'),
        box(0, 2.6, 0, 0.5, 0.6, 0.5, lighten('#8ef1ff', 0.4)),
        box(0.8, 0.7, 0.3, 0.6, 1.4, 0.6, '#ff8ef1'),
        box(-0.7, 0.5, -0.3, 0.5, 1.0, 0.5, '#b9a2ff'),
      ];
    case 'planeta':
      return [
        box(0, 3, 0, 2.6, 2.6, 2.6, '#ffb000'),
        box(0, 3, 0, 4.4, 0.18, 4.4, '#ff6fae'),
        box(0, 1, 0, 0.2, 2.0, 0.2, '#8ef1ff'),
      ];
  }
}

function dinoParts(color: string): readonly VoxelBox[] {
  const belly = lighten(color, 0.35);
  const dark = darken(color, 0.3);

  return [
    // Corpo, pescoço comprido e cabeça: um braquiossauro amigo à beira da pista.
    box(0, 1.6, 0, 1.8, 1.4, 3.2, color),
    box(0, 1.2, 0, 1.6, 0.4, 2.6, belly),
    box(0, 3.0, 1.4, 0.7, 2.4, 0.7, color),
    box(0, 4.3, 1.8, 0.9, 0.7, 1.3, color),
    box(-0.3, 4.5, 2.46, 0.15, 0.15, 0.02, '#2a2350'),
    box(0.3, 4.5, 2.46, 0.15, 0.15, 0.02, '#2a2350'),
    box(0, 1.4, -2.2, 0.6, 0.6, 1.6, color),
    box(-0.6, 0.45, 1.0, 0.5, 0.9, 0.5, dark),
    box(0.6, 0.45, 1.0, 0.5, 0.9, 0.5, dark),
    box(-0.6, 0.45, -1.0, 0.5, 0.9, 0.5, dark),
    box(0.6, 0.45, -1.0, 0.5, 0.9, 0.5, dark),
  ];
}
