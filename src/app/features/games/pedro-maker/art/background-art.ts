import { VIEW_HEIGHT, VIEW_WIDTH } from '../config/physics.config';
import { circle, lighten, paint, star, textureNoise } from './canvas';
import type { ThemePalette } from './palettes';

/** Largura das camadas repetíveis do fundo. */
export const LAYER_WIDTH = 1024;
export const FAR_LAYER_HEIGHT = 360;
export const MID_LAYER_HEIGHT = 240;
export const CLOUD_LAYER_HEIGHT = 220;

/** Céu fixo: gradiente, sol ou estrelas. Não se move com a câmera. */
export function paintSky(palette: ThemePalette): HTMLCanvasElement {
  return paint(VIEW_WIDTH, VIEW_HEIGHT, (context) => {
    const gradient = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);

    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(1, palette.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    if (palette.hasClouds) {
      context.fillStyle = 'rgba(255, 244, 196, 0.9)';
      circle(context, VIEW_WIDTH - 180, 120, 58);
      context.fill();
      context.fillStyle = 'rgba(255, 244, 196, 0.35)';
      circle(context, VIEW_WIDTH - 180, 120, 86);
      context.fill();
      return;
    }

    const random = textureNoise(7);
    context.fillStyle = '#ffffff';

    for (let index = 0; index < 90; index += 1) {
      context.globalAlpha = 0.35 + random() * 0.6;
      const size = 1 + random() * 2.4;
      const x = random() * VIEW_WIDTH;
      const y = random() * VIEW_HEIGHT * 0.75;

      if (size > 2.8) {
        star(context, x, y, size * 1.6, size * 0.7);
      } else {
        circle(context, x, y, size);
      }

      context.fill();
    }

    context.globalAlpha = 1;
  });
}

/**
 * Montanhas distantes.
 *
 * A silhueta é uma soma de senoides com período que divide a largura da
 * camada: por isso a emenda da repetição nunca aparece.
 */
export function paintFarLayer(palette: ThemePalette): HTMLCanvasElement {
  return paintRidge(FAR_LAYER_HEIGHT, palette.far, [
    { amplitude: 90, cycles: 2, phase: 0.4 },
    { amplitude: 40, cycles: 5, phase: 1.3 },
  ], 150, true);
}

export function paintMidLayer(palette: ThemePalette): HTMLCanvasElement {
  return paintRidge(MID_LAYER_HEIGHT, palette.mid, [
    { amplitude: 36, cycles: 3, phase: 2.1 },
    { amplitude: 16, cycles: 7, phase: 0.2 },
  ], 70, false);
}

interface Wave {
  readonly amplitude: number;
  readonly cycles: number;
  readonly phase: number;
}

function paintRidge(
  height: number,
  color: string,
  waves: readonly Wave[],
  baseline: number,
  hasSnowCaps: boolean,
): HTMLCanvasElement {
  return paint(LAYER_WIDTH, height, (context) => {
    const ridgeAt = (x: number): number =>
      baseline +
      waves.reduce(
        (offset, wave) =>
          offset + Math.sin((x / LAYER_WIDTH) * Math.PI * 2 * wave.cycles + wave.phase) * wave.amplitude,
        0,
      );

    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, height);

    for (let x = 0; x <= LAYER_WIDTH; x += 8) {
      context.lineTo(x, ridgeAt(x));
    }

    context.lineTo(LAYER_WIDTH, height);
    context.closePath();
    context.fill();

    if (!hasSnowCaps) {
      return;
    }

    // Brilho no alto das montanhas, só onde o cume fica bem acima da média.
    context.fillStyle = lighten(color, 0.45);

    for (let x = 0; x <= LAYER_WIDTH; x += 8) {
      const y = ridgeAt(x);

      if (y < baseline - 70) {
        context.fillRect(x, y, 8, 10);
      }
    }
  });
}

export function paintCloudLayer(): HTMLCanvasElement {
  return paint(LAYER_WIDTH, CLOUD_LAYER_HEIGHT, (context) => {
    context.fillStyle = 'rgba(255, 255, 255, 0.92)';

    for (const [x, y, scale] of [[120, 70, 1], [470, 130, 0.8], [760, 60, 1.2]] as const) {
      for (const [dx, dy, radius] of [[0, 0, 28], [30, -14, 34], [64, 0, 26], [32, 10, 26]] as const) {
        circle(context, x + dx * scale, y + dy * scale, radius * scale);
        context.fill();
      }
    }
  });
}

export const SPOTLIGHT_WIDTH = 512;
export const SPOTLIGHT_HEIGHT = 288;

/**
 * Penumbra da caverna: escura nas bordas e transparente no centro.
 *
 * Pintada pequena e ampliada no jogo — o gradiente é suave o bastante para
 * não perder nada na ampliação, e a textura fica leve para o celular.
 */
export function paintSpotlight(): HTMLCanvasElement {
  return paint(SPOTLIGHT_WIDTH, SPOTLIGHT_HEIGHT, (context) => {
    const gradient = context.createRadialGradient(
      SPOTLIGHT_WIDTH / 2,
      SPOTLIGHT_HEIGHT / 2,
      18,
      SPOTLIGHT_WIDTH / 2,
      SPOTLIGHT_HEIGHT / 2,
      SPOTLIGHT_HEIGHT * 0.62,
    );

    gradient.addColorStop(0, 'rgba(8, 5, 20, 0)');
    gradient.addColorStop(0.55, 'rgba(8, 5, 20, 0.35)');
    gradient.addColorStop(1, 'rgba(8, 5, 20, 0.82)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, SPOTLIGHT_WIDTH, SPOTLIGHT_HEIGHT);
  });
}
