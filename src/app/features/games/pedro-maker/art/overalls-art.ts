import type { CharacterPalette } from '../config/character.config';
import {
  ANA_OVERALLS,
  BRUNO_OVERALLS,
  CAIO_OVERALLS,
  CLASSIC_OVERALLS,
  GIUSEPPE_OVERALLS,
  NINA_OVERALLS,
  OTTO_OVERALLS,
  type OverallsColors,
  TINA_OVERALLS,
  ZECA_OVERALLS,
} from '../config/overalls.config';
import { circle, darken, ellipse, eye, fillAndOutline, hand, limb, type Point, roundedRect, smile } from './canvas';

const SKIN = '#ffd2a6';
const SKIN_SHADE = '#f0b98c';
const NOSE = '#f5b08c';

/** Mãos e pés do herói alto parado: o mesmo quadro do Pedro, com o corpo mais esticado. */
const BACK_FOOT: Point = [29, 70];
const FRONT_FOOT: Point = [39, 70];
const BACK_HAND: Point = [25, 54];
const FRONT_HAND: Point = [44, 54];
const SHOULDER_Y = 39;
const HIP_Y = 56;

/** O que muda entre os retratos dos heróis de macacão. */
export interface OverallsPortrait {
  /** Letra do emblema do boné. */
  readonly emblem: string;
  readonly hasMustache: boolean;
  /** Quanto o corpo desce, em pixels, para o herói mais baixinho; os pés não saem do chão. */
  readonly drop: number;
  readonly colors: OverallsColors;
}

export const GUI_PORTRAIT: OverallsPortrait = { emblem: 'G', hasMustache: false, drop: 0, colors: CLASSIC_OVERALLS };
export const LUIGI_PORTRAIT: OverallsPortrait = { emblem: 'L', hasMustache: true, drop: 0, colors: CLASSIC_OVERALLS };
export const MARIO_PORTRAIT: OverallsPortrait = { emblem: 'M', hasMustache: true, drop: 5, colors: CLASSIC_OVERALLS };
export const GIUSEPPE_PORTRAIT: OverallsPortrait = { emblem: 'J', hasMustache: true, drop: 6, colors: GIUSEPPE_OVERALLS };
export const ZECA_PORTRAIT: OverallsPortrait = { emblem: 'Z', hasMustache: true, drop: 3, colors: ZECA_OVERALLS };
export const TINA_PORTRAIT: OverallsPortrait = { emblem: 'T', hasMustache: false, drop: 0, colors: TINA_OVERALLS };
export const BRUNO_PORTRAIT: OverallsPortrait = { emblem: 'B', hasMustache: true, drop: 7, colors: BRUNO_OVERALLS };
export const ANA_PORTRAIT: OverallsPortrait = { emblem: 'A', hasMustache: false, drop: 0, colors: ANA_OVERALLS };
export const CAIO_PORTRAIT: OverallsPortrait = { emblem: 'C', hasMustache: false, drop: 3, colors: CAIO_OVERALLS };
export const NINA_PORTRAIT: OverallsPortrait = { emblem: 'N', hasMustache: false, drop: 0, colors: NINA_OVERALLS };
export const OTTO_PORTRAIT: OverallsPortrait = { emblem: 'O', hasMustache: true, drop: 4, colors: OTTO_OVERALLS };

/**
 * Herói de macacão parado e sorrindo, de boné e camiseta da cor dele e o
 * macacão, os sapatos e o cabelo descritos no retrato. Cabe no mesmo quadro do retrato do
 * Pedro, e todos aparecem na mesma escala nos menus.
 */
export function paintOverallsPortrait(context: CanvasRenderingContext2D, palette: CharacterPalette, portrait: OverallsPortrait): void {
  const { colors } = portrait;
  const overalls = colors.overalls;
  const sleeveShade = darken(palette.shirt, 0.15);
  const hipY = HIP_Y + portrait.drop;

  context.lineCap = 'round';
  context.lineJoin = 'round';

  // Pernas e sapatos ficam no chão; o resto do corpo desce junto com o quadril.
  limb(context, [30, hipY], BACK_FOOT, darken(overalls, 0.2));
  shoe(context, BACK_FOOT, colors.shoe);
  limb(context, [38, hipY], FRONT_FOOT, overalls);
  shoe(context, FRONT_FOOT, colors.shoe);

  context.save();
  context.translate(0, portrait.drop);

  // O braço de trás é pintado por cima das pernas, mas ainda atrás do tronco.
  limb(context, [28, SHOULDER_Y], BACK_HAND, sleeveShade);
  hand(context, BACK_HAND, SKIN_SHADE);

  paintOutfit(context, palette.shirt, colors);

  limb(context, [40, SHOULDER_Y], FRONT_HAND, palette.shirt);
  hand(context, FRONT_HAND, SKIN);

  paintHead(context, palette.cap, portrait);
  context.restore();
}

/** Camiseta por baixo e macacão por cima, com peitilho, alças e dois botões. */
function paintOutfit(context: CanvasRenderingContext2D, shirt: string, colors: OverallsColors): void {
  const { overalls } = colors;

  roundedRect(context, 25, 34, 18, 22, 6);
  fillAndOutline(context, shirt);

  roundedRect(context, 25, 47, 18, 11, 3);
  fillAndOutline(context, overalls);
  roundedRect(context, 28, 40, 12, 9, 2);
  fillAndOutline(context, overalls, 2);

  context.strokeStyle = overalls;
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
    fillAndOutline(context, colors.button, 1);
  }
}

function paintHead(context: CanvasRenderingContext2D, cap: string, portrait: OverallsPortrait): void {
  const centerX = 34;
  const centerY = 21;

  // Cabelo que escapa do boné na nuca.
  context.fillStyle = portrait.colors.hair;
  ellipse(context, centerX - 10, centerY + 1, 6, 8);
  context.fill();

  circle(context, centerX, centerY, 13);
  fillAndOutline(context, SKIN);

  // Orelha, bochecha, olhos, o sorriso e o nariz redondo, olhando para a direita.
  circle(context, centerX - 6, centerY + 3, 3);
  fillAndOutline(context, SKIN, 2);
  context.fillStyle = '#ff9fb2';
  ellipse(context, centerX + 7, centerY + 6.5, 3, 2);
  context.fill();

  eye(context, centerX + 3, centerY, 3.8, 0.3);
  eye(context, centerX + 10, centerY, 3.8, 0.3);
  smile(context, centerX + 8, centerY + 9.5);

  if (portrait.hasMustache) {
    context.fillStyle = portrait.colors.mustache;
    ellipse(context, centerX + 9, centerY + 7, 6.5, 2.6);
    context.fill();
  }

  ellipse(context, centerX + 13, centerY + 4, 3.2, 2.6);
  fillAndOutline(context, NOSE, 2);

  // Boné: copa, aba virada para a frente e o emblema redondo com a letra do herói.
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
  context.fillText(portrait.emblem, centerX - 1, centerY - 8.7);
}

function shoe(context: CanvasRenderingContext2D, at: Point, color: string): void {
  roundedRect(context, at[0] - 5, at[1] - 6, 13, 7, 3.5);
  fillAndOutline(context, color, 2.5);
}
