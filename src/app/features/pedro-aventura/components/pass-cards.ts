import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { PREMIUM_PASSES } from '../config/season.config';
import type { PremiumPass } from '../models/economy.model';
import { AventuraAudio } from '../services/aventura-audio.service';
import { AventuraStore } from '../services/aventura-store.service';
import { ConfirmDialog } from './confirm-dialog';
import { formatNumber } from './format';

interface PassCardView {
  readonly pass: PremiumPass;
  readonly isOwned: boolean;
  readonly price: number;
  readonly canAfford: boolean;
}

/**
 * Os três passes lado a lado: Gratuito (sempre ativo), VIP e Luxo.
 *
 * VIP e Luxo são trocados por diamantes do jogo, com confirmação. Nada é
 * cobrado em dinheiro.
 */
@Component({
  selector: 'app-pass-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialog],
  templateUrl: './pass-cards.html',
  styleUrl: './pass-cards.scss',
})
export class PassCards {
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);

  protected readonly pending = signal<PassCardView | null>(null);
  protected readonly isSeasonActive = computed(() => this.store.seasonPhase() === 'active');
  protected readonly formatNumber = formatNumber;

  protected readonly cards = computed<readonly PassCardView[]>(() => {
    const diamonds = this.store.diamonds();

    return PREMIUM_PASSES.map((pass) => {
      const price = this.store.passPrice(pass.id);

      return { pass, isOwned: this.store.hasPass(pass.id), price, canAfford: diamonds >= price };
    });
  });

  protected readonly missing = computed(() => {
    const card = this.pending();

    return card ? Math.max(0, card.price - this.store.diamonds()) : 0;
  });

  protected ask(card: PassCardView): void {
    this.pending.set(card);
  }

  protected confirm(): void {
    const card = this.pending();

    this.pending.set(null);

    if (card && this.store.buyPass(card.pass.id)) {
      this.audio.play('unlock');
    }
  }
}
