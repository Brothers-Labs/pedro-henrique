import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';

import { TRACK_GRID, type GridCell } from '../../../pedro-kart/models/track.model';
import { directionArrow } from '../../../pedro-kart/tracks/track-editor';
import { cellKey } from '../../../pedro-kart/tracks/track-rules';
import { pieceDefinition } from '../../config/piece.config';
import { flashTheme } from '../../config/theme.config';
import type { CourseDraft } from '../../course/course-editor';
import type { CoursePiece, Lane } from '../../models/course.model';

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
  readonly isGoal: boolean;
  readonly symbol: string;
  /** Para onde a peça encosta na casa; `null` quando ela ocupa a pista toda. */
  readonly laneShift: { readonly x: number; readonly y: number } | null;
  readonly label: string;
}

/** Quanto a peça de uma faixa só encosta no lado dela, em fração do próprio desenho. */
const LANE_SHIFT = 0.55;

const LANE_NAMES: Readonly<Record<Lane, string>> = { [-1]: 'na esquerda', 0: 'no meio', 1: 'na direita' };

/**
 * A grade onde o Pedro monta a fase.
 *
 * Não conhece regra nenhuma de edição: só conta em que casa o dedo está e
 * deixa a página decidir o que fazer. Pelo teclado, cada casa é um botão.
 * Peças de uma faixa só aparecem encostadas no lado em que estão.
 */
@Component({
  selector: 'app-course-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #grid
      class="grid"
      role="group"
      aria-label="Mapa da fase"
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
          [class.grid__cell--goal]="view.isGoal"
          [attr.aria-label]="view.label"
          (click)="onKeyboardClick($event, view.cell)"
        >
          <span
            class="grid__symbol"
            [class.grid__symbol--shifted]="view.laneShift !== null"
            [style.--shift-x]="view.laneShift?.x ?? 0"
            [style.--shift-y]="view.laneShift?.y ?? 0"
            aria-hidden="true"
            >{{ view.symbol }}</span
          >
        </button>
      }
    </div>
  `,
  styleUrls: ['../../../pedro-kart/components/track-grid/track-grid.scss', './course-grid.scss'],
})
export class CourseGrid {
  readonly draft = input.required<CourseDraft>();
  readonly cellPointer = output<CellPointerEvent>();

  private readonly grid = viewChild.required<ElementRef<HTMLElement>>('grid');
  private activePointer: number | null = null;

  protected readonly columns = TRACK_GRID.columns;

  protected readonly colors = computed(() => {
    const theme = flashTheme(this.draft().theme);

    return { ground: theme.ground, road: theme.road };
  });

  protected readonly cells = computed<readonly CellView[]>(() => {
    const { path, pieces } = this.draft();
    const positions = new Map(path.map((cell, index) => [cellKey(cell), index]));
    const piecesByCell = new Map(pieces.map((piece) => [piece.cell, piece]));
    const views: CellView[] = [];

    for (let row = 0; row < TRACK_GRID.rows; row += 1) {
      for (let column = 0; column < TRACK_GRID.columns; column += 1) {
        const cell = { column, row };
        const key = cellKey(cell);
        const index = positions.get(key);
        const piece = index === undefined ? undefined : piecesByCell.get(index);
        const isGoal = index !== undefined && index > 0 && index === path.length - 1;

        views.push({
          cell,
          key,
          isRoad: index !== undefined,
          isStart: index === 0,
          isGoal,
          symbol: symbolFor(index, path, piece, isGoal),
          laneShift: index !== undefined && piece && pieceDefinition(piece.kind).usesLane ? laneShift(path, index, piece.lane) : null,
          label: labelFor(cell, index, piece, isGoal),
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

/**
 * Lado da casa em que fica a faixa, na tela.
 *
 * A direita de quem corre depende do sentido da corrida naquela casa: indo
 * para a direita do mapa, a direita dele é para baixo; indo para baixo, é a
 * esquerda da tela.
 */
function laneShift(path: readonly GridCell[], index: number, lane: Lane): { readonly x: number; readonly y: number } {
  const current = path[index];
  const next = path[index + 1];
  const previous = path[index - 1];
  const column = next ? next.column - current.column : current.column - (previous?.column ?? current.column);
  const row = next ? next.row - current.row : current.row - (previous?.row ?? current.row);

  // No mundo 3D a direita de quem corre para (x, z) é (-z, x); a grade usa coluna como x e linha como z.
  return { x: -row * lane * LANE_SHIFT, y: column * lane * LANE_SHIFT };
}

function symbolFor(index: number | undefined, path: readonly GridCell[], piece: CoursePiece | undefined, isGoal: boolean): string {
  if (index === undefined) {
    return '';
  }

  if (index === 0) {
    return '🚦';
  }

  if (isGoal) {
    return '🏁';
  }

  if (piece) {
    return pieceDefinition(piece.kind).emoji;
  }

  const next = path[index + 1];

  return next ? directionArrow(path[index], next) : '';
}

function labelFor(cell: GridCell, index: number | undefined, piece: CoursePiece | undefined, isGoal: boolean): string {
  const place = `Coluna ${cell.column + 1}, linha ${cell.row + 1}`;

  if (index === undefined) {
    return `${place}: vazia`;
  }

  if (index === 0) {
    return `${place}: largada`;
  }

  if (isGoal) {
    return `${place}: chegada`;
  }

  if (!piece) {
    return `${place}: caminho, casa ${index + 1}`;
  }

  const definition = pieceDefinition(piece.kind);
  const lane = definition.usesLane ? ` ${LANE_NAMES[piece.lane]}` : '';

  return `${place}: caminho, casa ${index + 1}, com ${definition.label.toLowerCase()}${lane}`;
}
