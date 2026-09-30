import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  viewChild,
} from '@angular/core';

import { THEME_PALETTES } from '../../art/palettes';
import { paintObjectIcon } from '../../art/texture-catalog';
import type { LevelObject } from '../../models/level.model';
import type { EditorLevel } from '../editor-state';

/** Lado de uma célula no zoom de 100%. */
export const EDITOR_CELL = 32;

export type EditorTool = 'selecionar' | 'mover' | 'pincel' | 'apagar';

export interface GridCell {
  readonly x: number;
  readonly y: number;
}

export type CellPointerPhase = 'down' | 'move' | 'up';

export interface CellPointerEvent {
  readonly phase: CellPointerPhase;
  readonly cell: GridCell;
}

/**
 * A grade do editor, desenhada em um `<canvas>` do tamanho da janela.
 *
 * Só a parte visível é desenhada — a rolagem é a do navegador, sobre um
 * espaçador do tamanho da fase inteira. Assim uma fase de 400 colunas custa o
 * mesmo que uma de 30.
 *
 * O canvas não conhece regra de edição: ele só diz em que célula o ponteiro
 * está e em que fase do toque. Quem decide o que acontece é a página.
 */
@Component({
  selector: 'app-editor-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-canvas.html',
  styleUrl: './editor-canvas.scss',
})
export class EditorCanvas {
  readonly level = input.required<EditorLevel>();
  readonly zoom = input(1);
  readonly tool = input<EditorTool>('pincel');
  readonly selected = input<GridCell | null>(null);
  readonly ghost = input<GridCell | null>(null);

  readonly cellPointer = output<CellPointerEvent>();

  private readonly zone = inject(NgZone);
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly icons = new Map<string, HTMLCanvasElement>();
  private resizeObserver: ResizeObserver | null = null;
  private frame: number | null = null;
  private hover: GridCell | null = null;
  private isPointerDown = false;
  private panOrigin: { readonly x: number; readonly y: number; readonly left: number; readonly top: number } | null = null;

  protected readonly cellSize = computed(() => Math.round(EDITOR_CELL * this.zoom()));
  protected readonly contentWidth = computed(() => this.level().width * this.cellSize());
  protected readonly contentHeight = computed(() => this.level().height * this.cellSize());

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = new ResizeObserver(() => this.scheduleDraw());
      this.resizeObserver.observe(this.viewport().nativeElement);
      this.scheduleDraw();
    });

    effect(() => {
      // Qualquer mudança de fase, zoom ou seleção pede um novo desenho.
      this.level();
      this.cellSize();
      this.selected();
      this.ghost();
      this.scheduleDraw();
    });

    inject(DestroyRef).onDestroy(() => {
      this.resizeObserver?.disconnect();

      if (this.frame !== null) {
        cancelAnimationFrame(this.frame);
      }
    });
  }

  /** Célula sob um ponto da tela, ou `null` fora da grade. Usado no arrastar da paleta. */
  cellAt(clientX: number, clientY: number): GridCell | null {
    const viewport = this.viewport().nativeElement;
    const bounds = viewport.getBoundingClientRect();

    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
      return null;
    }

    const size = this.cellSize();
    const x = Math.floor((clientX - bounds.left + viewport.scrollLeft) / size);
    const y = Math.floor((clientY - bounds.top + viewport.scrollTop) / size);
    const level = this.level();

    return x >= 0 && y >= 0 && x < level.width && y < level.height ? { x, y } : null;
  }

  protected onScroll(): void {
    this.scheduleDraw();
  }

  protected onPointerDown(event: PointerEvent): void {
    const viewport = this.viewport().nativeElement;

    viewport.setPointerCapture(event.pointerId);
    this.isPointerDown = true;

    if (this.tool() === 'mover') {
      this.panOrigin = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
      return;
    }

    this.emit('down', event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.panOrigin) {
      const viewport = this.viewport().nativeElement;
      viewport.scrollLeft = this.panOrigin.left - (event.clientX - this.panOrigin.x);
      viewport.scrollTop = this.panOrigin.top - (event.clientY - this.panOrigin.y);
      return;
    }

    const cell = this.cellAt(event.clientX, event.clientY);

    if (!sameCell(cell, this.hover)) {
      this.hover = cell;
      this.scheduleDraw();
    }

    if (this.isPointerDown) {
      this.emit('move', event);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.isPointerDown) {
      return;
    }

    this.isPointerDown = false;

    if (this.panOrigin) {
      this.panOrigin = null;
      return;
    }

    this.emit('up', event);
  }

  protected onPointerLeave(): void {
    if (this.hover !== null) {
      this.hover = null;
      this.scheduleDraw();
    }
  }

  private emit(phase: CellPointerPhase, event: PointerEvent): void {
    const cell = this.cellAt(event.clientX, event.clientY);

    if (cell) {
      this.cellPointer.emit({ phase, cell });
    } else if (phase === 'up') {
      // Soltar fora da grade ainda encerra o traço, na última célula válida.
      this.cellPointer.emit({ phase, cell: this.hover ?? { x: 0, y: 0 } });
    }
  }

  /** Um desenho por quadro, no máximo, fora da zona do Angular. */
  private scheduleDraw(): void {
    if (this.frame !== null) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        this.draw();
      });
    });
  }

  private draw(): void {
    const viewport = this.viewport().nativeElement;
    const canvas = this.canvas().nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.translate(-viewport.scrollLeft, -viewport.scrollTop);

    const level = this.level();
    const size = this.cellSize();
    const first = Math.max(0, Math.floor(viewport.scrollLeft / size) - 2);
    const last = Math.min(level.width - 1, Math.ceil((viewport.scrollLeft + width) / size) + 1);

    this.drawBackground(context, level, size, first, last);

    for (const object of level.objects) {
      if (object.x >= first - 2 && object.x <= last) {
        this.drawObject(context, object, level, size);
      }
    }

    this.highlight(context, this.selected(), size, '#ffcf3f');
    this.highlight(context, this.ghost() ?? this.hover, size, 'rgba(255, 255, 255, 0.9)');
  }

  private drawBackground(context: CanvasRenderingContext2D, level: EditorLevel, size: number, first: number, last: number): void {
    const palette = THEME_PALETTES[level.theme];
    const left = first * size;
    const right = (last + 1) * size;
    const bottom = level.height * size;
    const gradient = context.createLinearGradient(0, 0, 0, bottom);

    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(1, palette.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(left, 0, right - left, bottom);

    // Céus claros (com nuvens) pedem linhas escuras; céus noturnos, linhas claras.
    context.strokeStyle = palette.hasClouds ? 'rgba(42, 35, 80, 0.12)' : 'rgba(255, 255, 255, 0.14)';
    context.lineWidth = 1;
    context.beginPath();

    for (let x = first; x <= last + 1; x += 1) {
      context.moveTo(x * size + 0.5, 0);
      context.lineTo(x * size + 0.5, bottom);
    }

    for (let y = 0; y <= level.height; y += 1) {
      context.moveTo(left, y * size + 0.5);
      context.lineTo(right, y * size + 0.5);
    }

    context.stroke();
  }

  private drawObject(context: CanvasRenderingContext2D, object: LevelObject, level: EditorLevel, size: number): void {
    const icon = this.iconFor(object, level);
    const x = object.x * size;
    const y = object.y * size;

    if (object.type === 'moving-platform') {
      this.drawMovingPath(context, object, size);
      context.drawImage(icon, x, y, size * 2, size);
      return;
    }

    context.drawImage(icon, x, y, size, size);
  }

  /** Linha tracejada mostrando até onde a plataforma móvel vai. */
  private drawMovingPath(context: CanvasRenderingContext2D, object: LevelObject, size: number): void {
    const range = (object.properties?.range ?? 3) * size;
    const isVertical = object.properties?.axis === 'vertical';
    const startX = object.x * size + size;
    const startY = object.y * size + size / 2;

    context.save();
    context.setLineDash([6, 5]);
    context.strokeStyle = 'rgba(42, 35, 80, 0.55)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(isVertical ? startX : startX + range, isVertical ? startY - range : startY);
    context.stroke();
    context.restore();
  }

  private iconFor(object: LevelObject, level: EditorLevel): HTMLCanvasElement {
    const key = `${level.theme}:${object.type}:${object.properties?.powerUp ?? ''}`;
    const cached = this.icons.get(key);

    if (cached) {
      return cached;
    }

    const icon = paintObjectIcon(object, level.theme);
    this.icons.set(key, icon);

    return icon;
  }

  private highlight(context: CanvasRenderingContext2D, cell: GridCell | null, size: number, color: string): void {
    if (!cell) {
      return;
    }

    context.strokeStyle = color;
    context.lineWidth = 3;
    context.strokeRect(cell.x * size + 1.5, cell.y * size + 1.5, size - 3, size - 3);
  }
}

function sameCell(first: GridCell | null, second: GridCell | null): boolean {
  return first?.x === second?.x && first?.y === second?.y;
}
