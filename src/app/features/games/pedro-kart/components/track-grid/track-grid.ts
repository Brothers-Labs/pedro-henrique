import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';

import { trackTheme } from '../../config/theme.config';
import { TRACK_GRID, type GridCell } from '../../models/track.model';
import { directionArrow, type TrackDraft } from '../../tracks/track-editor';
import { cellKey } from '../../tracks/track-rules';

export type CellPointerPhase = 'inicio' | 'arrasto' | 'fim';

export interface CellPointerEvent {
  readonly phase: CellPointerPhase;
  readonly cell: GridCell | null;
}

interface CellView {
  readonly cell: GridCell;
  readonly key: string;
  readonly isRoad: boolean;
  readonly isStart: boolean;
  readonly isEnd: boolean;
  readonly symbol: string;
  readonly label: string;
}

/**
 * A grade onde o Pedro desenha a pista.
 *
 * Não conhece regra nenhuma de edição: só conta em que casa o dedo está e
 * deixa a página decidir o que fazer. Pelo teclado, cada casa é um botão.
 */
@Component({
  selector: 'app-track-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #grid
      class="grid"
      role="group"
      aria-label="Mapa da pista"
      [style.--columns]="columns"
      [style.--ground]="colors().ground"
      [style.--road]="colors().road"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="finishStroke($event)"
      (pointercancel)="finishStroke($event)"
    >
      @for (view of cells(); track view.key) {
        <button
          type="button"
          class="grid__cell"
          [class.grid__cell--road]="view.isRoad"
          [class.grid__cell--start]="view.isStart"
          [class.grid__cell--end]="view.isEnd"
          [attr.aria-label]="view.label"
          (click)="onKeyboardClick($event, view.cell)"
        >
          {{ view.symbol }}
        </button>
      }
    </div>
  `,
  styleUrl: './track-grid.scss',
})
export class TrackGrid {
  readonly draft = input.required<TrackDraft>();
  readonly cellPointer = output<CellPointerEvent>();

  private readonly grid = viewChild.required<ElementRef<HTMLElement>>('grid');
  private activePointer: number | null = null;

  protected readonly columns = TRACK_GRID.columns;

  protected readonly colors = computed(() => {
    const theme = trackTheme(this.draft().theme);

    return { ground: theme.ground, road: theme.road };
  });

  protected readonly cells = computed<readonly CellView[]>(() => {
    const { path, boostCells, itemCells } = this.draft();
    const positions = new Map(path.map((cell, index) => [cellKey(cell), index]));
    const boosts = new Set(boostCells);
    const items = new Set(itemCells);
    const views: CellView[] = [];

    for (let row = 0; row < TRACK_GRID.rows; row += 1) {
      for (let column = 0; column < TRACK_GRID.columns; column += 1) {
        const cell = { column, row };
        const key = cellKey(cell);
        const index = positions.get(key);
        const symbol = index === undefined ? '' : symbolFor(index, path, boosts, items);

        views.push({
          cell,
          key,
          isRoad: index !== undefined,
          isStart: index === 0,
          isEnd: index !== undefined && index === path.length - 1 && index > 0,
          symbol,
          label: labelFor(cell, index, boosts, items),
        });
      }
    }

    return views;
  });

  protected onPointerDown(event: PointerEvent): void {
    if (this.activePointer !== null || event.button > 0) {
      return;
    }

    event.preventDefault();
    this.activePointer = event.pointerId;
    this.grid().nativeElement.setPointerCapture(event.pointerId);
    this.cellPointer.emit({ phase: 'inicio', cell: this.cellAt(event) });
  }

  protected onPointerMove(event: PointerEvent): void {
    if (event.pointerId === this.activePointer) {
      this.cellPointer.emit({ phase: 'arrasto', cell: this.cellAt(event) });
    }
  }

  protected finishStroke(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) {
      return;
    }

    this.activePointer = null;
    this.cellPointer.emit({ phase: 'fim', cell: null });
  }

  /** Clique sem ponteiro (`detail` zero) é Enter ou espaço: o teclado usa o mesmo caminho do dedo. */
  protected onKeyboardClick(event: MouseEvent, cell: GridCell): void {
    if (event.detail !== 0) {
      return;
    }

    this.cellPointer.emit({ phase: 'inicio', cell });
    this.cellPointer.emit({ phase: 'fim', cell: null });
  }

  private cellAt(event: PointerEvent): GridCell | null {
    const rect = this.grid().nativeElement.getBoundingClientRect();
    const column = Math.floor(((event.clientX - rect.left) / rect.width) * TRACK_GRID.columns);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * TRACK_GRID.rows);

    if (column < 0 || row < 0 || column >= TRACK_GRID.columns || row >= TRACK_GRID.rows) {
      return null;
    }

    return { column, row };
  }
}

function symbolFor(index: number, path: readonly GridCell[], boosts: ReadonlySet<number>, items: ReadonlySet<number>): string {
  if (index === 0) {
    return '🏁';
  }

  if (boosts.has(index)) {
    return '💨';
  }

  if (items.has(index)) {
    return '🎁';
  }

  const next = path[index + 1];

  return next ? directionArrow(path[index], next) : '';
}

function labelFor(cell: GridCell, index: number | undefined, boosts: ReadonlySet<number>, items: ReadonlySet<number>): string {
  const place = `Coluna ${cell.column + 1}, linha ${cell.row + 1}`;

  if (index === undefined) {
    return `${place}: vazia`;
  }

  if (index === 0) {
    return `${place}: largada`;
  }

  const extra = boosts.has(index) ? ', com turbo' : items.has(index) ? ', com caixa de surpresa' : '';

  return `${place}: pista, casa ${index + 1}${extra}`;
}
