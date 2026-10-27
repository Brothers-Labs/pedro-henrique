import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { SlotView } from '../../models/craft-session.model';
import type { ItemIconCache } from '../../presentation/item-icon-cache';

/**
 * Um quadradinho de item: ícone, quantidade e o quanto resta da ferramenta.
 *
 * É só o desenho — quem usa decide o que o toque faz (escolher na barra,
 * pegar na mochila). Por isso é um `<span>` dentro do botão de quem usa.
 */
@Component({
  selector: 'app-craft-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (slot(); as content) {
      <img class="slot__icon" [src]="icons().url(content.item)" alt="" draggable="false" />
      @if (content.count > 1) {
        <span class="slot__count">{{ content.count }}</span>
      }
      @if (content.wear !== null) {
        <span class="slot__wear" aria-hidden="true">
          <span class="slot__wear-fill" [style.width.%]="content.wear * 100" [attr.data-low]="content.wear < 0.25"></span>
        </span>
      }
    }
  `,
  styleUrl: './craft-slot.scss',
})
export class CraftSlot {
  readonly slot = input.required<SlotView | null>();
  readonly icons = input.required<ItemIconCache>();
}
