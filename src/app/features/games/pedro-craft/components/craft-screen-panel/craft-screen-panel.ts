import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { FURNACE_FUEL, FURNACE_INPUT, FURNACE_OUTPUT } from '../../engine/simulation/furnace';
import { HOTBAR_SIZE, type SlotClick } from '../../engine/simulation/inventory';
import type { CraftScreen, SlotArea, SlotRef } from '../../engine/simulation/screens';
import type { ScreenView, SlotView } from '../../models/craft-session.model';
import type { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftRecipeBook } from '../craft-recipe-book/craft-recipe-book';
import { CraftSlot } from '../craft-slot/craft-slot';
import { CraftSlotGrid, type SlotEntry, type SlotPress } from '../craft-slot-grid/craft-slot-grid';

export interface SlotRequest {
  readonly ref: SlotRef;
  readonly mode: SlotClick;
}

const TITLES: Readonly<Record<CraftScreen, { readonly emoji: string; readonly text: string }>> = {
  inventory: { emoji: '🎒', text: 'Mochila' },
  workbench: { emoji: '🛠️', text: 'Mesa de trabalho' },
  chest: { emoji: '📦', text: 'Baú' },
  furnace: { emoji: '🔥', text: 'Fornalha' },
};

/**
 * A tela por cima do mundo: mochila, mesa, baú ou fornalha.
 *
 * Em cima fica o que muda de uma tela para outra (a grade de fabricar com o
 * livro de receitas, o baú, a fornalha); embaixo, sempre a mochila com a
 * barra na última linha — o mesmo lugar em todas as telas.
 */
@Component({
  selector: 'app-craft-screen-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftSlot, CraftSlotGrid, CraftRecipeBook],
  templateUrl: './craft-screen-panel.html',
  styleUrl: './craft-screen-panel.scss',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class CraftScreenPanel {
  readonly view = input.required<ScreenView>();
  readonly icons = input.required<ItemIconCache>();

  readonly slotPressed = output<SlotRequest>();
  readonly resultTaken = output<void>();
  readonly recipeCrafted = output<string>();
  readonly closed = output<void>();

  protected readonly title = computed(() => TITLES[this.view().kind]);

  /** A mochila primeiro e a barra por último, como a barra aparece na tela de jogo: embaixo. */
  protected readonly inventoryEntries = computed(() => {
    const entries = entriesOf(this.view().inventory).map((entry) => ({ ...entry, isHighlighted: entry.index < HOTBAR_SIZE }));

    return [...entries.slice(HOTBAR_SIZE), ...entries.slice(0, HOTBAR_SIZE)];
  });

  protected readonly gridEntries = computed(() => entriesOf(this.view().grid?.cells ?? []));
  protected readonly chestEntries = computed(() => entriesOf(this.view().chest ?? []));

  /** Espaços da fornalha um a um: assar em cima, combustível embaixo, pronto ao lado. */
  protected readonly furnaceEntries = computed(() => {
    const slots = this.view().furnace?.slots ?? [];
    const single = (index: number): readonly SlotEntry[] => [{ index, slot: slots[index] ?? null }];

    return { input: single(FURNACE_INPUT), fuel: single(FURNACE_FUEL), output: single(FURNACE_OUTPUT) };
  });

  protected press(area: SlotArea, press: SlotPress): void {
    this.slotPressed.emit({ ref: { area, index: press.index }, mode: press.mode });
  }
}

function entriesOf(slots: readonly (SlotView | null)[]): readonly SlotEntry[] {
  return slots.map((slot, index) => ({ index, slot }));
}
