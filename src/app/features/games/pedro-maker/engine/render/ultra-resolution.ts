import type { ScreenLook } from '../../config/screen.config';
import type { QualitySettings, QualityTier } from './quality';

/** Largura de uma tela 4K: no 4K, o quadro do jogo é desenhado com até isso de pixels. */
export const ULTRA_RENDER_WIDTH = 3840;

/** Teto da densidade no 4K: acima disso a placa de vídeo paga muito por pouca diferença. */
export const ULTRA_MAX_PIXEL_RATIO = 3;

/**
 * Quanto o 4K pode esticar uma tela de densidade baixa: o dobro leva uma tela
 * Full HD aos 3840 pixels, e uma janela pequena não paga nove vezes os pixels.
 */
export const ULTRA_MAX_SUPERSAMPLING = 2;

/** Placas de vídeo emuladas pelo processador: nelas o 4K só travaria o jogo. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Sombra do sol no 4K: com o quadro maior, a sombra de 2048 aparece serrilhada. */
export const ULTRA_SHADOW_MAP_SIZE = 4096;

/**
 * Só quem já começa na qualidade alta (computador com núcleos de sobra)
 * tenta o 4K. O monitor de quadros tira o 4K antes de baixar a qualidade.
 */
export function startsInUltra(tier: QualityTier): boolean {
  return tier === 'alta';
}

/** Nome da placa de vídeo que o navegador informa, para reconhecer a emulada por software. */
export function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = gl.getParameter(debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER);

  return typeof name === 'string' ? name : '';
}

export function isSoftwareRenderer(name: string): boolean {
  return SOFTWARE_RENDERER.test(name);
}

/**
 * Densidade de pixels do quadro do jogo.
 *
 * Fora do 4K, é a da tela até o teto da qualidade. No 4K, o quadro é desenhado
 * com até 3840 pixels de largura mesmo numa tela menor (no máximo o dobro da
 * densidade), e o navegador reduz a imagem: as bordas dos cubos saem lisas
 * como num monitor 4K. Uma tela que já tem mais densidade usa a própria, até o teto.
 */
export function renderPixelRatio(
  quality: QualitySettings,
  isUltra: boolean,
  devicePixelRatio: number,
  cssWidth: number,
): number {
  const screenRatio = devicePixelRatio > 0 ? devicePixelRatio : 1;

  if (!isUltra) {
    return Math.min(screenRatio, quality.pixelRatio);
  }

  const nativeRatio = Math.min(screenRatio, ULTRA_MAX_PIXEL_RATIO);
  const supersampledRatio = Math.min(ULTRA_MAX_SUPERSAMPLING, ULTRA_RENDER_WIDTH / Math.max(1, cssWidth));

  return Math.max(nativeRatio, supersampledRatio);
}

/**
 * Densidade do quadro em cada tela.
 *
 * Nas retrô, o quadro tem só as linhas da época (nunca mais que a densidade
 * normal) e o navegador estica. No HD, o quadro busca 1920 pixels de largura,
 * com o mesmo teto de supersampling do 4K. No 4K, a conta do 4K. Sem
 * supersampling (aparelho fraco ou jogo engasgando), HD e 4K viram o 3D.
 */
export function screenPixelRatio(
  look: ScreenLook,
  quality: QualitySettings,
  canSupersample: boolean,
  devicePixelRatio: number,
  cssWidth: number,
  cssHeight: number,
): number {
  const normal = renderPixelRatio(quality, false, devicePixelRatio, cssWidth);

  if (look.lines !== null) {
    return Math.min(normal, look.lines / Math.max(1, cssHeight));
  }

  if (look.targetWidth === null || !canSupersample) {
    return normal;
  }

  if (look.targetWidth >= ULTRA_RENDER_WIDTH) {
    return renderPixelRatio(quality, true, devicePixelRatio, cssWidth);
  }

  return Math.max(normal, Math.min(ULTRA_MAX_SUPERSAMPLING, look.targetWidth / Math.max(1, cssWidth)));
}
