import type {
  FeaturedPhoto,
  FeaturedSlot,
  GalleryPhoto,
  GalleryPhotoSource,
  PhotoOrientation,
} from '../models/gallery-item.model';
import { themeColorByIndex } from '../theme/theme-colors';
import { GALLERY_PHOTO_SOURCES } from './gallery-manifest.generated';

/**
 * Camada que transforma o manifesto de arquivos em fotos prontas para a tela.
 *
 * O manifesto é gerado e só sabe o que está no disco; é aqui que entram as
 * decisões de apresentação — recorte, ordem de destaque e texto alternativo.
 * Nenhuma delas inventa informação sobre a foto: o site não tem data, local
 * nem legenda de verdade para exibir.
 */

/**
 * Proporções de recorte aplicadas em rodízio dentro do mosaico.
 *
 * Todas as fotos do álbum têm praticamente a mesma proporção, então uma grade
 * fiel ao original ficaria monótona. Variar o recorte dentro de uma faixa
 * próxima à original cria o desencontro editorial sem cortar nada importante:
 * o retrato nunca vira paisagem, e vice-versa.
 */
const DISPLAY_RHYTHM: Readonly<Record<PhotoOrientation, readonly string[]>> = {
  portrait: ['3 / 4', '1 / 1', '3 / 4', '4 / 5', '9 / 16', '3 / 4'],
  landscape: ['4 / 3', '3 / 2', '4 / 3', '16 / 9'],
  square: ['1 / 1', '4 / 5'],
};

/** Papéis da composição de destaques, na ordem em que recebem as fotos. */
const FEATURED_SLOTS: readonly FeaturedSlot[] = ['hero', 'tall', 'top', 'bottom'];

/**
 * Abaixo disso a composição de destaques não se sustenta: sobrariam poucas
 * fotos para o mosaico e a página pareceria repetitiva.
 */
const MINIMUM_PHOTOS_FOR_HIGHLIGHTS = FEATURED_SLOTS.length * 2;

export const GALLERY_PHOTOS: readonly GalleryPhoto[] =
  GALLERY_PHOTO_SOURCES.map(toGalleryPhoto);

export const GALLERY_PHOTO_COUNT = GALLERY_PHOTOS.length;

/**
 * As primeiras fotos do álbum ocupam os destaques. A escolha é a ordem do
 * arquivo, e não um julgamento de qualidade que o código não tem como fazer.
 */
export const FEATURED_PHOTOS: readonly FeaturedPhoto[] =
  GALLERY_PHOTO_COUNT >= MINIMUM_PHOTOS_FOR_HIGHLIGHTS
    ? FEATURED_SLOTS.map((slot, index) => ({ ...GALLERY_PHOTOS[index], slot }))
    : [];

/** O mosaico mostra o resto do álbum, sem repetir o que já está em destaque. */
export const MOSAIC_PHOTOS: readonly GalleryPhoto[] =
  GALLERY_PHOTOS.slice(FEATURED_PHOTOS.length);

function toGalleryPhoto(source: GalleryPhotoSource, index: number): GalleryPhoto {
  const rhythm = DISPLAY_RHYTHM[source.orientation];
  const position = index + 1;

  return {
    ...source,
    position,
    alt: `Pedro Henrique na foto ${position} do álbum`,
    displayAspectRatio: rhythm[index % rhythm.length],
    naturalAspectRatio: `${source.width} / ${source.height}`,
    tone: themeColorByIndex(index),
  };
}
