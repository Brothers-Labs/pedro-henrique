import type * as Phaser from 'phaser';

import { createCanvas, context2d, roundedRect } from '../art/canvas';
import type { TextureSpec } from '../art/texture-catalog';

/** Quadros reservados na textura de emergência, para qualquer animação achar o seu. */
const FALLBACK_FRAMES = 12;

/**
 * Registra uma textura pintada em canvas, fatiando os quadros quando for tira.
 *
 * Se o desenho falhar, entra no lugar um bloco neutro do mesmo tamanho: a
 * fase continua jogável e o problema fica registrado no console, em vez de
 * uma tela preta por causa de um único enfeite.
 */
export function registerTexture(textures: Phaser.Textures.TextureManager, spec: TextureSpec): void {
  if (textures.exists(spec.key)) {
    textures.remove(spec.key);
  }

  const canvas = createSafely(spec);
  const texture = textures.addCanvas(spec.key, canvas);

  if (!texture || !spec.frameWidth || !spec.frameHeight) {
    return;
  }

  const columns = Math.floor(canvas.width / spec.frameWidth);

  for (let frame = 0; frame < columns; frame += 1) {
    texture.add(frame, 0, frame * spec.frameWidth, 0, spec.frameWidth, spec.frameHeight);
  }
}

function createSafely(spec: TextureSpec): HTMLCanvasElement {
  try {
    return spec.create();
  } catch (error) {
    console.warn(`Pedro Maker: a textura "${spec.key}" não pôde ser desenhada e foi substituída.`, error);

    return fallbackCanvas(spec);
  }
}

function fallbackCanvas(spec: TextureSpec): HTMLCanvasElement {
  const width = spec.frameWidth ?? 48;
  const height = spec.frameHeight ?? 48;
  const frames = spec.frameWidth ? FALLBACK_FRAMES : 1;
  const canvas = createCanvas(width * frames, height);
  const context = context2d(canvas);

  for (let frame = 0; frame < frames; frame += 1) {
    roundedRect(context, frame * width + 4, 4, width - 8, height - 8, 8);
    context.fillStyle = '#b39cff';
    context.fill();
  }

  return canvas;
}
