import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { CraftHudState } from '../../models/craft-session.model';
import type { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftSlot } from '../craft-slot/craft-slot';

/** Item recolhido, mostrado por um instante no canto da tela. */
export interface PickupNotice {
  readonly key: number;
  readonly item: string;
  readonly count: number;
}

/**
 * O que fica por cima do mundo enquanto se joga: a missão da vez, a barra de
 * itens e os itens que acabaram de entrar na mochila.
 *
 * A barra é tocável: no tablet, escolher a picareta é um toque nela.
 */
@Component({
  selector: 'app-craft-hud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftSlot],
  templateUrl: './craft-hud.html',
  styleUrl: './craft-hud.scss',
})
export class CraftHud {
  readonly hud = input.required<CraftHudState | null>();
  readonly icons = input.required<ItemIconCache>();
  readonly pickups = input<readonly PickupNotice[]>([]);

  readonly slotSelected = output<number>();
}
