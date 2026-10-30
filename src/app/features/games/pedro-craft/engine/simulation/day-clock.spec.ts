import { DayClock } from './day-clock';

const DAY_MS = 600_000;
const NIGHT_MS = 180_000;

describe('Relógio do PedroCraft', () => {
  it('começa de manhã, com luz cheia', () => {
    const clock = new DayClock(DAY_MS, NIGHT_MS);

    expect(clock.period).toBe('day');
    expect(clock.daylight).toBe(1);
  });

  it('escurece aos poucos no fim do dia e fica noite depois dele', () => {
    const clock = new DayClock(DAY_MS, NIGHT_MS);

    clock.advance(DAY_MS - 10_000);

    expect(clock.isNight).toBeFalse();
    expect(clock.daylight).toBeGreaterThan(0);
    expect(clock.daylight).toBeLessThan(1);

    clock.advance(20_000);

    expect(clock.isNight).toBeTrue();
    expect(clock.daylight).toBe(0);
  });

  it('clareia no fim da noite e dá a volta para a manhã', () => {
    const clock = new DayClock(DAY_MS, NIGHT_MS);

    clock.advance(DAY_MS + NIGHT_MS - 5_000);

    expect(clock.isNight).toBeTrue();
    expect(clock.daylight).toBeGreaterThan(0);

    clock.advance(10_000);

    expect(clock.isNight).toBeFalse();
    expect(clock.time).toBe(5_000);
  });

  it('dormir pula para o começo da manhã', () => {
    const clock = new DayClock(DAY_MS, NIGHT_MS, DAY_MS + 1_000);

    clock.skipToMorning();

    expect(clock.time).toBe(0);
    expect(clock.isNight).toBeFalse();
  });
});
