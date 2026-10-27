import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';

import type { SlotClick } from '../../engine/simulation/inventory';
import type { SlotView } from '../../models/craft-session.model';
import type { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftSlot } from '../craft-slot/craft-slot';

/** Um espaço da grade: a posição de verdade dele e, opcionalmente, um destaque (a barra). */
export interface SlotEntry {
  readonly index: number;
  readonly slot: SlotView | null;
  readonly isHighlighted?: boolean;
}

export interface SlotPress {
  readonly index: number;
  readonly mode: SlotClick;
}

/** Segurar o dedo isto num espaço pega metade da pilha, como o clique direito do mouse. */
const LONG_PRESS_MS = 450;

/**
 * Grade de espaços tocáveis: mochila, grade de fabricar, baú e fornalha.
 *
 * Um toque pega ou solta a pilha toda; segurar o dedo (ou o botão direito do
 * mouse) mexe em metade, ou em um só. Arrastar não é preciso — e por isso
 * funciona igual com o dedo e com o mouse.
 */
@Component({
  selector: 'app-craft-slot-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftSlot],
  template: `
    <div class="grid" role="group" [attr.aria-label]="label()" [style.--columns]="columns()">
      @for (entry of entries(); track entry.index) {
        <button
          type="button"
          class="slot"
          [class.slot--highlighted]="entry.isHighlighted"
          [attr.aria-label]="icons().describe(entry.slot)"
          (click)="click(entry.index)"
          (contextmenu)="clickOne(entry.index, $event)"
          (pointerdown)="startPress(entry.index, $event)"
          (pointerup)="cancelPress()"
          (pointerleave)="cancelPress()"
          (pointercancel)="cancelPress()"
        >
          <app-craft-slot [slot]="entry.slot" [icons]="icons()" />
        </button>
      }
    </div>
  `,
  styleUrl: './craft-slot-grid.scss',
})
export class CraftSlotGrid {
  readonly entries = input.required<readonly SlotEntry[]>();
  readonly columns = input.required<number>();
  readonly label = input.required<string>();
  readonly icons = input.required<ItemIconCache>();

  readonly pressed = output<SlotPress>();

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
      this.pressed.emit({ index, mode: 'one' });
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

    this.pressed.emit({ index, mode: 'all' });
  }

  protected clickOne(index: number, event: Event): void {
    event.preventDefault();
    this.pressed.emit({ index, mode: 'one' });
  }
}
