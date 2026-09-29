import type { CharacterPalette } from '../config/character.config';
import { circle, ellipse, eye, fillAndOutline, lighten, OUTLINE, paintStrip, roundedRect, star } from './canvas';

/** Quadro do Pedro: largo o bastante para braços e pernas em movimento. */
export const PEDRO_FRAME_WIDTH = 64;
export const PEDRO_FRAME_HEIGHT = 72;

/** Linha dos pés dentro do quadro; a caixa de colisão se alinha a ela. */
export const PEDRO_FEET_Y = 70;

/** Índice de cada pose na tira de quadros. */
export const PEDRO_FRAMES = {
  idle: [0, 1],
  run: [2, 3, 4, 5],
  jump: 6,
  fall: 7,
  hit: 8,
  win: 9,
} as const;

const FRAME_COUNT = 10;

const SKIN = '#ffd2a6';
/** Pele do lado de trás, um tom abaixo, para dar profundidade aos membros. */
const SKIN_SHADE = '#f0b98c';
const HAIR = '#5a3a22';
const SHORTS = '#3d5fb0';
const SNEAKER = '#ffffff';
const SOLE = '#2a2350';

type Point = readonly [number, number];
type Eyes = 'open' | 'happy' | 'squeeze';
type Mouth = 'smile' | 'open' | 'o';

interface Pose {
  readonly bob: number;
  readonly backFoot: Point;
  readonly frontFoot: Point;
  readonly backHand: Point;
  readonly frontHand: Point;
  readonly eyes: Eyes;
  readonly mouth: Mouth;
}

const RUN_FEET: readonly (readonly [Point, Point])[] = [
  [[24, 68], [44, 69]],
  [[32, 64], [36, 70]],
  [[44, 69], [24, 68]],
  [[36, 70], [32, 64]],
];

const RUN_HANDS: readonly (readonly [Point, Point])[] = [
  [[44, 50], [22, 52]],
  [[36, 54], [32, 54]],
  [[22, 52], [46, 50]],
  [[32, 54], [36, 54]],
];

function poseFor(frame: number): Pose {
  const standing = { backFoot: [28, 70], frontFoot: [40, 70], backHand: [24, 55], frontHand: [45, 55] } as const;

  if (frame <= 1) {
    return { ...standing, bob: frame, eyes: 'open', mouth: 'smile' };
  }

  if (frame <= 5) {
    const step = frame - 2;
    const [backFoot, frontFoot] = RUN_FEET[step];
    const [backHand, frontHand] = RUN_HANDS[step];

    return { bob: step % 2 === 1 ? -2 : 0, backFoot, frontFoot, backHand, frontHand, eyes: 'open', mouth: 'smile' };
  }

  switch (frame) {
    case PEDRO_FRAMES.jump:
      return { bob: -1, backFoot: [26, 62], frontFoot: [44, 65], backHand: [22, 33], frontHand: [50, 31], eyes: 'open', mouth: 'open' };
    case PEDRO_FRAMES.fall:
      return { bob: 0, backFoot: [26, 70], frontFoot: [42, 67], backHand: [15, 41], frontHand: [53, 41], eyes: 'open', mouth: 'o' };
    case PEDRO_FRAMES.hit:
      return { bob: -1, backFoot: [30, 70], frontFoot: [38, 70], backHand: [19, 46], frontHand: [49, 46], eyes: 'squeeze', mouth: 'o' };
    default:
      return { bob: -1, backFoot: [30, 70], frontFoot: [38, 70], backHand: [22, 24], frontHand: [48, 22], eyes: 'happy', mouth: 'open' };
  }
}

/** Todos os quadros do Pedro com as cores escolhidas em "Meu personagem". */
export function paintPedroStrip(palette: CharacterPalette): HTMLCanvasElement {
  return paintStrip(PEDRO_FRAME_WIDTH, PEDRO_FRAME_HEIGHT, FRAME_COUNT, (context, frame) =>
    paintPedro(context, palette, poseFor(frame)),
  );
}

/** Um quadro só, parado e sorrindo — para vitrines fora do jogo. */
export function paintPedroPortrait(context: CanvasRenderingContext2D, palette: CharacterPalette): void {
  paintPedro(context, palette, poseFor(0));
}

function paintPedro(context: CanvasRenderingContext2D, palette: CharacterPalette, pose: Pose): void {
  const lift = pose.bob;
  const shoulderY = 43 + lift;
  const hipY = 58 + lift;

  context.lineCap = 'round';
  context.lineJoin = 'round';

  paintBackpack(context, palette, lift);

  limb(context, [27, shoulderY], pose.backHand, SKIN_SHADE);
  hand(context, pose.backHand, SKIN_SHADE);

  limb(context, [29, hipY], pose.backFoot, SKIN_SHADE);
  sneaker(context, pose.backFoot);
  limb(context, [39, hipY], pose.frontFoot, SKIN);
  sneaker(context, pose.frontFoot);

  // Bermuda e camiseta.
  roundedRect(context, 23, 53 + lift, 22, 8, 3);
  fillAndOutline(context, SHORTS);
  roundedRect(context, 23, 37 + lift, 22, 19, 7);
  fillAndOutline(context, palette.shirt);
  context.fillStyle = lighten(palette.shirt, 0.35);
  roundedRect(context, 26, 40 + lift, 5, 10, 2.5);
  context.fill();

  limb(context, [41, shoulderY], pose.frontHand, SKIN);
  hand(context, pose.frontHand, SKIN);

  paintHead(context, palette, lift, pose);
}

function paintHead(context: CanvasRenderingContext2D, palette: CharacterPalette, lift: number, pose: Pose): void {
  const centerX = 34;
  const centerY = 24 + lift;

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

  paintEyes(context, centerX, centerY, pose.eyes);
  paintMouth(context, centerX + 8, centerY + 9, pose.mouth);

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

function paintEyes(context: CanvasRenderingContext2D, x: number, y: number, eyes: Eyes): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;

  if (eyes === 'open') {
    eye(context, x + 3, y + 1, 4.2, 0.3);
    eye(context, x + 11, y + 1, 4.2, 0.3);
    return;
  }

  for (const eyeX of [x + 3, x + 11]) {
    context.beginPath();

    if (eyes === 'happy') {
      context.arc(eyeX, y + 3, 3.5, Math.PI * 1.1, Math.PI * 1.9);
    } else {
      context.moveTo(eyeX - 3, y - 2);
      context.lineTo(eyeX + 2, y + 1);
      context.lineTo(eyeX - 3, y + 4);
    }

    context.stroke();
  }
}

function paintMouth(context: CanvasRenderingContext2D, x: number, y: number, mouth: Mouth): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;

  if (mouth === 'smile') {
    context.beginPath();
    context.arc(x, y - 3, 4, Math.PI * 0.2, Math.PI * 0.8);
    context.stroke();
    return;
  }

  context.fillStyle = '#c2344f';

  if (mouth === 'o') {
    ellipse(context, x, y, 2.4, 3);
  } else {
    context.beginPath();
    context.arc(x, y - 2, 4.5, 0, Math.PI);
    context.closePath();
  }

  context.fill();
  context.stroke();
}

function paintBackpack(context: CanvasRenderingContext2D, palette: CharacterPalette, lift: number): void {
  const top = 38 + lift;

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
