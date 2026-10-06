import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';

import type { ThemePalette } from '../../art/palettes';
import { paintVoxelAtlas, VOXEL_TILE_SIZE, voxelTileOrigin } from '../../art/voxel-tiles';
import type { TileLookup } from './voxel-mesher';

/** Recuo de meio pixel nas bordas de cada face: a placa nunca amostra a vizinha. */
const HALF_TEXEL = 0.5;

/**
 * As faces dos blocos numa textura só, pronta para a placa de vídeo.
 *
 * Filtro "vizinho mais próximo" e sem mipmaps: é o que mantém os pixels
 * grandes e nítidos do estilo de cubos, em vez de um borrão.
 */
export class VoxelAtlasTexture {
  readonly texture: CanvasTexture;
  readonly lookup: TileLookup;

  constructor(palette: ThemePalette) {
    const atlas = paintVoxelAtlas(palette);
    const texture = new CanvasTexture(atlas.canvas);

    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;

    this.texture = texture;
    this.lookup = (tile) => {
      const origin = voxelTileOrigin(tile);
      const left = origin.x + HALF_TEXEL;
      const right = origin.x + VOXEL_TILE_SIZE - HALF_TEXEL;
      const top = origin.y + HALF_TEXEL;
      const bottom = origin.y + VOXEL_TILE_SIZE - HALF_TEXEL;

      // A textura sobe invertida para a placa: o topo do canvas é o v mais alto.
      return {
        u0: left / atlas.width,
        u1: right / atlas.width,
        v0: 1 - bottom / atlas.height,
        v1: 1 - top / atlas.height,
      };
    };
  }

  dispose(): void {
    this.texture.dispose();
  }
}
