import type { Plan } from '../../core/models/plan.model';
import type { ThemeColor } from '../../core/models/profile.model';

/**
 * O que está sendo pago por Pix: uma assinatura ou um passe da Temporada do
 * Pedro. O servidor confere o valor pelo produto, nunca pelo que veio da tela.
 */
export type PixProduct =
  | { readonly type: 'plan'; readonly id: Plan['id'] }
  | { readonly type: 'season-pass'; readonly id: string; readonly seasonId: string };

/** Um pedido pronto para o diálogo do Pix: produto, valor e os textos da tela. */
export interface PixOrder {
  readonly product: PixProduct;
  readonly title: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly amountInCents: number;
  /** "por mês" na assinatura; `null` para o que se paga uma vez só. */
  readonly period: string | null;
  /** O fim da frase "assim que o Pix for conferido, avisamos e …". */
  readonly releaseNote: string;
  /**
   * Pagamento ligado a uma conta conectada. O passe vale no jogo de quem
   * pagou, e a conta é também a porta do adulto: a criança não paga sozinha.
   */
  readonly requiresAccount: boolean;
}

export function planOrder(plan: Plan): PixOrder {
  return {
    product: { type: 'plan', id: plan.id },
    title: `Plano ${plan.name}`,
    emoji: plan.emoji,
    color: plan.color,
    amountInCents: plan.monthlyPriceInCents,
    period: 'por mês',
    releaseNote: 'o plano é liberado.',
    requiresAccount: false,
  };
}

/** Mesmo pedido? O produto decide; os textos e o valor vêm dele. */
export function isSameOrder(first: PixOrder, second: PixOrder): boolean {
  return first.product.type === second.product.type && first.product.id === second.product.id;
}
