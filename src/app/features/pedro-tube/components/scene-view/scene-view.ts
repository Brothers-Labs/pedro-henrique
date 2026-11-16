import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { readableTextColor } from '../../engine/colors';
import type { TubeScene } from '../../models/tube.model';

/**
 * Uma cena da animação: o desenho grande no meio, a frase embaixo e a cor
 * de fundo. O tamanho acompanha a tela (unidades `cqi`), então a mesma cena
 * serve para a miniatura do card e para o player grande.
 */
@Component({
  selector: 'app-scene-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.background]': 'scene().background',
    '[style.color]': 'textColor()',
    '[attr.data-motion]': 'animate() ? scene().motion : "parado"',
  },
  template: `
    <span class="scene__emoji" aria-hidden="true">{{ scene().emoji }}</span>
    @if (scene().text) {
      <p class="scene__text">{{ scene().text }}</p>
    }
  `,
  styleUrl: './scene-view.scss',
})
export class SceneView {
  readonly scene = input.required<TubeScene>();
  /** Na miniatura a cena fica parada; no player, ela se mexe. */
  readonly animate = input(false);

  protected readonly textColor = computed(() => readableTextColor(this.scene().background));
}
