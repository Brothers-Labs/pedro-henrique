import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';

import type { GalleryPhoto } from '../../../core/models/gallery-item.model';

/** Deslocamento mínimo, em pixels, para um toque valer como navegação. */
const SWIPE_THRESHOLD_IN_PIXELS = 48;

type NavigationDirection = 'next' | 'previous';

/**
 * Visualização em tela cheia de uma foto do álbum.
 *
 * Usa o `<dialog>` nativo de propósito: ele já entrega prisão de foco, `Esc`
 * para fechar e devolução do foco ao elemento de origem — três coisas que uma
 * reimplementação em JavaScript costuma errar.
 *
 * A foto aberta é o índice em `index`; zerá-lo fecha a janela. Quem controla
 * esse índice é a página, que conhece o álbum inteiro.
 */
@Component({
  selector: 'app-gallery-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-lightbox.html',
  styleUrl: './gallery-lightbox.scss',
})
export class GalleryLightbox {
  readonly photos = input.required<readonly GalleryPhoto[]>();
  readonly index = model<number | null>(null);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private touchOrigin: { readonly x: number; readonly y: number } | null = null;

  /**
   * Um deslize que navegou não pode virar um clique de fechar: o navegador
   * dispara o `click` logo depois do `touchend`, no mesmo ponto da tela.
   */
  private hasNavigatedByTouch = false;

  protected readonly direction = signal<NavigationDirection>('next');
  protected readonly total = computed(() => this.photos().length);

  protected readonly currentPhoto = computed(() => {
    const index = this.index();
    return index === null ? null : (this.photos()[index] ?? null);
  });

  /**
   * O palco recebe uma lista de uma foto só para que trocar de foto substitua
   * o elemento `<img>` — é a troca do nó que faz a animação de entrada tocar
   * de novo a cada navegação.
   */
  protected readonly stage = computed(() => {
    const photo = this.currentPhoto();
    return photo ? [photo] : [];
  });

  constructor() {
    effect(() => this.syncDialog(this.index() !== null));
    effect(() => this.preloadNeighbours(this.index()));
  }

  protected close(): void {
    this.index.set(null);
  }

  protected goToPrevious(): void {
    this.move(-1);
  }

  protected goToNext(): void {
    this.move(1);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goToNext();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goToPrevious();
    }
  }

  /** Clique no fundo — em qualquer área marcada como dispensável — fecha. */
  protected handleDismissClick(event: MouseEvent): void {
    if (this.hasNavigatedByTouch) {
      this.hasNavigatedByTouch = false;
      return;
    }

    if (event.target instanceof HTMLElement && event.target.hasAttribute('data-dismiss')) {
      this.close();
    }
  }

  protected startTouch(event: TouchEvent): void {
    // Toque novo, trava zerada: um deslize antigo não pode engolir este clique.
    this.hasNavigatedByTouch = false;

    const touch = event.changedTouches[0];
    this.touchOrigin = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  protected finishTouch(event: TouchEvent): void {
    const origin = this.touchOrigin;
    const touch = event.changedTouches[0];
    this.touchOrigin = null;

    if (!origin || !touch) {
      return;
    }

    const horizontal = touch.clientX - origin.x;
    const vertical = touch.clientY - origin.y;
    const isHorizontalSwipe =
      Math.abs(horizontal) >= SWIPE_THRESHOLD_IN_PIXELS && Math.abs(horizontal) > Math.abs(vertical);

    if (!isHorizontalSwipe) {
      return;
    }

    this.hasNavigatedByTouch = true;
    this.move(horizontal < 0 ? 1 : -1);
  }

  protected cancelTouch(): void {
    this.touchOrigin = null;
  }

  /** O `<dialog>` também fecha por `Esc` e pelo botão nativo do navegador. */
  protected handleNativeClose(): void {
    this.index.set(null);
  }

  /**
   * Navega em ciclo: no fim do álbum a próxima foto é a primeira. Evita botões
   * que desligam no meio da experiência, o que confunde mais do que ajuda.
   */
  private move(step: number): void {
    const index = this.index();
    const total = this.total();

    if (index === null || total === 0) {
      return;
    }

    this.direction.set(step > 0 ? 'next' : 'previous');
    this.index.set((index + step + total) % total);
  }

  private syncDialog(shouldBeOpen: boolean): void {
    const element = this.dialog().nativeElement;

    if (shouldBeOpen && !element.open) {
      element.showModal();
      return;
    }

    if (!shouldBeOpen && element.open) {
      element.close();
    }
  }

  /** Adianta as vizinhas para que a navegação não espere download nenhum. */
  private preloadNeighbours(index: number | null): void {
    const photos = this.photos();

    if (index === null || photos.length < 2) {
      return;
    }

    for (const step of [1, -1]) {
      const neighbour = photos[(index + step + photos.length) % photos.length];
      new Image().src = neighbour.src;
    }
  }
}
