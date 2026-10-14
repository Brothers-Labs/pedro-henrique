import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TRACK_GRID, type GridCell } from '../../../pedro-kart/models/track.model';
import { flashTheme } from '../../config/theme.config';
import type { FlashTheme } from '../../models/course.model';

/**
 * Desenho da fase visto de cima, em SVG.
 *
 * Leve de propósito: a lista mostra várias fases ao mesmo tempo, e nenhuma
 * precisa do motor 3D para aparecer. A largada é branca; a chegada, amarela.
 */
@Component({
  selector: 'app-course-thumbnail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="thumbnail"
      [attr.viewBox]="viewBox"
      role="img"
      [attr.aria-label]="'Desenho da fase ' + name()"
      [style.background]="colors().ground"
    >
      @if (isCircuit()) {
        <polygon class="thumbnail__edge" [attr.points]="points()" />
        <polygon class="thumbnail__road" [attr.points]="points()" [attr.stroke]="colors().road" />
      } @else {
        <polyline class="thumbnail__edge" [attr.points]="points()" />
        <polyline class="thumbnail__road" [attr.points]="points()" [attr.stroke]="colors().road" />
      }
      @if (ends(); as cells) {
        <rect class="thumbnail__start" [attr.x]="cells.start.column + 0.25" [attr.y]="cells.start.row + 0.25" width="0.5" height="0.5" />
        @if (!isCircuit()) {
          <circle class="thumbnail__goal" [attr.cx]="cells.goal.column + 0.5" [attr.cy]="cells.goal.row + 0.5" r="0.3" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }

    .thumbnail {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 0.9rem;
    }

    .thumbnail__edge,
    .thumbnail__road {
      fill: none;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .thumbnail__edge {
      stroke: #ffd23f;
      stroke-width: 0.75;
    }

    .thumbnail__road {
      stroke-width: 0.5;
    }

    .thumbnail__start,
    .thumbnail__goal {
      stroke: #2a2350;
      stroke-width: 0.1;
    }

    .thumbnail__start {
      fill: #ffffff;
    }

    .thumbnail__goal {
      fill: #ffd23f;
    }
  `,
})
export class CourseThumbnail {
  readonly path = input.required<readonly GridCell[]>();
  readonly theme = input.required<FlashTheme>();
  readonly isCircuit = input(false);
  readonly name = input('');

  protected readonly viewBox = `0 0 ${TRACK_GRID.columns} ${TRACK_GRID.rows}`;

  protected readonly colors = computed(() => {
    const theme = flashTheme(this.theme());

    return { ground: theme.ground, road: theme.road };
  });

  protected readonly points = computed(() =>
    this.path()
      .map((cell) => `${cell.column + 0.5},${cell.row + 0.5}`)
      .join(' '),
  );

  protected readonly ends = computed(() => {
    const path = this.path();

    return path.length > 0 ? { start: path[0], goal: path[path.length - 1] } : null;
  });
}
