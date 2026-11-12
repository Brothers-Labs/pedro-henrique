import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { PixPaymentDialog } from '../../plans/components/pix-payment-dialog/pix-payment-dialog';
import type { PixOrder } from '../../plans/pix-order';
import { formatPriceInCents } from '../../plans/price.pipe';
import { PREMIUM_PASSES } from '../config/season.config';
import type { PremiumPass } from '../models/economy.model';
import { AventuraAudio } from '../services/aventura-audio.service';
import { AventuraStore } from '../services/aventura-store.service';
import { SeasonPassPurchases } from '../services/season-pass-purchases.service';
import { ConfirmDialog } from './confirm-dialog';
import { formatNumber } from './format';

interface PassCardView {
  readonly pass: PremiumPass;
  readonly isOwned: boolean;
  readonly price: number;
  readonly priceInReais: string;
  readonly canAfford: boolean;
}

/**
 * Os três passes lado a lado: Gratuito (sempre ativo), VIP e Luxo.
 *
 * VIP e Luxo saem de dois jeitos: trocando diamantes do jogo, com
 * confirmação, ou pagando em reais por Pix, com a conta de um adulto.
 */
@Component({
  selector: 'app-pass-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialog, PixPaymentDialog],
  templateUrl: './pass-cards.html',
  styleUrl: './pass-cards.scss',
})
export class PassCards {
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);
  private readonly purchases = inject(SeasonPassPurchases);

  protected readonly pending = signal<PassCardView | null>(null);
  /** Passe sendo pago em reais; com valor, o diálogo do Pix fica aberto. */
  protected readonly checkoutOrder = signal<PixOrder | null>(null);
  protected readonly isSeasonActive = computed(() => this.store.seasonPhase() === 'active');
  protected readonly formatNumber = formatNumber;

  protected readonly cards = computed<readonly PassCardView[]>(() => {
    const diamonds = this.store.diamonds();

    return PREMIUM_PASSES.map((pass) => {
      const price = this.store.passPrice(pass.id);

      return {
        pass,
        isOwned: this.store.hasPass(pass.id),
        price,
        priceInReais: formatPriceInCents(this.store.passPriceInCents(pass.id)),
        canAfford: diamonds >= price,
      };
    });
  });

  protected payInReais(card: PassCardView): void {
    this.checkoutOrder.set(this.purchases.order(card.pass.id));
  }

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
