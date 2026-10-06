import { TILE_SIZE } from '../../config/physics.config';

/**
 * Conversão da física (pixels, y para baixo) para o mundo 3D (blocos, y para cima).
 *
 * Um bloco da grade vale 1 no mundo 3D e o chão da fase fica em y = 0. O
 * Pedro, os inimigos e os itens andam no plano z = 0, no meio da faixa de
 * terreno.
 */
export class WorldSpace {
  constructor(private readonly levelHeightPx: number) {}

  x(pixelX: number): number {
    return pixelX / TILE_SIZE;
  }

  y(pixelY: number): number {
    return (this.levelHeightPx - pixelY) / TILE_SIZE;
  }

  length(pixels: number): number {
    return pixels / TILE_SIZE;
  }
}
