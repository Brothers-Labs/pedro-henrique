import type { PowerUpKind } from '../models/level.model';
import { circle, darken, fillAndOutline, lighten, OUTLINE, roundedRect, shine, star } from './canvas';

export const COIN_SIZE = 32;
export const BIG_COIN_SIZE = 40;
export const HUGE_COIN_SIZE = 48;
export const CRYSTAL_WIDTH = 32;
export const CRYSTAL_HEIGHT = 40;
export const HEART_SIZE = 32;
export const POWER_UP_SIZE = 40;

const GOLD = '#ffc629';

/** Moeda de frente, com a estrela no centro. */
export function paintCoinIcon(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(16, 16);
  circle(context, 0, 0, 13);
  fillAndOutline(context, GOLD, 3);
  circle(context, 0, 0, 8.5);
  context.strokeStyle = darken(GOLD, 0.25);
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = lighten(GOLD, 0.55);
  star(context, 0, 0.5, 6, 2.6);
  context.fill();
  shine(context, -5, -6, 3, 2);
  context.restore();
}

/** Moeda gigante: maior, com o "10" no meio no lugar da estrela. */
export function paintBigCoin(context: CanvasRenderingContext2D): void {
  paintNumberedCoin(context, BIG_COIN_SIZE, '10');
}

/** A maior de todas, com o "50". */
export function paintHugeCoin(context: CanvasRenderingContext2D): void {
  paintNumberedCoin(context, HUGE_COIN_SIZE, '50');
}

/** Moeda de frente com o valor escrito no meio, desenhada num quadrado de lado `size`. */
export function paintNumberedCoin(context: CanvasRenderingContext2D, size: number, value: string): void {
  const center = size / 2;

  circle(context, center, center, size * 0.45);
  fillAndOutline(context, GOLD, size * 0.075);
  circle(context, center, center, size * 0.325);
  context.strokeStyle = darken(GOLD, 0.25);
  context.lineWidth = size * 0.05;
  context.stroke();
  context.fillStyle = darken(GOLD, 0.45);
  context.font = `bold ${Math.round(size * Math.min(0.35, 0.95 / value.length))}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(value, center, center + size * 0.025);
  shine(context, size * 0.3, size * 0.275, size * 0.1, size * 0.0625);
}

export function paintCrystal(context: CanvasRenderingContext2D): void {
  const color = '#4fd8ff';

  context.beginPath();
  context.moveTo(16, 2);
  context.lineTo(29, 14);
  context.lineTo(16, 38);
  context.lineTo(3, 14);
  context.closePath();
  fillAndOutline(context, color, 3);

  // Faces lapidadas.
  context.fillStyle = lighten(color, 0.45);
  context.beginPath();
  context.moveTo(16, 4);
  context.lineTo(22, 14);
  context.lineTo(16, 34);
  context.lineTo(10, 14);
  context.closePath();
  context.fill();

  context.strokeStyle = darken(color, 0.3);
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(3, 14);
  context.lineTo(29, 14);
  context.stroke();

  shine(context, 12, 9, 2.5, 3.5);
}

export function paintHeart(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(16, 28);
  context.bezierCurveTo(-4, 14, 6, -2, 16, 9);
  context.bezierCurveTo(26, -2, 36, 14, 16, 28);
  context.closePath();
  fillAndOutline(context, '#ff4f6d', 3);
  shine(context, 10, 11, 3, 2.5);
}

const POWER_UP_COLORS: Readonly<Record<PowerUpKind, string>> = {
  'super-jump': '#5fdc6a',
  shield: '#5cb8ff',
  turbo: '#ffd23f',
  magnet: '#ff6a6a',
  wings: '#f4f1ff',
  mushroom: '#e8343a',
  'fire-flower': '#ff7a1f',
  'ice-flower': '#5cc8ff',
  star: '#ffd23f',
  'one-up': '#2fb84a',
  'cat-mushroom': '#ff9f1a',
  'leaf-mushroom': '#7cc242',
  'raccoon-leaf': '#e8892b',
  'giga-mushroom': '#d6336c',
  'turbo-mushroom': '#1fa2ff',
  'swap-mushroom': '#9b5de5',
  'magnet-mushroom': '#e63946',
  'tall-mushroom': '#9d4edd',
};

/** Ícone de power-up dentro de uma bolha, para ser lido de longe. */
export function paintPowerUp(context: CanvasRenderingContext2D, kind: PowerUpKind): void {
  const color = POWER_UP_COLORS[kind];

  circle(context, 20, 20, 17);
  fillAndOutline(context, lighten(color, 0.55), 3);

  switch (kind) {
    case 'super-jump':
      paintSpringBoot(context, color);
      break;
    case 'shield':
      paintShieldIcon(context, color);
      break;
    case 'turbo':
      paintBolt(context, color);
      break;
    case 'magnet':
      paintMagnet(context, color);
      break;
    case 'wings':
      paintWing(context, color);
      break;
    case 'mushroom':
    case 'one-up':
      paintMushroom(context, color);
      break;
    case 'fire-flower':
      paintFlower(context, color, '#ffd23f');
      break;
    case 'ice-flower':
      paintFlower(context, color, '#e6f6ff');
      break;
    case 'star':
      paintPowerStar(context, color);
      break;
    case 'cat-mushroom':
      paintCatEars(context, color);
      paintMushroom(context, color);
      break;
    case 'leaf-mushroom':
      paintMushroom(context, color);
      paintLeaf(context);
      break;
    case 'raccoon-leaf':
      paintRaccoonLeaf(context, color);
      break;
    case 'giga-mushroom':
      paintGigaMushroom(context, color);
      break;
    case 'turbo-mushroom':
      paintTurboMushroom(context, color);
      break;
    case 'swap-mushroom':
      paintSwapMushroom(context, color);
      break;
    case 'magnet-mushroom':
      paintMagnetMushroom(context, color);
      break;
    case 'tall-mushroom':
      paintTallMushroom(context, color);
      break;
  }

  shine(context, 12, 11, 4, 2.5);
}

function paintSpringBoot(context: CanvasRenderingContext2D, color: string): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;
  context.beginPath();

  for (let coil = 0; coil < 4; coil += 1) {
    context.moveTo(13, 26 + coil * 2 - 6);
    context.lineTo(27, 24 + coil * 2 - 6);
  }

  context.stroke();
  roundedRect(context, 11, 8, 18, 10, 4);
  fillAndOutline(context, color, 2.5);
  roundedRect(context, 11, 27, 18, 5, 2);
  fillAndOutline(context, darken(color, 0.2), 2.5);
}

function paintShieldIcon(context: CanvasRenderingContext2D, color: string): void {
  context.beginPath();
  context.moveTo(20, 7);
  context.lineTo(31, 11);
  context.quadraticCurveTo(31, 26, 20, 33);
  context.quadraticCurveTo(9, 26, 9, 11);
  context.closePath();
  fillAndOutline(context, color, 2.5);
  context.fillStyle = '#ffffff';
  star(context, 20, 19, 5, 2.2);
  context.fill();
}

function paintBolt(context: CanvasRenderingContext2D, color: string): void {
  context.beginPath();
  context.moveTo(23, 5);
  context.lineTo(11, 22);
  context.lineTo(19, 22);
  context.lineTo(16, 35);
  context.lineTo(29, 16);
  context.lineTo(21, 16);
  context.closePath();
  fillAndOutline(context, color, 2.5);
}

function paintMagnet(context: CanvasRenderingContext2D, color: string): void {
  context.lineCap = 'butt';
  context.beginPath();
  context.arc(20, 18, 9, Math.PI, 0);
  context.lineTo(29, 29);
  context.moveTo(11, 18);
  context.lineTo(11, 29);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 9;
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = '#e8eef7';
  context.fillRect(8.5, 26, 5, 5);
  context.fillRect(26.5, 26, 5, 5);
}

/** Cogumelo de chapéu pintado e carinha no pé: vermelho cresce, verde dá vida. */
function paintMushroom(context: CanvasRenderingContext2D, color: string): void {
  roundedRect(context, 14, 19, 12, 13, 4);
  fillAndOutline(context, '#fff1d6', 2.5);
  context.fillStyle = OUTLINE;
  context.fillRect(17, 23, 2, 4);
  context.fillRect(21, 23, 2, 4);

  context.beginPath();
  context.moveTo(7, 21);
  context.quadraticCurveTo(7, 6, 20, 6);
  context.quadraticCurveTo(33, 6, 33, 21);
  context.closePath();
  fillAndOutline(context, color, 2.5);

  context.fillStyle = '#ffffff';

  for (const [x, y, radius] of [[20, 11, 3.5], [12, 16, 2.5], [28, 16, 2.5]] as const) {
    circle(context, x, y, radius);
    context.fill();
  }
}

/** Orelhas pontudas de gato, desenhadas antes do chapéu para saírem de trás dele. */
function paintCatEars(context: CanvasRenderingContext2D, color: string): void {
  for (const side of [-1, 1] as const) {
    context.beginPath();
    context.moveTo(20 + side * 13, 15);
    context.lineTo(20 + side * 12, 2);
    context.lineTo(20 + side * 4, 8);
    context.closePath();
    fillAndOutline(context, color, 2.5);

    context.fillStyle = '#ffb3cf';
    context.beginPath();
    context.moveTo(20 + side * 11, 11);
    context.lineTo(20 + side * 11, 5);
    context.lineTo(20 + side * 7, 8);
    context.closePath();
    context.fill();
  }
}

/** Folha verde com nervura, pousada de lado no chapéu do cogumelo. */
function paintLeaf(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(18, 7);
  context.quadraticCurveTo(24, -2, 33, 2);
  context.quadraticCurveTo(29, 11, 18, 7);
  context.closePath();
  fillAndOutline(context, '#2f9e44', 2);

  context.strokeStyle = '#b2f2bb';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(19, 7);
  context.lineTo(31, 3);
  context.stroke();
}

/** Folha de outono grande, com nervuras e a ponta do rabo listrado de guaxinim saindo de trás. */
function paintRaccoonLeaf(context: CanvasRenderingContext2D, color: string): void {
  for (const [x, stripe] of [[25, '#8a7f72'], [29, '#3d3530'], [33, '#8a7f72']] as const) {
    circle(context, x, 29, 3.5);
    fillAndOutline(context, stripe, 2);
  }

  context.beginPath();
  context.moveTo(20, 33);
  context.quadraticCurveTo(5, 24, 11, 9);
  context.quadraticCurveTo(20, 4, 29, 9);
  context.quadraticCurveTo(35, 24, 20, 33);
  context.closePath();
  fillAndOutline(context, color, 2.5);

  context.strokeStyle = darken(color, 0.35);
  context.lineWidth = 1.8;
  context.beginPath();
  context.moveTo(20, 31);
  context.lineTo(20, 9);

  for (const side of [-1, 1] as const) {
    context.moveTo(20, 24);
    context.lineTo(20 + side * 7, 17);
    context.moveTo(20, 17);
    context.lineTo(20 + side * 5, 12);
  }

  context.stroke();
}

/** Cogumelo tão grande que não cabe na bolha, com setas para cima: é ele que deixa gigante. */
function paintGigaMushroom(context: CanvasRenderingContext2D, color: string): void {
  context.save();
  context.translate(20, 22);
  context.scale(1.2, 1.2);
  context.translate(-20, -20);
  paintMushroom(context, color);
  context.restore();

  for (const x of [5, 35] as const) {
    context.beginPath();
    context.moveTo(x, 4);
    context.lineTo(x + 4, 10);
    context.lineTo(x - 4, 10);
    context.closePath();
    fillAndOutline(context, '#ffffff', 1.5);
  }
}

/** Cogumelo vermelho com um ímã de ferradura no chapéu e moedinhas voando para ele. */
function paintMagnetMushroom(context: CanvasRenderingContext2D, color: string): void {
  paintMushroom(context, color);

  context.lineCap = 'butt';
  context.beginPath();
  context.arc(20, 12, 5, Math.PI, 0);
  context.lineTo(25, 17);
  context.moveTo(15, 12);
  context.lineTo(15, 17);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 5.5;
  context.stroke();
  context.strokeStyle = '#3f8cff';
  context.lineWidth = 3;
  context.stroke();

  for (const [x, y] of [[5, 9], [35, 9]] as const) {
    circle(context, x, y, 3);
    fillAndOutline(context, '#ffd23f', 1.5);
  }
}

/** Cogumelo de pé comprido e chapéu pequeno, com uma régua ao lado: é o que deixa alto. */
function paintTallMushroom(context: CanvasRenderingContext2D, color: string): void {
  roundedRect(context, 16, 14, 8, 21, 3);
  fillAndOutline(context, '#fff1d6', 2.5);
  context.fillStyle = OUTLINE;
  context.fillRect(18, 20, 1.5, 3.5);
  context.fillRect(20.5, 20, 1.5, 3.5);

  context.beginPath();
  context.moveTo(10, 15);
  context.quadraticCurveTo(10, 4, 20, 4);
  context.quadraticCurveTo(30, 4, 30, 15);
  context.closePath();
  fillAndOutline(context, color, 2.5);
  context.fillStyle = '#ffffff';
  circle(context, 20, 9, 2.5);
  context.fill();

  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(33, 6);
  context.lineTo(33, 34);

  for (const y of [10, 16, 22, 28] as const) {
    context.moveTo(33, y);
    context.lineTo(36, y);
  }

  context.stroke();
}

/** Cogumelo azul com riscos de velocidade atrás e um raio no chapéu: é o que deixa ligeiro. */
function paintTurboMushroom(context: CanvasRenderingContext2D, color: string): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;
  context.lineCap = 'round';
  context.beginPath();

  for (const [y, length] of [[12, 6], [19, 8], [26, 6]] as const) {
    context.moveTo(2, y);
    context.lineTo(2 + length, y);
  }

  context.stroke();
  paintMushroom(context, color);

  context.beginPath();
  context.moveTo(22, 7);
  context.lineTo(16, 15);
  context.lineTo(20, 15);
  context.lineTo(18, 21);
  context.lineTo(25, 12);
  context.lineTo(21, 12);
  context.closePath();
  fillAndOutline(context, '#ffd23f', 1.5);
}

/** Cogumelo roxo com duas setas girando em volta: o herói vira outro da turma. */
function paintSwapMushroom(context: CanvasRenderingContext2D, color: string): void {
  paintMushroom(context, color);

  context.strokeStyle = '#ffd23f';
  context.lineWidth = 2.5;
  context.lineCap = 'round';

  for (const [startAngle, tipX, tipY, direction] of [
    [Math.PI * 1.1, 32, 8, 1],
    [Math.PI * 0.1, 8, 32, -1],
  ] as const) {
    context.beginPath();
    context.arc(20, 20, 15, startAngle, startAngle + Math.PI * 0.6);
    context.stroke();

    context.beginPath();
    context.moveTo(tipX - 4 * direction, tipY);
    context.lineTo(tipX, tipY);
    context.lineTo(tipX, tipY + 4 * direction);
    context.stroke();
  }
}

/** Flor de fogo ou de gelo: pétalas em anéis sobre um caule com folhas. */
function paintFlower(context: CanvasRenderingContext2D, color: string, ring: string): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(20, 20);
  context.lineTo(20, 33);
  context.stroke();
  context.strokeStyle = '#2fb84a';
  context.lineWidth = 2.5;
  context.stroke();

  for (const side of [-1, 1] as const) {
    context.beginPath();
    context.ellipse(20 + side * 5, 29, 5, 2.5, side * -0.4, 0, Math.PI * 2);
    fillAndOutline(context, '#2fb84a', 2);
  }

  circle(context, 20, 15, 10);
  fillAndOutline(context, color, 2.5);
  circle(context, 20, 15, 6.5);
  context.fillStyle = ring;
  context.fill();
  circle(context, 20, 15, 3.5);
  context.fillStyle = '#ffffff';
  context.fill();
}

/** Estrela de cinco pontas com olhinhos: a invencibilidade. */
function paintPowerStar(context: CanvasRenderingContext2D, color: string): void {
  star(context, 20, 21, 15, 7);
  fillAndOutline(context, color, 2.5);
  context.fillStyle = OUTLINE;
  context.fillRect(16, 17, 2.5, 5);
  context.fillRect(21.5, 17, 2.5, 5);
}

function paintWing(context: CanvasRenderingContext2D, color: string): void {
  context.beginPath();
  context.moveTo(10, 28);
  context.quadraticCurveTo(8, 8, 31, 8);
  context.quadraticCurveTo(28, 14, 30, 16);
  context.quadraticCurveTo(25, 19, 28, 22);
  context.quadraticCurveTo(21, 25, 22, 29);
  context.closePath();
  fillAndOutline(context, color, 2.5);
  context.strokeStyle = darken(color, 0.2);
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(13, 24);
  context.quadraticCurveTo(15, 14, 26, 11);
  context.stroke();
}
