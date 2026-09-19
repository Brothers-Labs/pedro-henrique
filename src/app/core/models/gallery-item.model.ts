import type { ImageAsset } from './image-asset.model';
import type { ThemeColor } from './profile.model';

export type PhotoOrientation = 'portrait' | 'landscape' | 'square';

/**
 * Foto como o gerador de manifesto a encontrou em `public/img`.
 *
 * Só contém o que pode ser lido do arquivo: nada de datas, locais ou legendas
 * inventadas.
 */
export interface GalleryPhotoSource extends ImageAsset {
  readonly id: string;
  readonly fileName: string;
  readonly orientation: PhotoOrientation;
}

/** Foto pronta para a tela: a fonte mais as decisões de layout e leitura. */
export interface GalleryPhoto extends GalleryPhotoSource {
  /** Posição no álbum, começando em 1 — aparece no contador do lightbox. */
  readonly position: number;
  readonly alt: string;
  /** Proporção do recorte exibido no card, no formato aceito por `aspect-ratio`. */
  readonly displayAspectRatio: string;
  /** Proporção original, usada no lightbox para não deformar a foto. */
  readonly naturalAspectRatio: string;
  readonly tone: ThemeColor;
}

/**
 * Posição de uma foto na composição de destaques.
 *
 * O nome descreve o papel na composição, não um tamanho em pixels: o CSS
 * traduz cada papel em colunas e linhas a cada breakpoint.
 */
export type FeaturedSlot = 'hero' | 'tall' | 'top' | 'bottom';

export interface FeaturedPhoto extends GalleryPhoto {
  readonly slot: FeaturedSlot;
}
