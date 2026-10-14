import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

import { context2d, createCanvas, darken, lighten } from '../../pedro-maker/art/canvas';
import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import type { FlashThemeDefinition } from '../config/theme.config';
import { LANE_WIDTH, ROAD_HALF_WIDTH } from '../course/course-geometry';

/**
 * As texturas do Pedro Flash, pintadas em Canvas 2D na hora.
 *
 * Como no resto do site, nenhuma imagem é baixada: não existe arquivo que
 * possa falhar ou pesar no carregamento.
 */

/** Asfalto com faixas tracejadas entre as três pistas e linhas brancas nas beiradas. */
export function paintRoad(theme: FlashThemeDefinition): CanvasTexture {
  const canvas = createCanvas(256, 256);
  const context = context2d(canvas);
  const random = new SeededRandom(11);
  const width = canvas.width;

  context.fillStyle = theme.road;
  context.fillRect(0, 0, width, canvas.height);

  for (let index = 0; index < 900; index += 1) {
    context.fillStyle = random.chance(0.5) ? lighten(theme.road, 0.08) : darken(theme.road, 0.12);
    context.fillRect(random.integer(0, width - 2), random.integer(0, canvas.height - 2), 2, 2);
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.85)';
  context.fillRect(6, 0, 5, canvas.height);
  context.fillRect(width - 11, 0, 5, canvas.height);

  // As divisas ficam no meio do caminho entre o centro de duas faixas vizinhas.
  context.fillStyle = theme.roadDetail;

  for (const lateral of [-LANE_WIDTH / 2, LANE_WIDTH / 2]) {
    const x = ((lateral + ROAD_HALF_WIDTH) / (ROAD_HALF_WIDTH * 2)) * width;

    context.fillRect(x - 3, 0, 6, canvas.height * 0.55);
  }

  return repeating(canvas);
}

export function paintGround(theme: FlashThemeDefinition): CanvasTexture {
  const canvas = createCanvas(128, 128);
  const context = context2d(canvas);
  const random = new SeededRandom(7);

  context.fillStyle = theme.ground;
  context.fillRect(0, 0, 128, 128);
  context.fillStyle = theme.groundDetail;

  for (let index = 0; index < 160; index += 1) {
    const size = random.integer(2, 5);

    context.fillRect(random.integer(0, 124), random.integer(0, 124), size, size);
  }

  return repeating(canvas);
}

export function paintCheckered(): CanvasTexture {
  const canvas = createCanvas(160, 32);
  const context = context2d(canvas);
  const size = 16;

  for (let column = 0; column < canvas.width / size; column += 1) {
    for (let row = 0; row < canvas.height / size; row += 1) {
      context.fillStyle = (column + row) % 2 === 0 ? '#ffffff' : '#1e1e28';
      context.fillRect(column * size, row * size, size, size);
    }
  }

  return finish(canvas);
}

/** Placa de turbo: três setas amarelas apontando para a frente da corrida. */
export function paintBoost(): CanvasTexture {
  const canvas = createCanvas(64, 128);
  const context = context2d(canvas);

  context.fillStyle = '#ff7a1a';
  context.fillRect(0, 0, 64, 128);
  context.fillStyle = '#fff3bf';

  // O alto do desenho é a frente: no remendo, a textura sobe no sentido da corrida.
  for (const top of [12, 52, 92]) {
    context.beginPath();
    context.moveTo(32, top);
    context.lineTo(56, top + 24);
    context.lineTo(44, top + 24);
    context.lineTo(32, top + 12);
    context.lineTo(20, top + 24);
    context.lineTo(8, top + 24);
    context.closePath();
    context.fill();
  }

  return finish(canvas);
}

/** Listras de aviso amarelas e pretas: na beira do buraco, na rampa e na barreira. */
export function paintWarning(): CanvasTexture {
  const canvas = createCanvas(64, 64);
  const context = context2d(canvas);

  context.fillStyle = '#ffd23f';
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = '#1e1e28';

  for (let offset = -64; offset < 64; offset += 32) {
    context.beginPath();
    context.moveTo(offset, 64);
    context.lineTo(offset + 16, 64);
    context.lineTo(offset + 80, 0);
    context.lineTo(offset + 64, 0);
    context.closePath();
    context.fill();
  }

  return repeating(canvas);
}

/** Caixa surpresa: degradê elétrico com um raio branco no meio. */
export function paintItemBox(): CanvasTexture {
  const canvas = createCanvas(64, 64);
  const context = context2d(canvas);
  const gradient = context.createLinearGradient(0, 0, 64, 64);

  gradient.addColorStop(0, '#3fb8ff');
  gradient.addColorStop(0.5, '#a678ff');
  gradient.addColorStop(1, '#ff6fd0');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 5;
  context.strokeRect(3, 3, 58, 58);
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(36, 8);
  context.lineTo(18, 36);
  context.lineTo(31, 36);
  context.lineTo(26, 56);
  context.lineTo(46, 26);
  context.lineTo(33, 26);
  context.closePath();
  context.fill();

  return finish(canvas);
}

function repeating(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = finish(canvas);

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  return texture;
}

function finish(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);

  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}
