import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { FirstStep } from '../../engine/simulation/first-steps';
import type { CraftHudState } from '../../models/craft-session.model';
import { HELP_CONTROLS, type HelpControl } from '../../presentation/help-topics';
import type { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftSlot } from '../craft-slot/craft-slot';

/** Item recolhido, mostrado por um instante no canto da tela. */
export interface PickupNotice {
  readonly key: number;
  readonly item: string;
  readonly count: number;
}

/** O cartão de cada gesto do guia do primeiro minuto. */
const FIRST_STEP_CARDS: Readonly<Record<FirstStep, { readonly emoji: string; readonly text: string; readonly control: HelpControl }>> = {
  move: { emoji: '🚶', text: 'Vamos andar!', control: 'move' },
  look: { emoji: '👀', text: 'Agora olhe em volta.', control: 'look' },
  jump: { emoji: '🦘', text: 'Agora pule!', control: 'jump' },
  break: { emoji: '🌳', text: 'Mire numa árvore e quebre um pedaço do tronco.', control: 'break' },
};

/**
 * O que fica por cima do mundo enquanto se joga: a missão da vez, os
 * corações, a barra de itens, o guia do primeiro minuto e os itens que
 * acabaram de entrar na mochila.
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
  /** No tablet o guia fala dos botões da tela; no computador, das teclas. */
  readonly isTouch = input(false);

  readonly slotSelected = output<number>();
  /** Tocar no cartão da missão pede para ouvir a missão. */
  readonly goalPressed = output<void>();
  readonly firstStepsSkipped = output<void>();

  protected readonly firstStepCard = computed(() => {
    const step = this.hud()?.firstStep ?? null;

    if (!step) {
      return null;
    }

    const card = FIRST_STEP_CARDS[step];
    const control = HELP_CONTROLS[card.control];

    return { ...card, how: this.isTouch() ? control.touch : control.keyboard };
  });

  /** Um coração por ponto de vida: cheio ou vazio. */
  protected readonly hearts = computed<readonly boolean[]>(() => {
    const state = this.hud();

    return state ? Array.from({ length: state.maxHealth }, (_, index) => index < state.health) : [];
  });
}
