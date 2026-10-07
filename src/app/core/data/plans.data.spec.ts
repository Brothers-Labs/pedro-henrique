import { findPlan, PLAN_CAPABILITIES, PLANS } from './plans.data';

describe('PLANS', () => {
  it('oferece os três planos nos preços combinados', () => {
    expect(PLANS.map((plan) => [plan.id, plan.monthlyPriceInCents])).toEqual([
      ['essencial', 999],
      ['completo', 1999],
      ['premium', 2999],
    ]);
  });

  it('libera todas as áreas do menu em qualquer plano', () => {
    expect(PLANS.every((plan) => plan.capabilityIds.includes('all-sections'))).toBeTrue();
  });

  it('não guarda nada no Essencial', () => {
    const essential = findPlan('essencial');

    expect(essential.capabilityIds).not.toContain('account');
    expect(essential.capabilityIds).not.toContain('saved-progress');
  });

  it('dá ao Premium tudo o que o Completo tem', () => {
    const premium = findPlan('premium').capabilityIds;

    expect(findPlan('completo').capabilityIds.every((id) => premium.includes(id))).toBeTrue();
    expect(premium.length).toBe(PLAN_CAPABILITIES.length);
  });

  it('só usa recursos que existem na lista de comparação', () => {
    const known = new Set(PLAN_CAPABILITIES.map((capability) => capability.id));

    expect(PLANS.flatMap((plan) => plan.capabilityIds).every((id) => known.has(id))).toBeTrue();
  });
});
