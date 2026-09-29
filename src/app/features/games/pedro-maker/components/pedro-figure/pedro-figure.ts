import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { paintPedroIcon } from '../../art/texture-catalog';
import { paletteFor } from '../../config/character.config';
import type { CharacterLook } from '../../models/progress.model';

/**
 * O Pedro desenhado com o visual escolhido, fora do jogo.
 *
 * Usa o mesmo pintor do motor: o boné que aparece no menu é exatamente o
 * boné que aparece na fase. A imagem vira data URL uma vez por visual.
 */
@Component({
  selector: 'app-pedro-figure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img class="figure" [src]="source()" [alt]="label()" width="64" height="72" decoding="async" />`,
  styles: `
    :host {
      display: inline-block;
    }

    .figure {
      width: 100%;
      height: auto;
      image-rendering: auto;
    }
  `,
})
export class PedroFigure {
  readonly look = input.required<CharacterLook>();
  readonly label = input('O Pedro, personagem do jogo');

  /** Pintado em 3x: a vitrine do menu mostra o Pedro bem maior que no jogo. */
  protected readonly source = computed(() => paintPedroIcon(paletteFor(this.look()), 3).toDataURL());
}
