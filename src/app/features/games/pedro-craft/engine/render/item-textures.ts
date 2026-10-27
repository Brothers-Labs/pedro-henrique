import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';

import { paintItemIcon } from '../../art/item-icons';
import type { CraftCatalog } from '../../content/craft-catalog';

/** Pixels do ícone no 3D: o dobro do desenho de 16, para o cubinho do bloco não serrilhar. */
const TEXTURE_SIZE = 32;

/**
 * Texturas dos ícones dos itens, pintadas uma vez por item.
 *
 * O mesmo desenho da barra aparece no item caído e na mão do herói.
 */
export class ItemTextures {
  private readonly textures = new Map<string, CanvasTexture>();

  constructor(private readonly catalog: CraftCatalog) {}

  texture(itemId: string): CanvasTexture {
    const known = this.textures.get(itemId);

    if (known) {
      return known;
    }

    const texture = new CanvasTexture(paintItemIcon(this.catalog, itemId, TEXTURE_SIZE));

    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;
    this.textures.set(itemId, texture);

    return texture;
  }

  dispose(): void {
    for (const texture of this.textures.values()) {
      texture.dispose();
    }

    this.textures.clear();
  }
}
