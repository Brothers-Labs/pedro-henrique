import type { LevelLayout, TerrainKind } from '../levels/level-layout';
import type { GridPoint, LevelTheme } from '../models/level.model';
import type { Body } from '../simulation/body';
import { circle, INK, roundedRect } from './hero-painter';

interface ThemePalette {
  readonly skyTop: string;
  readonly skyBottom: string;
  readonly hills: string;
  readonly surface: string;
  readonly soil: string;
  /** Terra abaixo da fase, mais escura, para não parecer chão onde dá para pisar. */
  readonly deepSoil: string;
  readonly hasStars: boolean;
}

export const THEME_PALETTES: Readonly<Record<LevelTheme, ThemePalette>> = {
  campo: {
    skyTop: '#6ec3ff',
    skyBottom: '#d9f2ff',
    hills: '#8fd88a',
    surface: '#4cc94a',
    soil: '#b9773f',
    deepSoil: '#6e4424',
    hasStars: false,
  },
  praia: {
    skyTop: '#4fc3f7',
    skyBottom: '#fff3c4',
    hills: '#7fd6e8',
    surface: '#f7d774',
    soil: '#e0b25a',
    deepSoil: '#9a7436',
    hasStars: false,
  },
  noite: {
    skyTop: '#1d1b4a',
    skyBottom: '#4b3f8f',
    hills: '#2e2a66',
    surface: '#2f9a6a',
    soil: '#6b4a3a',
    deepSoil: '#3a271e',
    hasStars: true,
  },
  neve: {
    skyTop: '#a9d8ff',
    skyBottom: '#f1f8ff',
    hills: '#dceefc',
    surface: '#ffffff',
    soil: '#8aa0b8',
    deepSoil: '#55667c',
    hasStars: false,
  },
};

export const THEME_LABELS: Readonly<Record<LevelTheme, string>> = {
  campo: 'Campo',
  praia: 'Praia',
  noite: 'Noite',
  neve: 'Neve',
};

/** Como o mundo aparece na tela: quantos pixels vale um bloco e onde fica o canto da fase. */
export interface WorldCamera {
  readonly scale: number;
  /** Coluna (em blocos, com fração) que aparece na borda esquerda da tela. */
  readonly left: number;
  /** Pixel da tela onde fica o topo da fase. */
  readonly offsetY: number;
}

/** Céu em degradê e morros que andam mais devagar que o chão, para dar profundidade. */
export function paintBackground(
  context: CanvasRenderingContext2D,
  theme: LevelTheme,
  width: number,
  height: number,
  scroll: number,
): void {
  const palette = THEME_PALETTES[theme];
  const sky = context.createLinearGradient(0, 0, 0, height);

  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(1, palette.skyBottom);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  if (palette.hasStars) {
    context.fillStyle = 'rgb(255 255 255 / 80%)';

    for (let index = 0; index < 40; index += 1) {
      const x = (((index * 97) % 100) / 100) * width;
      const y = (((index * 53) % 60) / 100) * height;

      context.fillRect(x, y, 2, 2);
    }
  }

  const hillRadius = height * 0.35;
  const spacing = hillRadius * 2.4;
  const shift = (scroll * 0.3) % spacing;

  context.fillStyle = palette.hills;

  for (let x = -shift - spacing; x < width + spacing; x += spacing) {
    circle(context, x, height * 0.95, hillRadius);
    context.fill();
  }
}

/**
 * Desenha só os blocos que aparecem na tela; uma fase longa custa o mesmo que
 * uma curta. Abaixo da fase, quando sobra tela, vem terra funda.
 */
export function paintTerrain(
  context: CanvasRenderingContext2D,
  layout: LevelLayout,
  theme: LevelTheme,
  camera: WorldCamera,
  viewWidth: number,
  viewHeight: number,
): void {
  const levelBottom = Math.floor(screenY(camera, layout.height));

  if (levelBottom < viewHeight) {
    context.fillStyle = THEME_PALETTES[theme].deepSoil;
    context.fillRect(0, levelBottom, viewWidth, viewHeight - levelBottom);
  }

  const firstColumn = Math.floor(camera.left);
  const lastColumn = Math.ceil(camera.left + viewWidth / camera.scale);
  // Pixels inteiros: com frações, o navegador deixa um risco claro entre dois blocos de terra.
  const size = Math.ceil(camera.scale);

  for (let row = 0; row < layout.height; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const kind = layout.terrainAt(column, row);

      if (kind === 'empty') {
        continue;
      }

      const isExposed = layout.terrainAt(column, row - 1) !== 'ground';
      const x = Math.floor(screenX(camera, column));
      const y = Math.floor(screenY(camera, row));

      paintTile(context, kind, theme, isExposed, x, y, size);
    }
  }
}

export function paintTile(
  context: CanvasRenderingContext2D,
  kind: TerrainKind,
  theme: LevelTheme,
  isExposed: boolean,
  x: number,
  y: number,
  size: number,
): void {
  const palette = THEME_PALETTES[theme];

  switch (kind) {
    case 'empty':
      return;
    case 'ground':
      // Um pixel a mais para dentro do vizinho cobre qualquer fresta de arredondamento.
      context.fillStyle = palette.soil;
      context.fillRect(x, y, size + 1, size + 1);

      if (isExposed) {
        context.fillStyle = palette.surface;
        context.fillRect(x, y, size + 1, Math.round(size * 0.28));
      }

      return;
    case 'brick':
      paintBrick(context, x, y, size);
      return;
    case 'trampoline':
      paintTrampoline(context, x, y, size);
      return;
    case 'spike':
      paintSpikes(context, x, y, size);
      return;
  }
}

export function paintCoin(context: CanvasRenderingContext2D, x: number, y: number, size: number, timeSeconds: number): void {
  const spin = Math.abs(Math.cos(timeSeconds * 4));
  const bob = Math.sin(timeSeconds * 3) * size * 0.05;

  context.save();
  context.translate(x + size / 2, y + size / 2 + bob);
  context.scale(Math.max(0.2, spin), 1);
  context.beginPath();
  context.ellipse(0, 0, size * 0.3, size * 0.34, 0, 0, Math.PI * 2);
  context.fillStyle = '#ffcf3f';
  context.fill();
  context.lineWidth = size * 0.06;
  context.strokeStyle = '#c98a0b';
  context.stroke();
  context.fillStyle = '#fff3b0';
  context.fillRect(-size * 0.05, -size * 0.18, size * 0.1, size * 0.36);
  context.restore();
}

/** A pedrinha brava: uma pedra cinza de sobrancelha franzida. Amassada, vira uma panqueca. */
export function paintPebble(
  context: CanvasRenderingContext2D,
  body: Body,
  camera: WorldCamera,
  direction: -1 | 1,
  isSquashed: boolean,
): void {
  const size = camera.scale;
  const width = body.width * size;
  const height = (isSquashed ? body.height * 0.35 : body.height) * size;
  const x = screenX(camera, body.x);
  const y = screenY(camera, body.y + body.height) - height;

  context.save();
  context.lineWidth = size * 0.05;
  context.strokeStyle = INK;
  roundedRect(context, x, y, width, height, Math.min(width, height) * 0.45);
  context.fillStyle = '#9aa1b2';
  context.fill();
  context.stroke();

  if (!isSquashed) {
    const eyeX = x + width / 2 + direction * width * 0.15;
    const eyeY = y + height * 0.42;

    context.fillStyle = INK;
    circle(context, eyeX - size * 0.1, eyeY, size * 0.05);
    context.fill();
    circle(context, eyeX + size * 0.1, eyeY, size * 0.05);
    context.fill();
    context.beginPath();
    context.moveTo(eyeX - size * 0.18, eyeY - size * 0.14);
    context.lineTo(eyeX - size * 0.03, eyeY - size * 0.08);
    context.moveTo(eyeX + size * 0.18, eyeY - size * 0.14);
    context.lineTo(eyeX + size * 0.03, eyeY - size * 0.08);
    context.stroke();
  }

  context.restore();
}

/** Bandeira de chegada: mastro de três blocos e bandeira quadriculada. */
export function paintGoal(context: CanvasRenderingContext2D, point: GridPoint, camera: WorldCamera): void {
  const size = camera.scale;
  const poleX = screenX(camera, point.column + 0.45);
  const bottom = screenY(camera, point.row + 1);
  const top = bottom - size * 3;

  context.fillStyle = INK;
  context.fillRect(poleX, top, size * 0.1, size * 3);

  const cell = size * 0.25;

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      context.fillStyle = (row + column) % 2 === 0 ? '#ffffff' : INK;
      context.fillRect(poleX + size * 0.1 + column * cell, top + row * cell, cell, cell);
    }
  }
}

/** Marco do caminho: cinza até o Pedro passar, verde depois. */
export function paintCheckpoint(
  context: CanvasRenderingContext2D,
  point: GridPoint,
  camera: WorldCamera,
  isActive: boolean,
): void {
  const size = camera.scale;
  const poleX = screenX(camera, point.column + 0.45);
  const bottom = screenY(camera, point.row + 1);

  context.fillStyle = INK;
  context.fillRect(poleX, bottom - size * 1.4, size * 0.08, size * 1.4);
  context.beginPath();
  context.moveTo(poleX + size * 0.08, bottom - size * 1.4);
  context.lineTo(poleX + size * 0.6, bottom - size * 1.2);
  context.lineTo(poleX + size * 0.08, bottom - size);
  context.closePath();
  context.fillStyle = isActive ? '#4cc94a' : '#c2c7d4';
  context.fill();
}

/** Marcador do início, usado só no editor: na fase de verdade, quem marca o início é o próprio Pedro. */
export function paintStartMarker(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  roundedRect(context, x + size * 0.15, y + size * 0.15, size * 0.7, size * 0.7, size * 0.2);
  context.fillStyle = '#3fa3f5';
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `800 ${Math.round(size * 0.45)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('P', x + size / 2, y + size / 2);
}

export function screenX(camera: WorldCamera, worldX: number): number {
  return (worldX - camera.left) * camera.scale;
}

export function screenY(camera: WorldCamera, worldY: number): number {
  return camera.offsetY + worldY * camera.scale;
}

function paintBrick(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  context.fillStyle = '#d0703a';
  context.fillRect(x, y, size, size);
  context.strokeStyle = '#8a3f1c';
  context.lineWidth = Math.max(1, size * 0.06);
  context.strokeRect(x, y, size, size);
  context.beginPath();
  context.moveTo(x, y + size / 2);
  context.lineTo(x + size, y + size / 2);
  context.moveTo(x + size / 2, y);
  context.lineTo(x + size / 2, y + size / 2);
  context.moveTo(x + size / 4, y + size / 2);
  context.lineTo(x + size / 4, y + size);
  context.moveTo(x + (size * 3) / 4, y + size / 2);
  context.lineTo(x + (size * 3) / 4, y + size);
  context.stroke();
}

function paintTrampoline(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  context.fillStyle = '#5b5f6b';
  context.fillRect(x + size * 0.1, y + size * 0.75, size * 0.8, size * 0.25);
  context.strokeStyle = '#c2c7d4';
  context.lineWidth = Math.max(1, size * 0.07);
  context.beginPath();

  for (let step = 0; step <= 4; step += 1) {
    const springY = y + size * (0.35 + step * 0.1);

    context.lineTo(x + size * (step % 2 === 0 ? 0.3 : 0.7), springY);
  }

  context.stroke();
  roundedRect(context, x, y + size * 0.15, size, size * 0.22, size * 0.1);
  context.fillStyle = '#ff5fa2';
  context.fill();
  context.lineWidth = Math.max(1, size * 0.05);
  context.strokeStyle = INK;
  context.stroke();
}

function paintSpikes(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  context.fillStyle = '#c2c7d4';
  context.strokeStyle = INK;
  context.lineWidth = Math.max(1, size * 0.04);
  context.beginPath();

  for (let index = 0; index < 3; index += 1) {
    const left = x + (index * size) / 3;

    context.moveTo(left, y + size);
    context.lineTo(left + size / 6, y + size * 0.5);
    context.lineTo(left + size / 3, y + size);
  }

  context.closePath();
  context.fill();
  context.stroke();
}
