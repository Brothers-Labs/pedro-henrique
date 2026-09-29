import type { PowerUpKind } from '../models/level.model';
import { circle, darken, ellipse, fillAndOutline, lighten, OUTLINE, paint, paintStrip, roundedRect, shine, star } from './canvas';

export const COIN_SIZE = 32;
export const COIN_FRAMES = 4;
export const CRYSTAL_WIDTH = 32;
export const CRYSTAL_HEIGHT = 40;
export const HEART_SIZE = 32;
export const POWER_UP_SIZE = 40;
export const CHEST_WIDTH = 72;
export const CHEST_HEIGHT = 60;

const GOLD = '#ffc629';

/** Moeda girando: de frente, em três quartos, de lado e em três quartos. */
export function paintCoinStrip(): HTMLCanvasElement {
  const widths = [1, 0.6, 0.18, 0.6];

  return paintStrip(COIN_SIZE, COIN_SIZE, COIN_FRAMES, (context, frame) => {
    const scale = widths[frame] ?? 1;

    context.save();
    context.translate(16, 16);
    context.scale(scale, 1);
    paintCoinFace(context, scale > 0.5);
    context.restore();
  });
}

export function paintCoinIcon(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(16, 16);
  paintCoinFace(context, true);
  context.restore();
}

function paintCoinFace(context: CanvasRenderingContext2D, showsStar: boolean): void {
  circle(context, 0, 0, 13);
  fillAndOutline(context, GOLD, 3);
  circle(context, 0, 0, 8.5);
  context.strokeStyle = darken(GOLD, 0.25);
  context.lineWidth = 2;
  context.stroke();

  if (showsStar) {
    context.fillStyle = lighten(GOLD, 0.55);
    star(context, 0, 0.5, 6, 2.6);
    context.fill();
  }

  shine(context, -5, -6, 3, 2);
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

/** Baú de recompensa do chefão: fechado e aberto, com brilho saindo. */
export function paintChestStrip(): HTMLCanvasElement {
  return paintStrip(CHEST_WIDTH, CHEST_HEIGHT, 2, (context, frame) => {
    const wood = '#b86b35';
    const isOpen = frame === 1;

    if (isOpen) {
      context.fillStyle = 'rgba(255, 230, 120, 0.8)';
      ellipse(context, 36, 26, 26, 14);
      context.fill();
    }

    roundedRect(context, 8, 28, 56, 28, 5);
    fillAndOutline(context, wood, 3);

    if (isOpen) {
      roundedRect(context, 10, 6, 52, 16, 6);
    } else {
      roundedRect(context, 8, 14, 56, 18, 8);
    }

    fillAndOutline(context, lighten(wood, 0.15), 3);

    context.fillStyle = GOLD;
    context.strokeStyle = OUTLINE;
    context.lineWidth = 2;
    roundedRect(context, 30, isOpen ? 28 : 26, 12, 12, 3);
    context.fill();
    context.stroke();

    for (const bandX of [16, 52]) {
      context.fillStyle = darken(GOLD, 0.1);
      context.fillRect(bandX, 28, 4, 28);
    }
  });
}

/** Faísca redonda, estrela e losango: as três formas de partícula do jogo. */
export function paintParticleDot(): HTMLCanvasElement {
  return paint(12, 12, (context) => {
    context.fillStyle = '#ffffff';
    circle(context, 6, 6, 5);
    context.fill();
  });
}

export function paintParticleStar(): HTMLCanvasElement {
  return paint(18, 18, (context) => {
    context.fillStyle = '#ffffff';
    star(context, 9, 9.5, 8.5, 3.6);
    context.fill();
  });
}

export function paintParticleSpark(): HTMLCanvasElement {
  return paint(12, 16, (context) => {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(6, 0);
    context.lineTo(12, 8);
    context.lineTo(6, 16);
    context.lineTo(0, 8);
    context.closePath();
    context.fill();
  });
}
