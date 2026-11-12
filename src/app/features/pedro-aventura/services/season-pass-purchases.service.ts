import { inject, Injectable } from '@angular/core';

import { ApiClient } from '../../../core/services/api-client.service';
import { AuthService } from '../../../core/services/auth.service';
import type { PixOrder } from '../../plans/pix-order';
import { premiumPass, PREMIUM_PASSES, SEASON } from '../config/season.config';
import type { PremiumPassId } from '../models/economy.model';
import { AventuraStore } from './aventura-store.service';

const PASS_EMOJI: Readonly<Record<PremiumPassId, string>> = { vip: '🔷', luxo: '👑' };

const KNOWN_PASSES: ReadonlySet<string> = new Set(PREMIUM_PASSES.map((pass) => pass.id));

/**
 * Passes VIP e Luxo pagos em reais por Pix.
 *
 * O pagamento é conferido no servidor (`docs/payments-api.md`); este serviço
 * monta o pedido com o preço da tabela de passes e, com a conta conectada,
 * busca os passes já conferidos para liberá-los no jogo.
 */
@Injectable({ providedIn: 'root' })
export class SeasonPassPurchases {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly store = inject(AventuraStore);

  order(pass: PremiumPassId): PixOrder {
    return {
      product: { type: 'season-pass', id: pass, seasonId: SEASON.id },
      title: premiumPass(pass).name,
      emoji: PASS_EMOJI[pass],
      color: pass === 'vip' ? 'blue' : 'purple',
      amountInCents: this.store.passPriceInCents(pass),
      period: null,
      releaseNote: `o passe aparece na ${SEASON.name} da conta conectada.`,
      requiresAccount: true,
    };
  }

  /** Libera no jogo os passes já conferidos. Sem servidor ou sem conta, não há o que buscar. */
  async sync(): Promise<void> {
    const accessToken = this.auth.session()?.accessToken;

    if (!this.api.isConfigured || !accessToken) {
      return;
    }

    try {
      const response = await this.api.request({
        method: 'GET',
        path: `/payments/season-passes?seasonId=${encodeURIComponent(SEASON.id)}`,
        accessToken,
      });

      this.store.applyPurchasedPasses(parsePurchasedPasses(response));
    } catch (error) {
      // O passe pago continua no servidor: na próxima abertura do passe, a busca tenta de novo.
      console.warn('Pedro Aventura: não foi possível conferir os passes pagos.', error);
    }
  }
}

/** A resposta do servidor é entrada externa: só passam ids de passe conhecidos. */
export function parsePurchasedPasses(response: unknown): readonly PremiumPassId[] {
  if (typeof response !== 'object' || response === null || !('passes' in response) || !Array.isArray(response.passes)) {
    throw new Error('Resposta de /payments/season-passes sem a lista "passes".');
  }

  const passes: readonly unknown[] = response.passes;

  return passes.filter((pass): pass is PremiumPassId => typeof pass === 'string' && KNOWN_PASSES.has(pass));
}
