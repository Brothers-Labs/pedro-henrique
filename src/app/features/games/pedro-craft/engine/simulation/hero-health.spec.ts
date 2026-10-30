import { HeroHealth } from './hero-health';

const SETTINGS = { maxHealth: 10, regenEveryMs: 5000, invulnerableMs: 800 } as const;

describe('Vida do herói do PedroCraft', () => {
  let health: HeroHealth;

  beforeEach(() => {
    health = new HeroHealth(SETTINGS);
  });

  it('começa cheia', () => {
    expect(health.value).toBe(SETTINGS.maxHealth);
    expect(health.isFull).toBeTrue();
  });

  it('um golpe logo depois do outro não conta', () => {
    expect(health.damage(2)).toBeTrue();
    expect(health.damage(2)).toBeFalse();
    expect(health.value).toBe(8);

    health.step(SETTINGS.invulnerableMs);

    expect(health.damage(2)).toBeTrue();
    expect(health.value).toBe(6);
  });

  it('a vida volta sozinha, um coração por vez, até o máximo', () => {
    health.damage(1);

    expect(health.step(SETTINGS.regenEveryMs - 1)).toBeFalse();
    expect(health.step(1)).toBeTrue();
    expect(health.isFull).toBeTrue();
    expect(health.step(SETTINGS.regenEveryMs)).toBeFalse();
  });

  it('comer não passa do máximo', () => {
    health.damage(1);

    expect(health.heal(5)).toBe(1);
    expect(health.value).toBe(SETTINGS.maxHealth);
  });

  it('zerada, fica esgotada até ser restaurada', () => {
    health.damage(SETTINGS.maxHealth + 5);

    expect(health.isDepleted).toBeTrue();
    expect(health.step(SETTINGS.regenEveryMs)).toBeFalse();

    health.restore();

    expect(health.isFull).toBeTrue();
  });
});
