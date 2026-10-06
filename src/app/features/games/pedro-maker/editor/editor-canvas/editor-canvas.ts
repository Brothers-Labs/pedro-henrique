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
import type { EditorLevel, GridCell } from '../editor-state';

/** Lado de uma célula no zoom de 100%. */
export const EDITOR_CELL = 32;

export const MIN_EDITOR_ZOOM = 0.4;
export const MAX_EDITOR_ZOOM = 2;

export type EditorTool = 'pincel' | 'retangulo' | 'apagar' | 'selecionar' | 'conta-gotas' | 'mover';

/** `cancel` avisa que o traço foi abandonado: entrou um segundo dedo para dar zoom. */
export type CellPointerPhase = 'down' | 'move' | 'up' | 'cancel';

export interface CellPointerEvent {
  readonly phase: CellPointerPhase;
  readonly cell: GridCell;
}

/** Área retangular marcada na grade (prévia do retângulo). */
export interface GridArea {
  readonly from: GridCell;
  readonly to: GridCell;
}

/** Trecho da fase que aparece na tela, em colunas. */
export interface GridViewport {
  readonly firstColumn: number;
  readonly visibleColumns: number;
}

interface PinchStart {
  readonly distance: number;
  readonly zoom: number;
  readonly middleX: number;
  readonly middleY: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
}

/**
 * A grade do editor, desenhada em um `<canvas>` do tamanho da janela.
 *
 * Só a parte visível é desenhada — a rolagem é a do navegador, sobre um
 * espaçador do tamanho da fase inteira. Assim uma fase de 400 colunas custa o
 * mesmo que uma de 30.
 *
 * No celular, um dedo desenha e dois dedos navegam: pinça aproxima e afasta,
 * arrastar com os dois rola a fase — com qualquer ferramenta, sem trocar de
 * botão. O canvas não conhece regra de edição: diz em que célula o dedo está
 * e em que fase do toque; quem decide o que acontece é a página.
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
  readonly area = input<GridArea | null>(null);

  readonly cellPointer = output<CellPointerEvent>();
  /** Zoom pedido pela pinça ou pela roda do mouse; a página decide se aceita. */
  readonly zoomRequest = output<number>();
  readonly viewportChange = output<GridViewport>();

  private readonly zone = inject(NgZone);
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly icons = new Map<string, HTMLCanvasElement>();
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private resizeObserver: ResizeObserver | null = null;
  private frame: number | null = null;
  private hover: GridCell | null = null;
  private isDrawing = false;
  private panOrigin: { readonly x: number; readonly y: number; readonly left: number; readonly top: number } | null = null;
  private pinch: PinchStart | null = null;
  /** Ponto da fase que deve ficar embaixo dos dedos depois de um zoom. */
  private zoomFocus: { readonly cellX: number; readonly cellY: number; readonly screenX: number; readonly screenY: number } | null = null;
  private lastViewport: GridViewport | null = null;

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
      // Qualquer mudança de fase, zoom, seleção ou área pede um novo desenho.
      this.level();
      this.cellSize();
      this.selected();
      this.ghost();
      this.area();
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

  /** Centraliza a tela numa coluna: é o toque no mapinha da fase. */
  scrollToColumn(column: number): void {
    const viewport = this.viewport().nativeElement;

    viewport.scrollLeft = column * this.cellSize() - viewport.clientWidth / 2;
  }

  protected onScroll(): void {
    this.scheduleDraw();
  }

  protected onPointerDown(event: PointerEvent): void {
    const viewport = this.viewport().nativeElement;

    viewport.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2) {
      this.startPinch();
      return;
    }

    if (this.pointers.size > 2) {
      return;
    }

    if (this.tool() === 'mover') {
      this.panOrigin = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
      return;
    }

    this.isDrawing = true;
    this.emit('down', event);
  }

  protected onPointerMove(event: PointerEvent): void {
    const tracked = this.pointers.get(event.pointerId);

    if (tracked) {
      tracked.x = event.clientX;
      tracked.y = event.clientY;
    }

    if (this.pinch) {
      this.updatePinch();
      return;
    }

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

    if (this.isDrawing) {
      this.emit('move', event);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);

    if (this.pinch) {
      // O gesto só termina quando os dois dedos saem; até lá, nada de desenhar.
      if (this.pointers.size === 0) {
        this.pinch = null;
      }

      return;
    }

    this.panOrigin = null;

    if (this.isDrawing) {
      this.isDrawing = false;
      this.emit('up', event);
    }
  }

  protected onPointerLeave(): void {
    if (this.hover !== null) {
      this.hover = null;
      this.scheduleDraw();
    }
  }

  /** Ctrl + roda do mouse (ou pinça no touchpad) aproxima em volta do ponteiro. */
  protected onWheel(event: WheelEvent): void {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();
    this.requestZoom(this.zoom() * Math.exp(-event.deltaY * 0.0025), event.clientX, event.clientY);
  }

  private startPinch(): void {
    const [first, second] = [...this.pointers.values()];

    if (!first || !second) {
      return;
    }

    if (this.isDrawing) {
      this.isDrawing = false;
      this.cellPointer.emit({ phase: 'cancel', cell: this.hover ?? { x: 0, y: 0 } });
    }

    const viewport = this.viewport().nativeElement;

    this.panOrigin = null;
    this.pinch = {
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      zoom: this.zoom(),
      middleX: (first.x + second.x) / 2,
      middleY: (first.y + second.y) / 2,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
  }

  private updatePinch(): void {
    const pinch = this.pinch;
    const [first, second] = [...this.pointers.values()];

    if (!pinch || !first || !second) {
      return;
    }

    const viewport = this.viewport().nativeElement;
    const middleX = (first.x + second.x) / 2;
    const middleY = (first.y + second.y) / 2;
    const distance = Math.hypot(second.x - first.x, second.y - first.y);

    viewport.scrollLeft = pinch.scrollLeft - (middleX - pinch.middleX);
    viewport.scrollTop = pinch.scrollTop - (middleY - pinch.middleY);
    this.requestZoom((pinch.zoom * distance) / pinch.distance, middleX, middleY);
  }

  private requestZoom(zoom: number, clientX: number, clientY: number): void {
    const clamped = Math.min(MAX_EDITOR_ZOOM, Math.max(MIN_EDITOR_ZOOM, zoom));

    if (Math.abs(clamped - this.zoom()) < 0.01) {
      return;
    }

    const viewport = this.viewport().nativeElement;
    const bounds = viewport.getBoundingClientRect();
    const size = this.cellSize();
    const screenX = clientX - bounds.left;
    const screenY = clientY - bounds.top;

    this.zoomFocus = {
      cellX: (screenX + viewport.scrollLeft) / size,
      cellY: (screenY + viewport.scrollTop) / size,
      screenX,
      screenY,
    };
    this.zoomRequest.emit(clamped);
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

    this.keepZoomFocus(viewport);

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

    this.drawArea(context, this.area(), size);
    this.highlight(context, this.selected(), size, '#ffcf3f');
    this.highlight(context, this.ghost() ?? this.hover, size, 'rgba(255, 255, 255, 0.9)');
    this.reportViewport(viewport.scrollLeft / size, width / size);
  }

  /** Depois de um zoom, rola para que o ponto sob os dedos continue sob os dedos. */
  private keepZoomFocus(viewport: HTMLDivElement): void {
    const focus = this.zoomFocus;

    if (!focus) {
      return;
    }

    const size = this.cellSize();

    this.zoomFocus = null;
    viewport.scrollLeft = focus.cellX * size - focus.screenX;
    viewport.scrollTop = focus.cellY * size - focus.screenY;
  }

  private reportViewport(firstColumn: number, visibleColumns: number): void {
    const previous = this.lastViewport;

    if (previous && Math.abs(previous.firstColumn - firstColumn) < 0.25 && Math.abs(previous.visibleColumns - visibleColumns) < 0.25) {
      return;
    }

    const next = { firstColumn, visibleColumns };

    this.lastViewport = next;
    this.zone.run(() => this.viewportChange.emit(next));
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

    if (object.type === 'door' && object.properties?.pair) {
      this.drawBadge(context, object.properties.pair, x, y, size);
    }
  }

  /** Letra da porta no canto: mostra qual porta leva a qual. */
  private drawBadge(context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
    const radius = Math.max(7, size * 0.24);

    context.fillStyle = '#ffcf3f';
    context.strokeStyle = '#2a2350';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x + size - radius, y + radius, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#2a2350';
    context.font = `800 ${Math.round(radius * 1.3)}px "Baloo 2", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, x + size - radius, y + radius + 1);
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

  private drawArea(context: CanvasRenderingContext2D, area: GridArea | null, size: number): void {
    if (!area) {
      return;
    }

    const left = Math.min(area.from.x, area.to.x) * size;
    const top = Math.min(area.from.y, area.to.y) * size;
    const width = (Math.abs(area.to.x - area.from.x) + 1) * size;
    const height = (Math.abs(area.to.y - area.from.y) + 1) * size;

    context.fillStyle = 'rgba(255, 207, 63, 0.25)';
    context.fillRect(left, top, width, height);
    context.save();
    context.setLineDash([8, 6]);
    context.strokeStyle = '#ffcf3f';
    context.lineWidth = 3;
    context.strokeRect(left + 1.5, top + 1.5, width - 3, height - 3);
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
