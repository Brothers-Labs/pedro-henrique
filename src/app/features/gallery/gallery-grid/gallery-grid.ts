import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { GalleryPhoto } from '../../../core/models/gallery-item.model';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { GalleryCard } from '../gallery-card/gallery-card';

const REVEAL_STEP_IN_MS = 55;

/** Quantas fotos entram no escalonamento antes do atraso parar de crescer. */
const MAX_STAGGERED_ITEMS = 8;

/**
 * Mosaico do álbum: colunas de largura igual e cards de alturas diferentes,
 * encaixados pelo próprio fluxo de multi-colunas do navegador.
 */
@Component({
  selector: 'app-gallery-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GalleryCard, RevealDirective],
  templateUrl: './gallery-grid.html',
  styleUrl: './gallery-grid.scss',
})
export class GalleryGrid {
  readonly photos = input.required<readonly GalleryPhoto[]>();
  readonly photoOpened = output<GalleryPhoto>();

  /**
   * O escalonamento tem teto: sem ele, as últimas fotos de um álbum grande
   * esperariam segundos para aparecer depois de já estarem na tela.
   */
  protected revealDelay(index: number): number {
    return Math.min(index, MAX_STAGGERED_ITEMS) * REVEAL_STEP_IN_MS;
  }
}
