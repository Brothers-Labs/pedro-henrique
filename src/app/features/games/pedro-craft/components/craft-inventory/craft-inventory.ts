import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output } from '@angular/core';

import { HOTBAR_SIZE, type SlotClick } from '../../engine/simulation/inventory';
import type { InventoryView } from '../../models/craft-session.model';
import type { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftSlot } from '../craft-slot/craft-slot';

export interface SlotClickRequest {
  readonly index: number;
  readonly mode: SlotClick;
}

/** Segurar o dedo isto num espaço pega metade da pilha, como o clique direito do mouse. */
const LONG_PRESS_MS = 450;

/**
 * A mochila: os 27 espaços de guardar e a barra embaixo.
 *
 * Um toque pega a pilha; outro toque, num espaço, solta. Segurar o dedo (ou
 * o botão direito do mouse) pega metade, e com algo na mão, solta só um.
 * Arrastar não é preciso — e por isso funciona igual com o dedo e o mouse.
 */
@Component({
  selector: 'app-craft-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftSlot],
  templateUrl: './craft-inventory.html',
  styleUrl: './craft-inventory.scss',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class CraftInventory {
  readonly view = input.required<InventoryView>();
  readonly icons = input.required<ItemIconCache>();

  readonly slotClicked = output<SlotClickRequest>();
  readonly closed = output<void>();

  /** A mochila primeiro e a barra por último, como a barra aparece na tela de jogo: embaixo. */
  protected readonly slots = computed(() => {
    const entries = this.view().slots.map((slot, index) => ({ index, slot, isHotbar: index < HOTBAR_SIZE }));

    return [...entries.slice(HOTBAR_SIZE), ...entries.slice(0, HOTBAR_SIZE)];
  });

  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private wasLongPress = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelPress());
  }

  protected startPress(index: number, event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      return;
    }

    this.wasLongPress = false;
    this.cancelPress();
    this.pressTimer = setTimeout(() => {
      this.pressTimer = null;
      this.wasLongPress = true;
      this.slotClicked.emit({ index, mode: 'one' });
    }, LONG_PRESS_MS);
  }

  protected cancelPress(): void {
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  protected click(index: number): void {
    this.cancelPress();

    // O toque longo já agiu; o clique que vem atrás dele não pode agir de novo.
    if (this.wasLongPress) {
      this.wasLongPress = false;
      return;
    }

    this.slotClicked.emit({ index, mode: 'all' });
  }

  protected clickOne(index: number, event: Event): void {
    event.preventDefault();
    this.slotClicked.emit({ index, mode: 'one' });
  }
}
