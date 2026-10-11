import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { paintCharacterIcon } from '../../art/texture-catalog';
import type { CharacterPalette } from '../../config/character.config';
import { heroDefinition } from '../../config/hero.config';

/**
 * O herói desenhado com o visual escolhido, fora do jogo.
 *
 * Usa o mesmo pintor do motor: o boné que aparece no menu é exatamente o
 * boné que aparece na fase. A imagem vira data URL uma vez por visual.
 */
@Component({
  selector: 'app-pedro-figure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img class="figure" [src]="source()" [alt]="alt()" width="64" height="72" decoding="async" />`,
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
  readonly character = input.required<CharacterPalette>();
  /** Texto alternativo; vazio quando a figura é só decoração ao lado do nome. */
  readonly label = input<string>();

  protected readonly alt = computed(() => this.label() ?? `O ${heroDefinition(this.character().hero).name}, personagem do jogo`);

  /** Pintado em 3x: a vitrine do menu mostra o herói bem maior que no jogo. */
  protected readonly source = computed(() => paintCharacterIcon(this.character(), 3).toDataURL());
}
