import type { CharacterPalette } from '../config/character.config';
import { circle, ellipse, eye, fillAndOutline, lighten, OUTLINE, roundedRect, star } from './canvas';

/** Área do retrato: larga o bastante para os braços e as pernas do Pedro. */
export const PEDRO_FRAME_WIDTH = 64;
export const PEDRO_FRAME_HEIGHT = 72;

const SKIN = '#ffd2a6';
/** Pele do lado de trás, um tom abaixo, para dar profundidade aos membros. */
const SKIN_SHADE = '#f0b98c';
const HAIR = '#5a3a22';
const SHORTS = '#3d5fb0';
const SNEAKER = '#ffffff';
const SOLE = '#2a2350';

type Point = readonly [number, number];

/** Mãos e pés do Pedro parado. */
const BACK_FOOT: Point = [28, 70];
const FRONT_FOOT: Point = [40, 70];
const BACK_HAND: Point = [24, 55];
const FRONT_HAND: Point = [45, 55];
const SHOULDER_Y = 43;
const HIP_Y = 58;

/** O Pedro parado e sorrindo, com as cores escolhidas em "Meu personagem". */
export function paintPedroPortrait(context: CanvasRenderingContext2D, palette: CharacterPalette): void {
  context.lineCap = 'round';
  context.lineJoin = 'round';

  paintBackpack(context, palette);

  limb(context, [27, SHOULDER_Y], BACK_HAND, SKIN_SHADE);
  hand(context, BACK_HAND, SKIN_SHADE);

  limb(context, [29, HIP_Y], BACK_FOOT, SKIN_SHADE);
  sneaker(context, BACK_FOOT);
  limb(context, [39, HIP_Y], FRONT_FOOT, SKIN);
  sneaker(context, FRONT_FOOT);

  // Bermuda e camiseta.
  roundedRect(context, 23, 53, 22, 8, 3);
  fillAndOutline(context, SHORTS);
  roundedRect(context, 23, 37, 22, 19, 7);
  fillAndOutline(context, palette.shirt);
  context.fillStyle = lighten(palette.shirt, 0.35);
  roundedRect(context, 26, 40, 5, 10, 2.5);
  context.fill();

  limb(context, [41, SHOULDER_Y], FRONT_HAND, SKIN);
  hand(context, FRONT_HAND, SKIN);

  paintHead(context, palette);
}

function paintHead(context: CanvasRenderingContext2D, palette: CharacterPalette): void {
  const centerX = 34;
  const centerY = 24;

  // Cabelo que escapa do boné na nuca.
  context.fillStyle = HAIR;
  ellipse(context, centerX - 11, centerY + 1, 7, 9);
  context.fill();

  circle(context, centerX, centerY, 15);
  fillAndOutline(context, SKIN);

  // Orelha, bochecha e rosto olhando para a direita.
  circle(context, centerX - 7, centerY + 3, 3.5);
  fillAndOutline(context, SKIN, 2);
  context.fillStyle = '#ff9fb2';
  ellipse(context, centerX + 9, centerY + 7, 3.5, 2.2);
  context.fill();

  eye(context, centerX + 3, centerY + 1, 4.2, 0.3);
  eye(context, centerX + 11, centerY + 1, 4.2, 0.3);
  paintSmile(context, centerX + 8, centerY + 9);

  // Boné: copa, aba virada para a frente e a estrela do Pedro.
  context.beginPath();
  context.arc(centerX, centerY - 2, 16, Math.PI * 1.02, Math.PI * 1.98);
  context.closePath();
  fillAndOutline(context, palette.cap);

  roundedRect(context, centerX + 8, centerY - 7, 18, 6, 3);
  fillAndOutline(context, palette.cap);

  context.fillStyle = '#ffffff';
  star(context, centerX - 1, centerY - 10, 5, 2.2);
  context.fill();

  circle(context, centerX, centerY - 18, 2.5);
  fillAndOutline(context, lighten(palette.cap, 0.3), 2);
}

function paintSmile(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y - 3, 4, Math.PI * 0.2, Math.PI * 0.8);
  context.stroke();
}

function paintBackpack(context: CanvasRenderingContext2D, palette: CharacterPalette): void {
  const top = 38;

  switch (palette.backpackStyle) {
    case 'dino': {
      context.fillStyle = palette.backpack;
      context.strokeStyle = OUTLINE;
      context.lineWidth = 2.5;

      // Espinhos do dinossauro nas costas da mochila.
      for (const offset of [0, 6, 12]) {
        context.beginPath();
        context.moveTo(13, top + 3 + offset);
        context.lineTo(7, top + 6 + offset);
        context.lineTo(13, top + 9 + offset);
        context.closePath();
        context.fill();
        context.stroke();
      }

      roundedRect(context, 11, top, 15, 20, 6);
      fillAndOutline(context, palette.backpack);
      context.fillStyle = lighten(palette.backpack, 0.4);
      roundedRect(context, 16, top + 8, 7, 9, 3);
      context.fill();
      context.fillStyle = OUTLINE;
      circle(context, 15, top + 4, 1.4);
      context.fill();
      return;
    }
    case 'rocket': {
      context.beginPath();
      context.moveTo(11, top + 18);
      context.lineTo(6, top + 23);
      context.lineTo(12, top + 22);
      context.closePath();
      fillAndOutline(context, '#ff5a5a', 2);
      roundedRect(context, 11, top + 2, 13, 20, 6);
      fillAndOutline(context, palette.backpack);
      context.beginPath();
      context.moveTo(11, top + 6);
      context.quadraticCurveTo(17.5, top - 6, 24, top + 6);
      context.closePath();
      fillAndOutline(context, '#ff5a5a', 2);
      circle(context, 17.5, top + 11, 3);
      fillAndOutline(context, '#7fd4ff', 2);
      return;
    }
    case 'star':
      star(context, 17, top + 10, 11, 5);
      fillAndOutline(context, palette.backpack);
      shine(context, 14, top + 7);
      return;
    case 'none':
      return;
  }
}

function shine(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = 'rgba(255, 255, 255, 0.6)';
  circle(context, x, y, 2.2);
  context.fill();
}

/** Braço ou perna: traço grosso com contorno. */
function limb(context: CanvasRenderingContext2D, from: Point, to: Point, color: string): void {
  context.beginPath();
  context.moveTo(from[0], from[1]);
  context.lineTo(to[0], to[1]);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 9;
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.stroke();
}

function hand(context: CanvasRenderingContext2D, at: Point, color: string): void {
  circle(context, at[0], at[1], 3.6);
  fillAndOutline(context, color, 2);
}

function sneaker(context: CanvasRenderingContext2D, at: Point): void {
  roundedRect(context, at[0] - 5, at[1] - 6, 13, 7, 3.5);
  fillAndOutline(context, SNEAKER, 2.5);
  context.fillStyle = SOLE;
  context.fillRect(at[0] - 4, at[1] - 1.5, 11, 1.8);
}
