import type { CharacterPalette } from '../config/character.config';
import { WARIO_COLORS as COLOR, WARIO_EMBLEM } from '../config/wario.config';
import { circle, ellipse, fillAndOutline, roundedRect } from './canvas';

/** Retrato frontal próprio, no mesmo quadro dos demais heróis. */
export function paintWarioPortrait(context: CanvasRenderingContext2D, palette: CharacterPalette): void {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  paintBody(context, palette.shirt);
  paintFace(context);
  paintCap(context, palette.cap);
  context.restore();
}

function paintBody(context: CanvasRenderingContext2D, shirt: string): void {
  for (const x of [24, 40]) {
    roundedRect(context, x - 5, 52, 10, 12, 3);
    fillAndOutline(context, COLOR.overalls, 1.5);
    roundedRect(context, x - 7, 61, 15, 7, 3);
    fillAndOutline(context, COLOR.shoe, 1.5);
  }

  ellipse(context, 32, 44, 19, 15);
  fillAndOutline(context, shirt, 1.5);
  roundedRect(context, 17, 44, 30, 15, 6);
  fillAndOutline(context, COLOR.overalls, 1.5);
  for (const x of [21, 43]) {
    roundedRect(context, x - 2, 33, 4, 16, 1);
    fillAndOutline(context, COLOR.overalls, 1);
    circle(context, x, 45, 2);
    fillAndOutline(context, '#ffffff', 1);
  }
  for (const x of [11, 53]) {
    ellipse(context, x, 40, 6, 8);
    fillAndOutline(context, shirt, 1.5);
    ellipse(context, x, 49, 6, 6);
    fillAndOutline(context, COLOR.glove, 1.5);
    context.fillStyle = COLOR.emblem;
    context.font = 'bold 6px sans-serif';
    context.textAlign = 'center';
    context.fillText('W', x, 51);
  }
}

function paintFace(context: CanvasRenderingContext2D): void {
  ellipse(context, 32, 25, 19, 14);
  fillAndOutline(context, COLOR.skin, 1.5);
  for (const x of [13, 51]) {
    ellipse(context, x, 25, 3, 5);
    fillAndOutline(context, COLOR.skin, 1);
  }
  for (const x of [24, 40]) {
    ellipse(context, x, 23, 5, 4);
    fillAndOutline(context, '#ffffff', 1);
    context.fillStyle = COLOR.emblem;
    ellipse(context, x + (x < 32 ? 1 : -1), 24, 2, 3);
    context.fill();
  }
  context.strokeStyle = COLOR.mustache;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(19, 18);
  context.lineTo(28, 20);
  context.moveTo(36, 20);
  context.lineTo(45, 18);
  context.stroke();
  roundedRect(context, 23, 31, 18, 7, 3);
  fillAndOutline(context, '#ffffff', 1);
  context.fillStyle = COLOR.mustache;
  context.beginPath();
  context.moveTo(15, 27);
  for (const [x, y] of [[19, 30], [23, 28], [27, 31], [32, 29], [37, 31], [41, 28], [45, 30], [49, 27], [45, 33], [40, 32], [36, 35], [32, 33], [28, 35], [24, 32], [19, 33]] as const) {
    context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  ellipse(context, 32, 27, 7, 5);
  fillAndOutline(context, COLOR.nose, 1);
}

function paintCap(context: CanvasRenderingContext2D, cap: string): void {
  roundedRect(context, 13, 5, 38, 14, 7);
  fillAndOutline(context, cap, 1.5);
  roundedRect(context, 12, 15, 40, 5, 2);
  fillAndOutline(context, cap, 1.5);
  ellipse(context, 32, 12, 7, 5);
  fillAndOutline(context, '#ffffff', 1);
  context.fillStyle = COLOR.emblem;
  WARIO_EMBLEM.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel === '1') context.fillRect(27 + x * 2, 8 + y * 1.5, 2, 1.5);
  }));
}
