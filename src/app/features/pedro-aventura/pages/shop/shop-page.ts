import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConfirmDialog } from '../../components/confirm-dialog';
import { formatNumber } from '../../components/format';
import { COSMETIC_SLOTS, COSMETICS, RARITY_LABEL } from '../../config/cosmetics.config';
import type { Cosmetic } from '../../models/economy.model';
import { balanceOf } from '../../rules/wallet';
import { AventuraAudio } from '../../services/aventura-audio.service';
import { AventuraStore } from '../../services/aventura-store.service';

const CURRENCY_LABEL = { coins: 'moedas', diamonds: 'diamantes' } as const;
const CURRENCY_EMOJI = { coins: '🪙', diamonds: '💎' } as const;

/**
 * Loja do evento: roupas, visuais do Rex e veículos, trocados por moedas ou
 * diamantes do jogo. Nada é vendido por dinheiro.
 */
@Component({
  selector: 'app-shop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './shop-page.html',
  styleUrls: ['../page.scss', './shop-page.scss'],
})
export class ShopPage {
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);

  protected readonly rarityLabel = RARITY_LABEL;
  protected readonly currencyEmoji = CURRENCY_EMOJI;
  protected readonly formatNumber = formatNumber;
  protected readonly pending = signal<Cosmetic | null>(null);

  protected readonly sections = computed(() => {
    // Lido para a vitrine atualizar quando algo é comprado.
    const owned = this.store.inventory().owned;

    return COSMETIC_SLOTS.map((slot) => ({
      slot,
      items: COSMETICS.filter((cosmetic) => cosmetic.slot === slot.id && cosmetic.price !== null).map((cosmetic) => ({
        cosmetic,
        isOwned: owned.includes(cosmetic.id),
      })),
    }));
  });

  protected readonly pendingMessage = computed(() => {
    const cosmetic = this.pending();

    if (!cosmetic?.price) {
      return '';
    }

    const { currency, amount } = cosmetic.price;
    const balance = balanceOf(this.store.snapshot().wallet, currency);

    return balance >= amount
      ? `Trocar ${formatNumber(amount)} ${CURRENCY_LABEL[currency]} por ${cosmetic.name}?`
      : `Faltam ${formatNumber(amount - balance)} ${CURRENCY_LABEL[currency]} para ${cosmetic.name}. Elas aparecem nas fases e nas missões!`;
  });

  protected readonly canAffordPending = computed(() => {
    const cosmetic = this.pending();

    return cosmetic?.price ? balanceOf(this.store.snapshot().wallet, cosmetic.price.currency) >= cosmetic.price.amount : false;
  });

  protected confirm(): void {
    const cosmetic = this.pending();

    this.pending.set(null);

    if (cosmetic && this.store.buyCosmetic(cosmetic.id)) {
      this.audio.play('claim');
    }
  }
}
