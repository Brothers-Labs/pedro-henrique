import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { FeaturedPhoto, GalleryPhoto } from '../../../core/models/gallery-item.model';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { GalleryCard } from '../gallery-card/gallery-card';

const REVEAL_STEP_IN_MS = 90;

/**
 * Composição assimétrica de abertura do álbum.
 *
 * Cada foto recebe um papel (`slot`) na camada de dados e o CSS traduz esse
 * papel em colunas e linhas — é o que permite mudar a composição por
 * breakpoint sem tocar no template.
 */
@Component({
  selector: 'app-featured-moments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GalleryCard, RevealDirective],
  templateUrl: './featured-moments.html',
  styleUrl: './featured-moments.scss',
})
export class FeaturedMoments {
  readonly photos = input.required<readonly FeaturedPhoto[]>();
  readonly photoOpened = output<GalleryPhoto>();

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
