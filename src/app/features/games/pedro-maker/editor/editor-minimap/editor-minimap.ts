import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

import { THEME_PALETTES } from '../../art/palettes';
import { OBJECT_BEHAVIOR } from '../../config/object-catalog';
import type { LevelObjectType } from '../../models/level.model';
import type { GridViewport } from '../editor-canvas/editor-canvas';
import type { EditorLevel } from '../editor-state';

/** Cor de cada peça no mapinha: o bastante para reconhecer o caminho, sem detalhe. */
const MARKER_COLORS: Readonly<Partial<Record<LevelObjectType, string>>> = {
  start: '#3fa3f5',
  portal: '#b39cff',
  checkpoint: '#4cc94a',
  coin: '#ffc629',
  'big-coin': '#ffc629',
  crystal: '#6fe3ff',
  lava: '#ff6a00',
  water: '#2f9be8',
  spikes: '#c9cfdd',
  slime: '#e8505b',
  spiky: '#e8505b',
  bat: '#e8505b',
  robot: '#e8505b',
  ghost: '#e8505b',
  turtle: '#e8505b',
  piranha: '#e8505b',
  penguin: '#e8505b',
  'lava-bubble': '#e8505b',
  bee: '#e8505b',
  boss: '#e8505b',
};

/**
 * Mapinha da fase inteira, acima da grade.
 *
 * Numa fase de 200 colunas o celular mostra só um pedacinho; o mapinha mostra
 * onde o Pedro está trabalhando e leva a qualquer ponto com um toque ou
 * arrastando o dedo.
 */
@Component({
  selector: 'app-editor-minimap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #canvas
      class="map"
      role="slider"
      aria-label="Mapa da fase. Toque para ir até um trecho."
      aria-valuemin="0"
      [attr.aria-valuemax]="level().width"
      [attr.aria-valuenow]="viewport()?.firstColumn ?? 0"
      (pointerdown)="press($event)"
      (pointermove)="drag($event)"
      (pointerup)="release()"
      (pointercancel)="release()"
    ></canvas>
  `,
  styles: `
    :host {
      display: block;
    }

    .map {
      display: block;
      width: 100%;
      height: 2.25rem;
      border: 3px solid #2a2350;
      border-radius: 0.7rem;
      touch-action: none;
      cursor: pointer;
      image-rendering: pixelated;
    }
  `,
})
export class EditorMinimap {
  readonly level = input.required<EditorLevel>();
  readonly viewport = input<GridViewport | null>(null);

  readonly jump = output<number>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private isDragging = false;

  constructor() {
    afterRenderEffect(() => this.draw(this.level(), this.viewport()));
  }

  protected press(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging = true;
    this.jumpTo(event);
  }

  protected drag(event: PointerEvent): void {
    if (this.isDragging) {
      this.jumpTo(event);
    }
  }

  protected release(): void {
    this.isDragging = false;
  }

  private jumpTo(event: PointerEvent): void {
    const bounds = this.canvas().nativeElement.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));

    this.jump.emit(Math.round(ratio * this.level().width));
  }

  /** Um pixel por célula; o navegador estica sem borrar (`pixelated`). */
  private draw(level: EditorLevel, viewport: GridViewport | null): void {
    const canvas = this.canvas().nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    canvas.width = level.width;
    canvas.height = level.height;

    const palette = THEME_PALETTES[level.theme];

    context.fillStyle = palette.skyBottom;
    context.fillRect(0, 0, level.width, level.height);

    for (const object of level.objects) {
      const color = MARKER_COLORS[object.type] ?? terrainColor(object.type, palette.soil, palette.surface);

      if (color) {
        context.fillStyle = color;
        context.fillRect(object.x, object.y, 1, 1);
      }
    }

    if (viewport) {
      context.fillStyle = 'rgba(255, 255, 255, 0.35)';
      context.fillRect(viewport.firstColumn, 0, viewport.visibleColumns, level.height);
      context.strokeStyle = '#ffcf3f';
      context.lineWidth = 1;
      context.strokeRect(viewport.firstColumn + 0.5, 0.5, Math.max(1, viewport.visibleColumns - 1), level.height - 1);
    }
  }
}

/** Chão e plataformas aparecem; enfeites e dicas ficam de fora do mapinha. */
function terrainColor(type: LevelObjectType, solid: string, oneWay: string): string | null {
  switch (OBJECT_BEHAVIOR[type].surface) {
    case 'solid':
      return solid;
    case 'one-way':
      return oneWay;
    case 'hazard':
    case 'water':
    case 'none':
      return null;
  }
}
