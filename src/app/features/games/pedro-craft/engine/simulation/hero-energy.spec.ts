import { HeroEnergy } from './hero-energy';

const SETTINGS = { max: 10, drainEveryMs: 1000, lowAt: 3 } as const;

describe('Energia do herói do PedroCraft', () => {
  it('desce um ponto a cada intervalo e para no zero', () => {
    const energy = new HeroEnergy(SETTINGS);

    expect(energy.step(999)).toBeFalse();
    expect(energy.step(1)).toBeTrue();
    expect(energy.value).toBe(9);

    for (let tick = 0; tick < 20; tick += 1) {
      energy.step(SETTINGS.drainEveryMs);
    }

    expect(energy.isEmpty).toBeTrue();
    expect(energy.value).toBe(0);
  });

  it('comer enche sem passar do máximo, e avisa quando está baixa', () => {
    const energy = new HeroEnergy(SETTINGS);

    energy.set(2);

    expect(energy.isLow).toBeTrue();
    expect(energy.eat(20)).toBe(8);
    expect(energy.isFull).toBeTrue();
  });
});
