import { PAPER_COLOR } from '../../core/data/drawing.data';
import type { BrushMark, DrawingMark, DrawingPoint, StampMark } from '../../core/models/drawing.model';

/**
 * Desenho no canvas, sem Angular e sem eventos.
 *
 * Traços são polilinhas com ponta e junta redondas: o mesmo algoritmo serve
 * para pintar o segmento novo durante o movimento e para redesenhar a folha
 * inteira depois de um desfazer. Os dois caminhos precisam produzir o mesmo
 * pixel, senão desfazer mudaria o desenho.
 */

/** Distância mínima, na folha, para um ponto novo entrar no traço. */
export const MIN_POINT_DISTANCE = 2.5;

/** Limpa a folha e devolve o papel branco. */
export function clearPaper(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.fillStyle = PAPER_COLOR;
  context.fillRect(0, 0, width, height);
}

/** Redesenha a folha inteira a partir das marcas guardadas. */
export function paintMarks(
  context: CanvasRenderingContext2D,
  marks: readonly DrawingMark[],
  width: number,
  height: number,
): void {
  clearPaper(context, width, height);

  for (const mark of marks) {
    paintMark(context, mark);
  }
}

export function paintMark(context: CanvasRenderingContext2D, mark: DrawingMark): void {
  if (mark.kind === 'carimbo') {
    paintStamp(context, mark);
    return;
  }

  paintBrush(context, mark);
}

/**
 * Pinta o segmento entre dois pontos.
 *
 * Usado durante o movimento do dedo, para não redesenhar o traço inteiro a
 * cada quadro.
 */
export function paintSegment(
  context: CanvasRenderingContext2D,
  from: DrawingPoint,
  to: DrawingPoint,
  color: string,
  size: number,
): void {
  applyBrushStyle(context, color, size);

  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

/** Um toque sem arrasto vira um pontinho redondo. */
export function paintDot(
  context: CanvasRenderingContext2D,
  point: DrawingPoint,
  color: string,
  size: number,
): void {
  context.fillStyle = color;
  context.beginPath();
  context.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
  context.fill();
}

/**
 * Converte a posição do ponteiro na tela para a coordenada da folha.
 *
 * A folha tem resolução fixa e é exibida esticada por CSS: sem esta conversão
 * o traço sairia deslocado em qualquer tamanho de tela diferente do original.
 */
export function toPaperPoint(
  clientX: number,
  clientY: number,
  bounds: { readonly left: number; readonly top: number; readonly width: number; readonly height: number },
  paperWidth: number,
  paperHeight: number,
): DrawingPoint {
  if (bounds.width === 0 || bounds.height === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: ((clientX - bounds.left) / bounds.width) * paperWidth,
    y: ((clientY - bounds.top) / bounds.height) * paperHeight,
  };
}

/** Filtra pontos grudados: sem isso um traço curto guardaria centenas deles. */
export function isFarEnough(
  from: DrawingPoint,
  to: DrawingPoint,
  minDistance = MIN_POINT_DISTANCE,
): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) >= minDistance;
}

function paintBrush(context: CanvasRenderingContext2D, mark: BrushMark): void {
  const [first, ...rest] = mark.points;

  if (!first) {
    return;
  }

  if (rest.length === 0) {
    paintDot(context, first, mark.color, mark.size);
    return;
  }

  applyBrushStyle(context, mark.color, mark.size);

  context.beginPath();
  context.moveTo(first.x, first.y);

  for (const point of rest) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function paintStamp(context: CanvasRenderingContext2D, mark: StampMark): void {
  context.save();
  context.font = `${mark.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(mark.emoji, mark.point.x, mark.point.y);
  context.restore();
}

function applyBrushStyle(context: CanvasRenderingContext2D, color: string, size: number): void {
  context.strokeStyle = color;
  context.lineWidth = size;
  context.lineCap = 'round';
  context.lineJoin = 'round';
}
