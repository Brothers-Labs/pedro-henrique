import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { THEME_PALETTES } from '../../art/palettes';
import { paint } from '../../art/canvas';
import type { CustomLevel, LevelObjectType } from '../../models/level.model';

/** Pixels por célula na miniatura. */
const CELL = 3;

const COLORS: Readonly<Partial<Record<LevelObjectType, string>>> = {
  stone: '#8a8fa8',
  ice: '#9fdcff',
  lava: '#ff7a2e',
  spikes: '#c9cfdd',
  water: '#2f9be8',
  brick: '#d9793e',
  surprise: '#ffc629',
  note: '#fff8e8',
  platform: '#c98a4b',
  'moving-platform': '#7b88a8',
  crumble: '#e3c28a',
  spring: '#ff5a8a',
  coin: '#ffe066',
  'big-coin': '#ffc629',
  'huge-coin': '#ffc629',
  slide: '#ff5a5a',
  crystal: '#4fd8ff',
  start: '#ffffff',
  portal: '#9a6cf0',
  checkpoint: '#ff4f9a',
};

const ENEMIES = new Set<LevelObjectType>(['slime', 'spiky', 'bat', 'robot', 'ghost', 'turtle', 'piranha', 'penguin', 'lava-bubble', 'bee']);

/**
 * Miniatura de uma fase criada: a planta vista de longe.
 *
 * Um pixelzinho colorido por peça é o bastante para a criança reconhecer a
 * própria fase entre as outras, sem carregar o motor do jogo.
 */
@Component({
  selector: 'app-level-thumbnail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img class="thumbnail" [src]="source()" alt="" decoding="async" />`,
  styles: `
    :host {
      display: block;
    }

    .thumbnail {
      width: 100%;
      height: auto;
      border-radius: 0.6rem;
      image-rendering: pixelated;
    }
  `,
})
export class LevelThumbnail {
  readonly level = input.required<CustomLevel>();

  protected readonly source = computed(() => {
    const level = this.level();
    const palette = THEME_PALETTES[level.theme];
    // A miniatura mostra no máximo 120 colunas: fases longas aparecem pelo começo.
    const columns = Math.min(level.width, 120);

    return paint(columns * CELL, level.height * CELL, (context) => {
      const gradient = context.createLinearGradient(0, 0, 0, level.height * CELL);

      gradient.addColorStop(0, palette.skyTop);
      gradient.addColorStop(1, palette.skyBottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, columns * CELL, level.height * CELL);

      for (const object of level.objects) {
        if (object.x >= columns) {
          continue;
        }

        const color =
          object.type === 'ground' ? palette.surface : ENEMIES.has(object.type) ? '#2a2350' : COLORS[object.type];

        if (color) {
          context.fillStyle = color;
          context.fillRect(object.x * CELL, object.y * CELL, CELL, CELL);
        }
      }
    }).toDataURL();
  });
}
