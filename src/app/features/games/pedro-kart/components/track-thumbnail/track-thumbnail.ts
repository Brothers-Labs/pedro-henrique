import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { trackTheme } from '../../config/theme.config';
import { TRACK_GRID, type GridCell, type TrackTheme } from '../../models/track.model';

/**
 * Desenho da pista visto de cima, em SVG.
 *
 * Leve de propósito: a lista de pistas mostra várias ao mesmo tempo, e
 * nenhuma delas precisa do motor 3D para aparecer.
 */
@Component({
  selector: 'app-track-thumbnail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="thumbnail"
      [attr.viewBox]="viewBox"
      role="img"
      [attr.aria-label]="'Desenho da pista ' + name()"
      [style.background]="colors().ground"
    >
      <polygon class="thumbnail__edge" [attr.points]="points()" />
      <polygon class="thumbnail__road" [attr.points]="points()" [attr.stroke]="colors().road" />
      @if (start(); as cell) {
        <rect class="thumbnail__start" [attr.x]="cell.column + 0.25" [attr.y]="cell.row + 0.25" width="0.5" height="0.5" />
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
    }

    .thumbnail__edge {
      stroke: #ffffff;
      stroke-width: 0.75;
    }

    .thumbnail__road {
      stroke-width: 0.5;
    }

    .thumbnail__start {
      fill: #ffffff;
      stroke: #2a2350;
      stroke-width: 0.1;
    }
  `,
})
export class TrackThumbnail {
  readonly path = input.required<readonly GridCell[]>();
  readonly theme = input.required<TrackTheme>();
  readonly name = input('');

  protected readonly viewBox = `0 0 ${TRACK_GRID.columns} ${TRACK_GRID.rows}`;

  protected readonly colors = computed(() => {
    const theme = trackTheme(this.theme());

    return { ground: theme.ground, road: theme.road };
  });

  protected readonly points = computed(() =>
    this.path()
      .map((cell) => `${cell.column + 0.5},${cell.row + 0.5}`)
      .join(' '),
  );

  protected readonly start = computed(() => this.path()[0] ?? null);
}
