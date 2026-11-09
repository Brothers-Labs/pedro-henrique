import { darken, ellipse, fillAndOutline, OUTLINE, shine } from './canvas';

export const PUMPKIN_ORANGE = '#ff8a1f';
const STEM = '#5a8a2e';

/**
 * A abóbora em gomos, com o cabinho verde: a mesma da decoração e da abóbora
 * viva, que só ganha olhos e boca por cima.
 */
export function paintPumpkinShape(context: CanvasRenderingContext2D, centerX: number, centerY: number, radiusX: number, radiusY: number): void {
  context.fillStyle = STEM;
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;
  context.beginPath();
  context.rect(centerX - 2.5, centerY - radiusY - 6, 5, 8);
  context.fill();
  context.stroke();

  ellipse(context, centerX, centerY, radiusX, radiusY);
  fillAndOutline(context, PUMPKIN_ORANGE);

  // Os gomos: dois arcos mais escuros de cada lado do meio.
  context.strokeStyle = darken(PUMPKIN_ORANGE, 0.22);
  context.lineWidth = 2;

  for (const offset of [-0.5, 0, 0.5]) {
    ellipse(context, centerX + offset * radiusX * 0.6, centerY, radiusX * (0.55 - Math.abs(offset) * 0.3), radiusY - 1);
    context.stroke();
  }

  shine(context, centerX - radiusX * 0.5, centerY - radiusY * 0.45, radiusX * 0.22, radiusY * 0.16);
}

/** Olhos de triângulo e o sorriso recortado da lanterna de abóbora, acesos por dentro. */
export function paintPumpkinFace(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, glow: string): void {
  context.fillStyle = glow;
  context.strokeStyle = OUTLINE;
  context.lineWidth = 1.5;

  for (const side of [-1, 1]) {
    const eyeX = centerX + side * size * 0.38;

    context.beginPath();
    context.moveTo(eyeX - size * 0.18, centerY - size * 0.05);
    context.lineTo(eyeX, centerY - size * 0.38);
    context.lineTo(eyeX + size * 0.18, centerY - size * 0.05);
    context.closePath();
    context.fill();
    context.stroke();
  }

  context.beginPath();
  context.moveTo(centerX - size * 0.5, centerY + size * 0.15);
  context.quadraticCurveTo(centerX, centerY + size * 0.65, centerX + size * 0.5, centerY + size * 0.15);
  context.quadraticCurveTo(centerX, centerY + size * 0.35, centerX - size * 0.5, centerY + size * 0.15);
  context.closePath();
  context.fill();
  context.stroke();
}
