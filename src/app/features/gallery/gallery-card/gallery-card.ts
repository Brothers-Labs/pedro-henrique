import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import type { GalleryPhoto } from '../../../core/models/gallery-item.model';

/**
 * Um retrato do álbum, pronto para ser aberto em tela cheia.
 *
 * O card não decide o próprio formato: ele preenche o espaço que o mosaico ou
 * a composição de destaques reservam. Assim a mesma peça serve aos dois
 * layouts sem nenhuma variante condicional.
 */
@Component({
  selector: 'app-gallery-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-color]': 'photo().tone' },
  templateUrl: './gallery-card.html',
  styleUrl: './gallery-card.scss',
})
export class GalleryCard {
  readonly photo = input.required<GalleryPhoto>();

  /**
   * Fotos acima da dobra carregam imediatamente e com prioridade; o resto do
   * álbum espera chegar perto da viewport.
   */
  readonly isPriority = input(false);

  readonly opened = output<GalleryPhoto>();

  protected readonly isLoaded = signal(false);

  /**
   * Um erro de carregamento também encerra o esqueleto: melhor mostrar o card
   * vazio do que deixar uma animação infinita no lugar da foto.
   */
  protected finishLoading(): void {
    this.isLoaded.set(true);
  }
}
