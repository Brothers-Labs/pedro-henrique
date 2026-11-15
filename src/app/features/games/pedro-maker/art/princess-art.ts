import type { CharacterPalette } from '../config/character.config';
import {
  CORAL_PRINCESS,
  CROWN_GOLD,
  DAISY_PRINCESS,
  ESTRELA_PRINCESS,
  JADE_PRINCESS,
  PEACH_PRINCESS,
  type PrincessColors,
} from '../config/princess.config';
import { circle, darken, ellipse, eye, fillAndOutline, hand, limb, type Point, roundedRect, smile } from './canvas';

const SKIN = '#ffd2a6';
const SKIN_SHADE = '#f0b98c';
const TIGHTS = '#fff4f8';

/** Mesmo quadro dos heróis de macacão: os pés no chão em 70 e a cabeça no alto. */
const BACK_FOOT: Point = [29, 70];
const FRONT_FOOT: Point = [39, 70];
const BACK_HAND: Point = [24, 53];
const FRONT_HAND: Point = [45, 53];
const SHOULDER_Y = 39;
const HEAD: Point = [34, 21];

export interface PrincessPortrait {
  /** Quanto o corpo desce, em pixels, para a princesa mais baixinha; os pés não saem do chão. */
  readonly drop: number;
  readonly colors: PrincessColors;
}

export const ESTRELA_PORTRAIT: PrincessPortrait = { drop: 2, colors: ESTRELA_PRINCESS };
export const JADE_PORTRAIT: PrincessPortrait = { drop: 4, colors: JADE_PRINCESS };
export const CORAL_PORTRAIT: PrincessPortrait = { drop: 0, colors: CORAL_PRINCESS };
export const PEACH_PORTRAIT: PrincessPortrait = { drop: 0, colors: PEACH_PRINCESS };
export const DAISY_PORTRAIT: PrincessPortrait = { drop: 1, colors: DAISY_PRINCESS };

/** Princesa parada e sorrindo: vestido rodado, cabelo comprido e coroa de ouro. */
export function paintPrincessPortrait(context: CanvasRenderingContext2D, palette: CharacterPalette, portrait: PrincessPortrait): void {
  const { colors, drop } = portrait;

  context.lineCap = 'round';
  context.lineJoin = 'round';

  limb(context, [31, 60 + drop], BACK_FOOT, darken(TIGHTS, 0.12));
  shoe(context, BACK_FOOT, colors.shoe);
  limb(context, [37, 60 + drop], FRONT_FOOT, TIGHTS);
  shoe(context, FRONT_FOOT, colors.shoe);

  context.save();
  context.translate(0, drop);

  paintLongHair(context, colors);

  limb(context, [28, SHOULDER_Y], BACK_HAND, SKIN_SHADE);
  hand(context, BACK_HAND, SKIN_SHADE);

  paintDress(context, palette.shirt, colors);

  limb(context, [40, SHOULDER_Y], FRONT_HAND, SKIN);
  hand(context, FRONT_HAND, SKIN);
  circle(context, 40, SHOULDER_Y, 4);
  fillAndOutline(context, palette.shirt, 2);

  paintFace(context, colors.hair);
  paintEarring(context, colors.earring);
  paintCrown(context, colors.gem);
  context.restore();
}

/** O cabelo fica atrás de tudo: o comprido desce até o meio das costas, e o curto para nos ombros. */
function paintLongHair(context: CanvasRenderingContext2D, colors: PrincessColors): void {
  const [x, y] = HEAD;

  roundedRect(context, x - 14, y - 8, 22, colors.shortHair ? 24 : 32, 9);
  fillAndOutline(context, colors.hair);
}

/** Brinco na orelha que aparece, do lado de trás do rosto virado para a direita. */
function paintEarring(context: CanvasRenderingContext2D, earring: string | undefined): void {
  if (!earring) {
    return;
  }

  const [x, y] = HEAD;

  circle(context, x - 6, y + 11, 2.4);
  fillAndOutline(context, earring, 1.2);
}

/** Corpete, faixa na cintura e a saia que abre até quase o chão. */
function paintDress(context: CanvasRenderingContext2D, dress: string, colors: PrincessColors): void {
  roundedRect(context, 26, 34, 16, 15, 5);
  fillAndOutline(context, dress);

  context.beginPath();
  context.moveTo(26, 47);
  context.lineTo(42, 47);
  context.lineTo(48, 64);
  context.lineTo(20, 64);
  context.closePath();
  fillAndOutline(context, dress);

  roundedRect(context, 25, 45.5, 18, 4, 2);
  fillAndOutline(context, colors.trim, 1.5);
  roundedRect(context, 19.5, 61, 29, 4, 2);
  fillAndOutline(context, colors.trim, 1.5);

  circle(context, 34, 38, 1.8);
  fillAndOutline(context, colors.gem, 1);
}

function paintFace(context: CanvasRenderingContext2D, hair: string): void {
  const [x, y] = HEAD;

  circle(context, x, y, 13);
  fillAndOutline(context, SKIN);

  // Bochecha, olhos grandes e o sorriso, olhando para a direita como os outros heróis.
  context.fillStyle = '#ff9fb2';
  ellipse(context, x + 7, y + 6.5, 3, 2);
  context.fill();
  eye(context, x + 3, y + 1, 4.2, 0.3);
  eye(context, x + 10, y + 1, 4.2, 0.3);
  smile(context, x + 7, y + 9.5);

  // Franja por cima da testa.
  context.beginPath();
  context.arc(x, y - 1, 13.5, Math.PI * 1.05, Math.PI * 1.95);
  context.quadraticCurveTo(x + 4, y - 6, x - 13, y - 3);
  context.closePath();
  fillAndOutline(context, hair, 2);
}

/** Coroa de três pontas no alto da cabeça, com a pedra no meio. */
function paintCrown(context: CanvasRenderingContext2D, gem: string): void {
  const [x, y] = HEAD;
  const base = y - 12;

  context.beginPath();
  context.moveTo(x - 8, base);
  context.lineTo(x - 9, base - 9);
  context.lineTo(x - 4, base - 4);
  context.lineTo(x, base - 11);
  context.lineTo(x + 4, base - 4);
  context.lineTo(x + 9, base - 9);
  context.lineTo(x + 8, base);
  context.closePath();
  fillAndOutline(context, CROWN_GOLD, 2);

  circle(context, x, base - 3, 2);
  fillAndOutline(context, gem, 1);
}

function shoe(context: CanvasRenderingContext2D, at: Point, color: string): void {
  roundedRect(context, at[0] - 5, at[1] - 6, 13, 7, 3.5);
  fillAndOutline(context, color, 2.5);
}
