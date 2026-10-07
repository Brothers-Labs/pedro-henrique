import type { ThemeColor } from './profile.model';

export type PlanId = 'essencial' | 'completo' | 'premium';

export type PlanCapabilityId =
  | 'all-sections'
  | 'account'
  | 'saved-progress'
  | 'saved-creations'
  | 'extra-games'
  | 'extra-lessons'
  | 'full-progress-trail'
  | 'special-effects';

/** Recurso comparável entre os planos. */
export interface PlanCapability {
  readonly id: PlanCapabilityId;
  readonly label: string;
}

/** Assinatura mensal oferecida na página de planos. */
export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly emoji: string;
  readonly tagline: string;

  /** Preço mensal em centavos, para nunca fazer conta de dinheiro com ponto flutuante. */
  readonly monthlyPriceInCents: number;
  readonly color: ThemeColor;
  readonly isRecommended: boolean;
  readonly capabilityIds: readonly PlanCapabilityId[];

  /** Aviso sobre um limite importante do plano, mostrado em destaque no cartão. */
  readonly notice: string | null;
}
