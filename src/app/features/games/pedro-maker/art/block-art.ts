import { TILE_SIZE } from '../config/physics.config';
import type { TerrainType } from '../models/level.model';
import {
  circle,
  darken,
  ellipse,
  fillAndOutline,
  lighten,
  OUTLINE,
  roundedRect,
  shine,
  star,
  textureNoise,
} from './canvas';
import type { ThemePalette } from './palettes';

/** Semente das manchas da terra: o ícone sai sempre igual. */
const SOIL_NOISE_SEED = 304;

/** Bloco de terreno solto, com o topo e os dois lados à mostra, como no editor. */
export function paintTerrainTile(context: CanvasRenderingContext2D, material: TerrainType, palette: ThemePalette): void {
  switch (material) {
    case 'ground':
      paintSoil(context, palette);
      break;
    case 'stone':
      paintStone(context, palette);
      break;
    case 'ice':
      paintIce(context);
      break;
  }

  paintTopLayer(context, material, palette);
  paintEdges(context);
}

function paintSoil(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  context.fillStyle = palette.soil;
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  const random = textureNoise(SOIL_NOISE_SEED);
  context.fillStyle = palette.soilDark;

  for (let speck = 0; speck < 7; speck += 1) {
    ellipse(context, 4 + random() * 40, 16 + random() * 28, 2.5 + random() * 2.5, 1.8 + random() * 1.5);
    context.fill();
  }

  context.fillStyle = lighten(palette.soil, 0.18);

  for (let speck = 0; speck < 3; speck += 1) {
    circle(context, 6 + random() * 36, 18 + random() * 26, 1.3);
    context.fill();
  }
}

function paintStone(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  context.fillStyle = palette.stone;
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.strokeStyle = darken(palette.stone, 0.28);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, 24);
  context.lineTo(48, 24);
  context.moveTo(24, 0);
  context.lineTo(24, 24);
  context.moveTo(10, 24);
  context.lineTo(10, 48);
  context.moveTo(36, 24);
  context.lineTo(36, 48);
  context.stroke();
  context.fillStyle = lighten(palette.stone, 0.25);
  context.fillRect(3, 3, 18, 3);
  context.fillRect(27, 3, 18, 3);
  context.fillRect(13, 27, 20, 3);
}

function paintIce(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#bfe9ff';
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(8, 40);
  context.lineTo(22, 26);
  context.moveTo(26, 42);
  context.lineTo(40, 28);
  context.stroke();
  context.fillStyle = '#8fd0f5';
  context.fillRect(0, 40, TILE_SIZE, 8);
}

/** Grama, areia, neve ou musgo: a camada de cima muda com o tema. */
function paintTopLayer(context: CanvasRenderingContext2D, material: TerrainType, palette: ThemePalette): void {
  if (material === 'stone') {
    return;
  }

  const color = material === 'ice' ? '#ffffff' : palette.surface;
  const highlight = material === 'ice' ? '#ffffff' : palette.surfaceLight;

  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(TILE_SIZE, 0);
  context.lineTo(TILE_SIZE, 12);

  // Borda de baixo em ondinhas, como grama pendendo.
  for (let bump = 4; bump >= 0; bump -= 1) {
    const x = bump * 12;
    context.quadraticCurveTo(x + 6, 19, x, 12);
  }

  context.closePath();
  context.fill();

  context.fillStyle = highlight;
  context.fillRect(0, 3, TILE_SIZE, 3);
}

function paintEdges(context: CanvasRenderingContext2D): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, 1.5);
  context.lineTo(TILE_SIZE, 1.5);
  context.moveTo(1.5, 0);
  context.lineTo(1.5, TILE_SIZE);
  context.moveTo(TILE_SIZE - 1.5, 0);
  context.lineTo(TILE_SIZE - 1.5, TILE_SIZE);
  context.stroke();
}

/** Plataforma de mão única: só a tábua de cima, o resto do bloco é vazio. */
export function paintPlatformTile(context: CanvasRenderingContext2D, palette: ThemePalette): void {
  const wood = palette.isDark ? palette.stone : '#c98a4b';

  context.fillStyle = darken(wood, 0.3);
  context.fillRect(10, 14, 5, 12);
  context.fillRect(33, 14, 5, 12);

  context.fillStyle = wood;
  context.fillRect(0, 2, TILE_SIZE, 13);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 3;
  context.strokeRect(0, 1.5, TILE_SIZE, 13);
  context.fillStyle = lighten(wood, 0.3);
  context.fillRect(2, 4, TILE_SIZE - 4, 3);
}

/* Blocos com comportamento --------------------------------------------------- */

export function paintBrick(context: CanvasRenderingContext2D): void {
  const color = '#d9793e';

  context.fillStyle = color;
  context.fillRect(0, 0, 48, 48);
  context.strokeStyle = darken(color, 0.35);
  context.lineWidth = 2.5;
  context.beginPath();

  for (const y of [16, 32]) {
    context.moveTo(0, y);
    context.lineTo(48, y);
  }

  for (const [x, y] of [[24, 0], [12, 16], [36, 16], [24, 32]] as const) {
    context.moveTo(x, y);
    context.lineTo(x, y + 16);
  }

  context.stroke();
  context.fillStyle = lighten(color, 0.3);
  context.fillRect(3, 3, 18, 3);
  context.fillRect(27, 3, 18, 3);
  roundedRect(context, 1.5, 1.5, 45, 45, 4);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 3;
  context.stroke();
}

/** Bloco surpresa: dourado, com o "?" de quem ainda guarda algo. */
export function paintSurprise(context: CanvasRenderingContext2D): void {
  const color = '#ffc629';

  roundedRect(context, 1.5, 1.5, 45, 45, 6);
  fillAndOutline(context, color, 3);
  context.fillStyle = darken(color, 0.3);

  for (const [x, y] of [[8, 8], [40, 8], [8, 40], [40, 40]] as const) {
    circle(context, x, y, 2.2);
    context.fill();
  }

  context.font = 'bold 30px "Baloo 2", "Trebuchet MS", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 5;
  context.strokeStyle = OUTLINE;
  context.strokeText('?', 24, 26);
  context.fillStyle = '#ffffff';
  context.fillText('?', 24, 26);
}

/** Mola esticada, pronta para lançar. */
export function paintSpring(context: CanvasRenderingContext2D): void {
  const top = 10;

  context.strokeStyle = OUTLINE;
  context.lineWidth = 5;
  context.beginPath();

  const coils = 4;

  for (let coil = 0; coil <= coils; coil += 1) {
    const y = 42 - ((42 - top - 6) * coil) / coils;
    context.lineTo(coil % 2 === 0 ? 12 : 36, y);
  }

  context.stroke();
  context.strokeStyle = '#9aa3b5';
  context.lineWidth = 2.5;
  context.stroke();

  roundedRect(context, 6, top, 36, 9, 4);
  fillAndOutline(context, '#ff5a8a', 3);
  roundedRect(context, 8, 40, 32, 7, 3);
  fillAndOutline(context, '#4b4470', 3);
}

/** Escorregador de parquinho: escada à esquerda e a rampa vermelha descendo para a direita. */
export function paintSlide(context: CanvasRenderingContext2D): void {
  context.lineCap = 'round';

  for (const [color, width] of [[OUTLINE, 6], ['#3fa3f5', 3]] as const) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();

    for (const x of [6, 15]) {
      context.moveTo(x, 13);
      context.lineTo(x, 45);
    }

    for (let y = 20; y <= 40; y += 7) {
      context.moveTo(6, y);
      context.lineTo(15, y);
    }

    context.stroke();
  }

  context.beginPath();
  context.moveTo(3, 9);
  context.lineTo(17, 9);
  context.lineTo(46, 38);
  context.lineTo(46, 45);
  context.lineTo(39, 45);
  context.lineTo(14, 16);
  context.lineTo(3, 16);
  context.closePath();
  fillAndOutline(context, '#ff5a5a', 3);

  context.strokeStyle = '#ffd23f';
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(5, 12);
  context.lineTo(16, 12);
  context.lineTo(44, 40);
  context.stroke();
}

export function paintCrumble(context: CanvasRenderingContext2D): void {
  const color = '#e3c28a';

  roundedRect(context, 1.5, 1.5, 45, 20, 4);
  fillAndOutline(context, color, 3);
  context.strokeStyle = darken(color, 0.35);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(14, 3);
  context.lineTo(18, 11);
  context.lineTo(14, 20);
  context.moveTo(32, 3);
  context.lineTo(29, 12);
  context.lineTo(34, 20);
  context.stroke();
}

export const MOVING_PLATFORM_WIDTH = 96;
export const MOVING_PLATFORM_HEIGHT = 24;

export function paintMovingPlatform(context: CanvasRenderingContext2D): void {
  roundedRect(context, 1.5, 1.5, 93, 21, 8);
  fillAndOutline(context, '#7b88a8', 3);
  context.fillStyle = '#ffd23f';

  for (let stripe = 0; stripe < 6; stripe += 1) {
    context.beginPath();
    context.moveTo(10 + stripe * 14, 4);
    context.lineTo(17 + stripe * 14, 4);
    context.lineTo(12 + stripe * 14, 20);
    context.lineTo(5 + stripe * 14, 20);
    context.closePath();
    context.fill();
  }

  context.fillStyle = '#ffffff';
  circle(context, 8, 12, 2);
  context.fill();
  circle(context, 88, 12, 2);
  context.fill();
}

/** Lava ondulando, com bolhas claras. */
/** Tijolo com uma moedinha no canto: o bloco de moedas, sem entregar demais o segredo. */
export function paintMultiCoinBlock(context: CanvasRenderingContext2D): void {
  paintBrick(context);
  circle(context, 38, 10, 7);
  fillAndOutline(context, '#ffc629', 2);
  context.fillStyle = '#fff3a8';
  circle(context, 36, 8, 2);
  context.fill();
}

/** Fileira de espinhos prateados sobre uma base escura. */
export function paintSpikes(context: CanvasRenderingContext2D): void {
  roundedRect(context, 2, 34, 44, 12, 3);
  fillAndOutline(context, '#4b4470');

  for (let spike = 0; spike < 3; spike += 1) {
    const x = 8 + spike * 16;

    context.beginPath();
    context.moveTo(x - 7, 35);
    context.lineTo(x, 6);
    context.lineTo(x + 7, 35);
    context.closePath();
    fillAndOutline(context, '#d6dbe8', 2.5);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(x - 1, 14);
    context.lineTo(x - 3.5, 31);
    context.lineTo(x - 1, 31);
    context.closePath();
    context.fill();
  }
}

export function paintLava(context: CanvasRenderingContext2D): void {
  const gradient = context.createLinearGradient(0, 0, 0, 48);

  gradient.addColorStop(0, '#ffd23f');
  gradient.addColorStop(0.35, '#ff7a2e');
  gradient.addColorStop(1, '#c2302a');
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(0, 48);
  context.lineTo(0, 10);

  for (let wave = 0; wave < 5; wave += 1) {
    const x = wave * 12;
    context.quadraticCurveTo(x + 6, 2, x + 12, 10);
  }

  context.lineTo(48, 48);
  context.closePath();
  context.fill();

  context.fillStyle = 'rgba(255, 245, 200, 0.8)';
  circle(context, 14, 26, 3);
  context.fill();
  circle(context, 36, 36, 2);
  context.fill();
}

export const TALL_SPRITE_WIDTH = 48;
export const TALL_SPRITE_HEIGHT = 96;

/** Bandeira do checkpoint erguida e colorida. */
export function paintCheckpoint(context: CanvasRenderingContext2D): void {
  roundedRect(context, 10, 86, 20, 9, 3);
  fillAndOutline(context, '#8a8fa8', 3);
  roundedRect(context, 17, 8, 6, 80, 3);
  fillAndOutline(context, '#e8eef7', 3);
  circle(context, 20, 8, 5);
  fillAndOutline(context, '#ffd23f', 3);

  const flagTop = 14;

  context.beginPath();
  context.moveTo(23, flagTop);
  context.lineTo(46, flagTop + 9);
  context.lineTo(23, flagTop + 20);
  context.closePath();
  fillAndOutline(context, '#ff4f9a', 3);
  context.fillStyle = '#ffffff';
  star(context, 31, flagTop + 10, 4, 1.8);
  context.fill();
}

export function paintDoor(context: CanvasRenderingContext2D): void {
  const wood = '#9a5f33';

  context.beginPath();
  context.moveTo(4, 95);
  context.lineTo(4, 28);
  context.arc(24, 28, 20, Math.PI, 0);
  context.lineTo(44, 95);
  context.closePath();
  fillAndOutline(context, wood, 3);

  context.strokeStyle = darken(wood, 0.3);
  context.lineWidth = 2;
  context.beginPath();

  for (const x of [17, 31]) {
    context.moveTo(x, 12);
    context.lineTo(x, 95);
  }

  context.stroke();
  context.fillStyle = '#ffd23f';
  circle(context, 36, 60, 3);
  context.fill();
}

/** Porta dourada: tábuas de ouro com um diamante no alto — leva a outra porta e dá moedas. */
export function paintGoldenDoor(context: CanvasRenderingContext2D): void {
  const gold = '#f2b705';

  context.beginPath();
  context.moveTo(4, 95);
  context.lineTo(4, 28);
  context.arc(24, 28, 20, Math.PI, 0);
  context.lineTo(44, 95);
  context.closePath();
  fillAndOutline(context, gold, 3);

  context.strokeStyle = darken(gold, 0.25);
  context.lineWidth = 2;
  context.beginPath();

  for (const x of [17, 31]) {
    context.moveTo(x, 30);
    context.lineTo(x, 95);
  }

  context.stroke();

  context.beginPath();
  context.moveTo(24, 10);
  context.lineTo(31, 19);
  context.lineTo(24, 28);
  context.lineTo(17, 19);
  context.closePath();
  fillAndOutline(context, '#6fe3ff', 2);
  context.fillStyle = '#ffffff';
  circle(context, 36, 60, 3);
  context.fill();
  shine(context, 12, 40, 3, 8);
}

/** Porta secreta: dourada, com brilho — difícil de achar, fácil de reconhecer. */
export function paintSecretDoor(context: CanvasRenderingContext2D): void {
  const gold = '#ffcf3f';

  context.beginPath();
  context.moveTo(4, 95);
  context.lineTo(4, 28);
  context.arc(24, 28, 20, Math.PI, 0);
  context.lineTo(44, 95);
  context.closePath();
  fillAndOutline(context, gold, 3);

  context.fillStyle = lighten(gold, 0.5);
  star(context, 24, 36, 11, 5);
  context.fill();
  context.fillStyle = OUTLINE;
  circle(context, 24, 64, 4);
  context.fill();
  context.fillRect(22, 64, 4, 10);
  shine(context, 14, 24, 4, 7);
}

export const PORTAL_WIDTH = 112;
export const PORTAL_HEIGHT = 128;

/** Moldura do portal. O redemoinho é pintado à parte e vai por cima dela. */
export function paintPortalFrame(context: CanvasRenderingContext2D): void {
  context.lineWidth = 12;
  context.strokeStyle = OUTLINE;
  ellipse(context, 56, 64, 44, 58);
  context.stroke();
  context.lineWidth = 7;
  context.strokeStyle = '#b39cff';
  context.stroke();

  for (let gem = 0; gem < 6; gem += 1) {
    const angle = (gem / 6) * Math.PI * 2;
    const x = 56 + Math.cos(angle) * 44;
    const y = 64 + Math.sin(angle) * 58;
    star(context, x, y, 7, 3);
    fillAndOutline(context, '#ffd23f', 2);
  }
}

export const PORTAL_SWIRL_SIZE = 96;

export function paintPortalSwirl(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(48, 48, 4, 48, 48, 46);

  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.35, '#9ee8ff');
  gradient.addColorStop(0.75, '#8a63d9');
  gradient.addColorStop(1, 'rgba(138, 99, 217, 0)');
  context.fillStyle = gradient;
  circle(context, 48, 48, 46);
  context.fill();

  context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  context.lineWidth = 3;

  for (let arm = 0; arm < 3; arm += 1) {
    context.beginPath();

    for (let step = 0; step < 30; step += 1) {
      const angle = (arm * Math.PI * 2) / 3 + step * 0.18;
      const radius = 4 + step * 1.3;
      const x = 48 + Math.cos(angle) * radius;
      const y = 48 + Math.sin(angle) * radius;

      if (step === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.stroke();
  }
}

export function paintSign(context: CanvasRenderingContext2D): void {
  const wood = '#c98a4b';

  context.fillStyle = darken(wood, 0.3);
  context.fillRect(21, 26, 6, 22);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;
  context.strokeRect(21, 26, 6, 22);
  roundedRect(context, 4, 6, 40, 24, 4);
  fillAndOutline(context, wood, 3);
  context.strokeStyle = darken(wood, 0.3);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(10, 14);
  context.lineTo(38, 14);
  context.moveTo(10, 21);
  context.lineTo(32, 21);
  context.stroke();
}

/** Ícone do canhão de ferro, com boca escura e base larga. */
export function paintCannon(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#414956';
  context.fillRect(2, 34, 44, 12);
  context.fillStyle = '#626d7c';
  context.fillRect(8, 5, 32, 31);
  context.fillStyle = '#8b99ab';
  context.fillRect(5, 3, 38, 7);
  context.fillStyle = '#141b24';
  context.fillRect(13, 14, 22, 16);
}
