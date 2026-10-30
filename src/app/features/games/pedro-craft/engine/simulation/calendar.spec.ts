import type { CraftCatalog } from '../../content/craft-catalog';
import type { SeasonDefinition } from '../../models/content.model';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { Calendar } from './calendar';
import { DayClock } from './day-clock';
import { Weather } from './weather';

describe('Calendário e clima do PedroCraft', () => {
  let catalog: CraftCatalog;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  it('começa no dia 1 da primeira estação e vira a estação depois dos dias dela', () => {
    const definition = catalog.world.calendar;
    const calendar = new Calendar(definition);

    expect(calendar.day).toBe(1);
    expect(calendar.season.id).toBe('spring');

    let changes = 0;

    for (let day = 1; day < definition.daysPerSeason; day += 1) {
      changes += calendar.nextDay() ? 1 : 0;
    }

    expect(changes).toBe(0);
    expect(calendar.dayOfSeason).toBe(definition.daysPerSeason);
    expect(calendar.nextDay()).toBeTrue();
    expect(calendar.season.id).toBe('summer');
    expect(calendar.dayOfSeason).toBe(1);
  });

  it('depois do inverno o ano dá a volta para a primavera', () => {
    const definition = catalog.world.calendar;
    const calendar = new Calendar(definition, definition.daysPerSeason * definition.seasons.length);

    expect(calendar.season.id).toBe('winter');
    expect(calendar.nextDay()).toBeTrue();
    expect(calendar.season.id).toBe('spring');
  });

  it('a lua cheia vem a cada tantas noites', () => {
    const every = catalog.world.calendar.fullMoonEvery;

    expect(new Calendar(catalog.world.calendar, every - 1).isFullMoon).toBeFalse();
    expect(new Calendar(catalog.world.calendar, every).isFullMoon).toBeTrue();
  });

  it('o relógio conta as manhãs e muda a duração do dia na estação nova', () => {
    const clock = new DayClock(1000, 500);

    expect(clock.advance(1400)).toBe(0);
    expect(clock.advance(200)).toBe(1);
    expect(clock.partOfDay).toBe('morning');

    clock.setDurations(2000, 500);
    clock.advance(1500);

    expect(clock.isNight).toBeFalse();
    expect(clock.partOfDay).toBe('afternoon');
  });

  it('o clima segue as chances da estação e a chuva para sozinha', () => {
    const season = (rain: number, snow: number): SeasonDefinition => ({ ...catalog.world.calendar.seasons[0], rain, snow });
    const rolls = [0.1, 0.5, 0.95];
    const weather = new Weather(() => rolls.shift() ?? 0.5);

    weather.newDay(season(0.3, 0));
    expect(weather.current).toBe('rain');

    weather.step(10 * 60_000);
    expect(weather.current).toBe('clear');

    weather.newDay(season(0, 0.2));
    expect(weather.current).toBe('clear');
  });
});
