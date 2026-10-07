import type { Plan, PlanCapability, PlanId } from '../models/plan.model';

/**
 * Recursos na ordem em que aparecem nos cartões.
 *
 * A lista é a mesma nos três planos — só muda o que está marcado —, para que
 * a comparação seja feita linha por linha.
 */
export const PLAN_CAPABILITIES: readonly PlanCapability[] = [
  { id: 'all-sections', label: 'Todas as áreas do menu liberadas' },
  { id: 'account', label: 'Conta com login e perfil' },
  { id: 'saved-progress', label: 'Progresso dos jogos salvo: níveis, pontos, medalhas e mascote' },
  { id: 'saved-creations', label: 'Desenhos, fases, pistas, vídeos e frases guardados' },
  { id: 'extra-games', label: 'Jogos extras' },
  { id: 'extra-lessons', label: 'Lições extras' },
  { id: 'full-progress-trail', label: 'Trilha completa de avanços' },
  { id: 'special-effects', label: 'Efeitos especiais e comemorações exclusivas' },
];

export const PLANS: readonly Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    emoji: '🌱',
    tagline: 'Para conhecer e brincar com tudo, sem criar conta.',
    monthlyPriceInCents: 999,
    color: 'mint',
    isRecommended: false,
    capabilityIds: ['all-sections'],
    notice: 'Nada fica salvo: os jogos sempre recomeçam do zero.',
  },
  {
    id: 'completo',
    name: 'Completo',
    emoji: '🚀',
    tagline: 'Acesso total com conta própria e tudo guardado.',
    monthlyPriceInCents: 1999,
    color: 'blue',
    isRecommended: true,
    capabilityIds: ['all-sections', 'account', 'saved-progress', 'saved-creations'],
    notice: null,
  },
  {
    id: 'premium',
    name: 'Premium',
    emoji: '👑',
    tagline: 'Tudo do Completo e ainda mais jogos, lições e efeitos.',
    monthlyPriceInCents: 2999,
    color: 'purple',
    isRecommended: false,
    capabilityIds: [
      'all-sections',
      'account',
      'saved-progress',
      'saved-creations',
      'extra-games',
      'extra-lessons',
      'full-progress-trail',
      'special-effects',
    ],
    notice: null,
  },
];

export function findPlan(id: PlanId): Plan {
  const plan = PLANS.find((candidate) => candidate.id === id);

  if (!plan) {
    throw new Error(`Plano "${id}" não existe em PLANS.`);
  }

  return plan;
}
