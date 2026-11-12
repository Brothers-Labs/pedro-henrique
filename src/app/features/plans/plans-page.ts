import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { findPlan, PLAN_CAPABILITIES, PLANS } from '../../core/data/plans.data';
import { SITE_SECTIONS } from '../../core/data/site-sections.data';
import type { Plan, PlanCapabilityId, PlanId } from '../../core/models/plan.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { PixPaymentDialog } from './components/pix-payment-dialog/pix-payment-dialog';
import { type PixOrder, planOrder } from './pix-order';
import { PricePipe } from './price.pipe';

/** Linha da lista de recursos de um cartão. */
interface PlanFeatureRow {
  readonly id: PlanCapabilityId;
  readonly label: string;
  readonly isIncluded: boolean;
}

interface PlanCard {
  readonly plan: Plan;
  readonly features: readonly PlanFeatureRow[];
}

/**
 * As três assinaturas lado a lado, com todas as áreas do menu descritas em cada
 * uma e o pagamento por Pix a um toque.
 *
 * As áreas vêm de `SITE_SECTIONS`, a mesma fonte do menu: uma seção nova no
 * site aparece aqui sozinha, sem ninguém lembrar de atualizar os planos.
 */
@Component({
  selector: 'app-plans-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, PixPaymentDialog, PricePipe],
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.scss',
})
export class PlansPage {
  private readonly analytics = inject(AnalyticsService);

  protected readonly sections = SITE_SECTIONS;
  protected readonly cards: readonly PlanCard[] = PLANS.map((plan) => ({
    plan,
    features: PLAN_CAPABILITIES.map((capability) => ({
      id: capability.id,
      label: capability.label,
      isIncluded: plan.capabilityIds.includes(capability.id),
    })),
  }));

  protected readonly planOrders: readonly PixOrder[] = PLANS.map(planOrder);

  /** Plano sendo pago; com valor, o modal do Pix fica aberto. */
  protected readonly checkoutOrder = signal<PixOrder | null>(null);

  protected startCheckout(planId: PlanId): void {
    this.checkoutOrder.set(planOrder(findPlan(planId)));
    this.analytics.track({ name: 'checkout_started', properties: { planId } });
  }
}
