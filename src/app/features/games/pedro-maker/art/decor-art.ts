import type { LevelTheme } from '../models/level.model';
import { circle, darken, ellipse, fillAndOutline, lighten, OUTLINE, roundedRect, shine, star } from './canvas';
import type { ThemePalette } from './palettes';

export const TREE_WIDTH = 96;
export const TREE_HEIGHT = 144;
export const BUSH_WIDTH = 64;
export const BUSH_HEIGHT = 40;
export const FLOWER_SIZE = 32;
export const ROCK_WIDTH = 48;
export const ROCK_HEIGHT = 32;
export const FENCE_WIDTH = 48;
export const FENCE_HEIGHT = 36;
export const SNOWMAN_WIDTH = 48;
export const SNOWMAN_HEIGHT = 80;
export const TOADSTOOL_SIZE = 40;

/**
 * "Árvore" é o enfeite grande de cada tema: árvore no vale, pinheiro na
 * floresta e na neve, cacto no deserto, cristal na caverna, rocha em chamas
 * no vulcão, cogumelo mágico nas estrelas, tocha no castelo, coqueiro na
 * praia e árvore redonda no clássico.
 */
export function paintTree(context: CanvasRenderingContext2D, theme: LevelTheme, palette: ThemePalette): void {
  switch (theme) {
    case 'floresta':
    case 'gelo':
      paintPine(context, palette, theme === 'gelo');
      return;
    case 'deserto':
      paintCactus(context, palette);
      return;
    case 'caverna':
      paintCrystalCluster(context, palette);
      return;
    case 'vulcao':
      paintEmberRock(context, palette);
      return;
    case 'estrelas':
      paintStarMushroom(context, palette);
      return;
    case 'castelo':
      paintTorch(context);
      return;
    case 'vale':
    case 'classico':
      paintRoundTree(context, palette);
      return;
    case 'praia':
      paintPalm(context, palette);
      return;
  }
}

function paintRoundTree(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  roundedRect(context, 40, 80, 16, 64, 5);
  fillAndOutline(context, palette.trunk);

  for (const [x, y, radius] of [[30, 70, 26], [66, 70, 26], [48, 46, 32]] as const) {
    circle(context, x, y, radius);
    fillAndOutline(context, palette.foliage);
  }

  context.fillStyle = lighten(palette.foliage, 0.3);
  circle(context, 38, 38, 9);
  context.fill();
  context.fillStyle = palette.flower;

  for (const [x, y] of [[26, 66], [70, 62], [52, 30]] as const) {
    circle(context, x, y, 3.5);
    context.fill();
  }
}

function paintPine(context: CanvasRenderingContext2D, palette: ThemePalette, hasSnow: boolean): void {
  roundedRect(context, 42, 110, 12, 34, 4);
  fillAndOutline(context, palette.trunk);

  for (const [top, halfWidth, bottom] of [[60, 40, 118], [30, 30, 86], [4, 20, 54]] as const) {
    context.beginPath();
    context.moveTo(48, top);
    context.lineTo(48 + halfWidth, bottom);
    context.lineTo(48 - halfWidth, bottom);
    context.closePath();
    fillAndOutline(context, palette.foliage);

    if (hasSnow) {
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.moveTo(48, top + 2);
      context.lineTo(48 + halfWidth * 0.45, top + (bottom - top) * 0.45);
      context.lineTo(48 - halfWidth * 0.45, top + (bottom - top) * 0.45);
      context.closePath();
      context.fill();
    }
  }
}

function paintPalm(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  // Tronco levemente curvo, feito de gomos, até o topo das folhas.
  for (const [x, y] of [[40, 120], [43, 100], [46, 80], [49, 60]] as const) {
    roundedRect(context, x, y, 14, 22, 4);
    fillAndOutline(context, palette.trunk);
  }

  context.lineCap = 'round';

  for (const [endX, endY] of [[10, 58], [86, 58], [20, 34], [78, 34], [56, 22]] as const) {
    context.beginPath();
    context.moveTo(56, 50);
    context.quadraticCurveTo((56 + endX) / 2, endY - 18, endX, endY);
    context.lineWidth = 14;
    context.strokeStyle = OUTLINE;
    context.stroke();
    context.lineWidth = 9;
    context.strokeStyle = palette.foliage;
    context.stroke();
  }

  for (const [x, y] of [[50, 56], [62, 58]] as const) {
    circle(context, x, y, 6);
    fillAndOutline(context, '#7a4b2a', 2);
  }
}

function paintCactus(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  const green = palette.foliage;

  roundedRect(context, 38, 40, 22, 104, 11);
  fillAndOutline(context, green);
  roundedRect(context, 14, 70, 14, 34, 7);
  fillAndOutline(context, green);
  roundedRect(context, 14, 96, 28, 12, 6);
  fillAndOutline(context, green);
  roundedRect(context, 70, 56, 14, 36, 7);
  fillAndOutline(context, green);
  roundedRect(context, 56, 84, 28, 12, 6);
  fillAndOutline(context, green);
  context.strokeStyle = darken(green, 0.25);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(49, 50);
  context.lineTo(49, 138);
  context.stroke();
  circle(context, 49, 40, 6);
  fillAndOutline(context, palette.flower, 2);
}

function paintCrystalCluster(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  context.save();
  context.globalAlpha = 0.35;
  context.fillStyle = palette.flower;
  ellipse(context, 48, 110, 46, 36);
  context.fill();
  context.restore();

  for (const [x, height, width, color] of [
    [28, 60, 16, palette.foliageDark],
    [68, 70, 16, palette.foliageDark],
    [48, 100, 22, palette.foliage],
  ] as const) {
    context.beginPath();
    context.moveTo(x, 144 - height);
    context.lineTo(x + width / 2, 144 - height + 14);
    context.lineTo(x + width / 2, 142);
    context.lineTo(x - width / 2, 142);
    context.lineTo(x - width / 2, 144 - height + 14);
    context.closePath();
    fillAndOutline(context, color);
    shine(context, x - width / 5, 144 - height + 26, 2.5, 9);
  }
}

function paintEmberRock(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  context.beginPath();
  context.moveTo(18, 144);
  context.lineTo(30, 70);
  context.lineTo(48, 40);
  context.lineTo(66, 76);
  context.lineTo(80, 144);
  context.closePath();
  fillAndOutline(context, palette.stone);
  context.strokeStyle = palette.foliage;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(46, 60);
  context.lineTo(40, 90);
  context.lineTo(50, 112);
  context.lineTo(44, 140);
  context.stroke();
  context.fillStyle = palette.flower;
  circle(context, 48, 34, 5);
  context.fill();
}

function paintStarMushroom(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  roundedRect(context, 38, 70, 20, 74, 8);
  fillAndOutline(context, '#f4f1ff');
  context.beginPath();
  context.moveTo(6, 78);
  context.quadraticCurveTo(48, -6, 90, 78);
  context.closePath();
  fillAndOutline(context, palette.foliage);
  context.fillStyle = palette.flower;

  for (const [x, y, size] of [[30, 52, 7], [60, 44, 8], [48, 66, 5], [74, 64, 5]] as const) {
    star(context, x, y, size, size * 0.45);
    context.fill();
  }
}

function paintTorch(context: CanvasRenderingContext2D): void {
  context.save();
  context.globalAlpha = 0.3;
  context.fillStyle = '#ffd23f';
  circle(context, 48, 60, 36);
  context.fill();
  context.restore();
  roundedRect(context, 42, 70, 12, 74, 4);
  fillAndOutline(context, '#5a3d2a');
  roundedRect(context, 36, 62, 24, 12, 4);
  fillAndOutline(context, '#8a8fa8');
  context.beginPath();
  context.moveTo(48, 26);
  context.quadraticCurveTo(64, 50, 56, 62);
  context.lineTo(40, 62);
  context.quadraticCurveTo(32, 50, 48, 26);
  fillAndOutline(context, '#ff8a3d');
  context.fillStyle = '#ffe066';
  ellipse(context, 48, 52, 5, 9);
  context.fill();
}

export function paintBush(context: CanvasRenderingContext2D, theme: LevelTheme, palette: ThemePalette): void {
  if (theme === 'caverna' || theme === 'estrelas') {
    // Cogumelos luminosos no lugar de arbustos.
    for (const [x, height] of [[18, 26], [40, 34], [54, 20]] as const) {
      roundedRect(context, x - 3, 40 - height, 6, height, 3);
      fillAndOutline(context, '#f4f1ff', 2);
      ellipse(context, x, 40 - height, 11, 7);
      fillAndOutline(context, palette.foliage, 2.5);
    }

    return;
  }

  const color = theme === 'deserto' ? '#9bbf5a' : palette.foliage;

  for (const [x, y, radius] of [[16, 26, 13], [48, 26, 13], [32, 20, 17]] as const) {
    circle(context, x, y, radius);
    fillAndOutline(context, color);
  }

  context.fillStyle = color;
  context.fillRect(10, 28, 44, 11);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(3, 38.5);
  context.lineTo(61, 38.5);
  context.stroke();
  context.fillStyle = lighten(color, 0.3);
  circle(context, 26, 14, 4);
  context.fill();
}

export function paintFlower(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  context.strokeStyle = palette.foliageDark;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(16, 32);
  context.lineTo(16, 16);
  context.stroke();

  context.fillStyle = palette.flower;
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;

  for (let petal = 0; petal < 5; petal += 1) {
    const angle = (petal / 5) * Math.PI * 2;
    circle(context, 16 + Math.cos(angle) * 5.5, 12 + Math.sin(angle) * 5.5, 4.5);
    context.fill();
    context.stroke();
  }

  circle(context, 16, 12, 3.5);
  fillAndOutline(context, '#ffe066', 2);
}

export function paintRock(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  context.beginPath();
  context.moveTo(4, 31);
  context.quadraticCurveTo(2, 12, 18, 8);
  context.quadraticCurveTo(34, 2, 42, 14);
  context.quadraticCurveTo(48, 24, 44, 31);
  context.closePath();
  fillAndOutline(context, palette.stone);
  shine(context, 18, 15, 5, 3);
}

export function paintFence(context: CanvasRenderingContext2D): void {
  const wood = '#d9a066';

  for (const y of [12, 24]) {
    roundedRect(context, 1, y, 46, 6, 2);
    fillAndOutline(context, darken(wood, 0.1), 2);
  }

  for (const x of [6, 30]) {
    context.beginPath();
    context.moveTo(x, 36);
    context.lineTo(x, 6);
    context.lineTo(x + 6, 1);
    context.lineTo(x + 12, 6);
    context.lineTo(x + 12, 36);
    context.closePath();
    fillAndOutline(context, wood, 2.5);
  }
}

export function paintSnowman(context: CanvasRenderingContext2D): void {
  const snow = '#f7fbff';

  circle(context, 24, 60, 19);
  fillAndOutline(context, snow);
  circle(context, 24, 30, 14);
  fillAndOutline(context, snow);
  shine(context, 17, 52, 5, 3);

  context.fillStyle = OUTLINE;

  for (const [x, y] of [[19, 26], [29, 26], [24, 52], [24, 62]] as const) {
    circle(context, x, y, 2);
    context.fill();
  }

  context.beginPath();
  context.moveTo(24, 30);
  context.lineTo(34, 32);
  context.lineTo(24, 34);
  context.closePath();
  fillAndOutline(context, '#ff8a3d', 1.5);

  roundedRect(context, 10, 40, 28, 6, 3);
  fillAndOutline(context, '#e8505b', 2);

  roundedRect(context, 14, 12, 20, 6, 2);
  fillAndOutline(context, '#2a2350', 2);
  roundedRect(context, 17, 0, 14, 13, 2);
  fillAndOutline(context, '#2a2350', 2);
}

export function paintToadstool(context: CanvasRenderingContext2D): void {
  roundedRect(context, 13, 20, 14, 20, 6);
  fillAndOutline(context, '#fff3d6');

  context.beginPath();
  context.moveTo(2, 24);
  context.quadraticCurveTo(20, -8, 38, 24);
  context.closePath();
  fillAndOutline(context, '#e8505b');
  context.fillStyle = '#ffffff';

  for (const [x, y, radius] of [[12, 15, 3.5], [24, 9, 4], [30, 18, 3]] as const) {
    circle(context, x, y, radius);
    context.fill();
  }
}
