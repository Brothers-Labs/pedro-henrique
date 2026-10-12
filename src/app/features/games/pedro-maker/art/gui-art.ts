import type { CharacterPalette } from '../config/character.config';
import { circle, darken, ellipse, eye, fillAndOutline, hand, limb, type Point, roundedRect, smile } from './canvas';

const SKIN = '#ffd2a6';
const SKIN_SHADE = '#f0b98c';
const NOSE = '#f5b08c';
const HAIR = '#3a2516';
const OVERALLS = '#2f5fd0';
const BUTTON = '#ffd23f';
const SHOE = '#6b3f22';

/** Mãos e pés do Gui parado: o mesmo quadro do Pedro, com o corpo mais esticado. */
const BACK_FOOT: Point = [29, 70];
const FRONT_FOOT: Point = [39, 70];
const BACK_HAND: Point = [25, 54];
const FRONT_HAND: Point = [44, 54];
const SHOULDER_Y = 39;
const HIP_Y = 56;

/**
 * O Gui parado e sorrindo: alto, magro, de boné e camiseta verdes e macacão
 * azul. Cabe no mesmo quadro do retrato do Pedro, e os dois aparecem do mesmo
 * tamanho nos menus.
 */
export function paintGuiPortrait(context: CanvasRenderingContext2D, palette: CharacterPalette): void {
  const sleeveShade = darken(palette.shirt, 0.15);

  context.lineCap = 'round';
  context.lineJoin = 'round';

  limb(context, [28, SHOULDER_Y], BACK_HAND, sleeveShade);
  hand(context, BACK_HAND, SKIN_SHADE);

  limb(context, [30, HIP_Y], BACK_FOOT, darken(OVERALLS, 0.2));
  shoe(context, BACK_FOOT);
  limb(context, [38, HIP_Y], FRONT_FOOT, OVERALLS);
  shoe(context, FRONT_FOOT);

  paintOutfit(context, palette.shirt);

  limb(context, [40, SHOULDER_Y], FRONT_HAND, palette.shirt);
  hand(context, FRONT_HAND, SKIN);

  paintHead(context, palette.cap);
}

/** Camiseta por baixo e macacão por cima, com peitilho, alças e dois botões. */
function paintOutfit(context: CanvasRenderingContext2D, shirt: string): void {
  roundedRect(context, 25, 34, 18, 22, 6);
  fillAndOutline(context, shirt);

  roundedRect(context, 25, 47, 18, 11, 3);
  fillAndOutline(context, OVERALLS);
  roundedRect(context, 28, 40, 12, 9, 2);
  fillAndOutline(context, OVERALLS, 2);

  context.strokeStyle = OVERALLS;
  context.lineWidth = 3;

  for (const [fromX, toX] of [
    [28, 29],
    [40, 39],
  ] as const) {
    context.beginPath();
    context.moveTo(fromX, 35);
    context.lineTo(toX, 41);
    context.stroke();
  }

  for (const x of [30.5, 37.5]) {
    circle(context, x, 43.5, 1.6);
    fillAndOutline(context, BUTTON, 1);
  }
}

function paintHead(context: CanvasRenderingContext2D, cap: string): void {
  const centerX = 34;
  const centerY = 21;

  // Cabelo que escapa do boné na nuca.
  context.fillStyle = HAIR;
  ellipse(context, centerX - 10, centerY + 1, 6, 8);
  context.fill();

  circle(context, centerX, centerY, 13);
  fillAndOutline(context, SKIN);

  // Orelha, bochecha, olhos, o nariz redondo e o sorriso, olhando para a direita.
  circle(context, centerX - 6, centerY + 3, 3);
  fillAndOutline(context, SKIN, 2);
  context.fillStyle = '#ff9fb2';
  ellipse(context, centerX + 7, centerY + 6.5, 3, 2);
  context.fill();

  eye(context, centerX + 3, centerY, 3.8, 0.3);
  eye(context, centerX + 10, centerY, 3.8, 0.3);
  ellipse(context, centerX + 13, centerY + 4, 3.2, 2.6);
  fillAndOutline(context, NOSE, 2);
  smile(context, centerX + 8, centerY + 9.5);

  // Boné: copa, aba virada para a frente e o emblema redondo com o "G".
  context.beginPath();
  context.arc(centerX, centerY - 2, 14, Math.PI * 1.02, Math.PI * 1.98);
  context.closePath();
  fillAndOutline(context, cap);

  roundedRect(context, centerX + 7, centerY - 6, 16, 5, 2.5);
  fillAndOutline(context, cap);

  circle(context, centerX - 1, centerY - 9, 4.2);
  fillAndOutline(context, '#ffffff', 1.5);
  context.fillStyle = cap;
  context.font = 'bold 6px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('G', centerX - 1, centerY - 8.7);
}

function shoe(context: CanvasRenderingContext2D, at: Point): void {
  roundedRect(context, at[0] - 5, at[1] - 6, 13, 7, 3.5);
  fillAndOutline(context, SHOE, 2.5);
}
