import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import {
  FEATURED_PHOTOS,
  GALLERY_PHOTO_COUNT,
  GALLERY_PHOTOS,
  MOSAIC_PHOTOS,
} from '../../core/data/gallery.data';
import type { GalleryPhoto } from '../../core/models/gallery-item.model';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { SectionHeading } from '../../shared/components/section-heading/section-heading';
import { FeaturedMoments } from './featured-moments/featured-moments';
import { GalleryGrid } from './gallery-grid/gallery-grid';
import { GalleryLightbox } from './gallery-lightbox/gallery-lightbox';

/**
 * O álbum do Pedro Henrique.
 *
 * A página só compõe: as fotos vêm prontas da camada de dados, os destaques e
 * o mosaico cuidam do layout, e o lightbox cuida da tela cheia. O que sobra
 * aqui é o único estado que atravessa as três peças — qual foto está aberta —
 * e ele é um índice do álbum inteiro, para que a navegação no lightbox
 * continue de uma seção para a outra.
 */
@Component({
  selector: 'app-gallery-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, SectionHeading, FeaturedMoments, GalleryGrid, GalleryLightbox],
  templateUrl: './gallery-page.html',
  styleUrl: './gallery-page.scss',
})
export class GalleryPage {
  private readonly topSentinel = viewChild.required<ElementRef<HTMLElement>>('topSentinel');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly photos = GALLERY_PHOTOS;
  protected readonly photoCount = GALLERY_PHOTO_COUNT;
  protected readonly featuredPhotos = FEATURED_PHOTOS;
  protected readonly mosaicPhotos = MOSAIC_PHOTOS;

  protected readonly openPhotoIndex = signal<number | null>(null);
  protected readonly isAwayFromTop = signal(false);

  constructor() {
    afterNextRender(() => this.watchTopOfPage());
  }

  protected openPhoto(photo: GalleryPhoto): void {
    const index = this.photos.findIndex((candidate) => candidate.id === photo.id);

    if (index >= 0) {
      this.openPhotoIndex.set(index);
    }
  }

  /** Sem `behavior`: quem decide se a rolagem é suave é o CSS, que já respeita o modo calmo. */
  protected scrollToTop(): void {
    window.scrollTo({ top: 0 });
    this.topSentinel().nativeElement.focus();
  }

  /**
   * Observar uma marca no topo custa muito menos do que ouvir o evento de
   * rolagem: o navegador avisa só nas duas travessias que importam.
   */
  private watchTopOfPage(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => this.isAwayFromTop.set(!entries[entries.length - 1].isIntersecting),
      { threshold: 0 },
    );

    observer.observe(this.topSentinel().nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
