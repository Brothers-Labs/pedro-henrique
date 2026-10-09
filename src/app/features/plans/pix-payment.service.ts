import { inject, Injectable, InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';
import type { PixSettings } from '../../../environments/environment.model';
import { findPlan } from '../../core/data/plans.data';
import type { PlanId } from '../../core/models/plan.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ApiClient } from '../../core/services/api-client.service';
import { AuthService } from '../../core/services/auth.service';

/** Dados de recebimento já limpos: texto em branco conta como "não configurado". */
export const PIX_SETTINGS = new InjectionToken<PixSettings>('PIX_SETTINGS', {
  providedIn: 'root',
  factory: () => ({
    key: normalizeSetting(environment.pix.key),
    receiverName: normalizeSetting(environment.pix.receiverName),
  }),
});

export interface PixReceiptSubmission {
  readonly planId: PlanId;

  /** Para onde avisar quando o pagamento for conferido. */
  readonly email: string;
  readonly receipt: File;
}

/**
 * Pagamento das assinaturas por Pix, com conferência manual do comprovante.
 *
 * O valor enviado sai da tabela de planos, e não da tela: o que o visitante
 * escolhe é o plano. O servidor deve conferir o valor pelo plano de novo —
 * o contrato está em `docs/payments-api.md`.
 */
@Injectable({ providedIn: 'root' })
export class PixPaymentService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);

  readonly settings = inject(PIX_SETTINGS);
  readonly isApiConfigured = this.api.isConfigured;

  async submitReceipt({ planId, email, receipt }: PixReceiptSubmission): Promise<void> {
    const plan = findPlan(planId);
    const form = new FormData();

    form.append('planId', plan.id);
    form.append('amountInCents', String(plan.monthlyPriceInCents));
    form.append('email', email.trim().toLowerCase());
    form.append('receipt', receipt, receipt.name);

    await this.api.request({
      method: 'POST',
      path: '/payments/pix',
      body: form,

      // Quem já tem conta tem o pagamento ligado a ela; quem não tem é achado pelo e-mail.
      accessToken: this.auth.session()?.accessToken,
    });

    this.analytics.track({ name: 'pix_receipt_sent', properties: { planId: plan.id } });
  }
}

function normalizeSetting(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
}
