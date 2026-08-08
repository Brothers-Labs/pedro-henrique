import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, signal, viewChild } from '@angular/core';

import { GALLERY_CATEGORIES, GALLERY_ITEMS } from '../../core/data/gallery.data';
import type { GalleryCategory, GalleryItem } from '../../core/models/gallery-item.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { RevealDirective } from '../../shared/directives/reveal.directive';

type CategoryFilter = GalleryCategory | 'todas';

const REVEAL_STEP_IN_MS = 60;

@Component({
  selector: 'app-gallery-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, PageIntro, EmptyState, RevealDirective],
  templateUrl: './gallery-page.html',
  styleUrl: './gallery-page.scss',
})
export class GalleryPage {
  private readonly lightbox = viewChild<ElementRef<HTMLDialogElement>>('lightbox');

  protected readonly categories = GALLERY_CATEGORIES;
  protected readonly selectedCategory = signal<CategoryFilter>('todas');
  protected readonly selectedItem = signal<GalleryItem | null>(null);

  protected readonly items = computed(() => {
    const category = this.selectedCategory();
    return category === 'todas'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === category);
  });

  protected selectCategory(category: CategoryFilter): void {
    this.selectedCategory.set(category);
  }

  protected openItem(item: GalleryItem): void {
    this.selectedItem.set(item);
    this.lightbox()?.nativeElement.showModal();
  }

  protected closeItem(): void {
    this.lightbox()?.nativeElement.close();
  }

  protected clearSelection(): void {
    this.selectedItem.set(null);
  }

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
