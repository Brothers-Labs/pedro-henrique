import { inject, Injectable, InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';
import type { PixSettings } from '../../../environments/environment.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ApiClient } from '../../core/services/api-client.service';
import { AuthService } from '../../core/services/auth.service';
import type { PixOrder } from './pix-order';

/** Dados de recebimento já limpos: texto em branco conta como "não configurado". */
export const PIX_SETTINGS = new InjectionToken<PixSettings>('PIX_SETTINGS', {
  providedIn: 'root',
  factory: () => ({
    key: normalizeSetting(environment.pix.key),
    receiverName: normalizeSetting(environment.pix.receiverName),
  }),
});

export interface PixReceiptSubmission {
  readonly order: PixOrder;

  /** Para onde avisar quando o pagamento for conferido. */
  readonly email: string;
  readonly receipt: File;
}

/**
 * Pagamento por Pix (assinaturas e passes da Temporada), com conferência
 * manual do comprovante.
 *
 * O valor enviado sai das tabelas do código (planos, passes), e não da tela:
 * o que o visitante escolhe é o produto. O servidor deve conferir o valor
 * pelo produto de novo — o contrato está em `docs/payments-api.md`.
 */
@Injectable({ providedIn: 'root' })
export class PixPaymentService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);

  readonly settings = inject(PIX_SETTINGS);
  readonly isApiConfigured = this.api.isConfigured;

  async submitReceipt({ order, email, receipt }: PixReceiptSubmission): Promise<void> {
    const { product } = order;
    const accessToken = this.auth.session()?.accessToken;

    if (order.requiresAccount && !accessToken) {
      throw new Error(`Pagamento Pix: ${product.type} "${product.id}" só pode ser pago com uma conta conectada.`);
    }

    const form = new FormData();

    form.append('productType', product.type);
    form.append('productId', product.id);

    // O contrato antigo dos planos só conhecia `planId`: ele continua indo junto.
    if (product.type === 'plan') {
      form.append('planId', product.id);
    } else {
      form.append('seasonId', product.seasonId);
    }

    form.append('amountInCents', String(order.amountInCents));
    form.append('email', email.trim().toLowerCase());
    form.append('receipt', receipt, receipt.name);

    await this.api.request({
      method: 'POST',
      path: '/payments/pix',
      body: form,

      // Quem já tem conta tem o pagamento ligado a ela; quem não tem é achado pelo e-mail.
      accessToken,
    });

    this.analytics.track({ name: 'pix_receipt_sent', properties: { productType: product.type, productId: product.id } });
  }
}

function normalizeSetting(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
}
