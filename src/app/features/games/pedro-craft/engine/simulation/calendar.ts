import type { CalendarDefinition, SeasonDefinition } from '../../models/content.model';

/**
 * Os dias do mundo e as estações.
 *
 * O dia 1 é o primeiro dia da primeira estação. Cada estação dura
 * `daysPerSeason` dias, e o ano dá a volta: depois do inverno vem a
 * primavera de novo.
 */
export class Calendar {
  private current = 1;

  constructor(
    private readonly definition: CalendarDefinition,
    day = 1,
  ) {
    this.setDay(day);
  }

  get day(): number {
    return this.current;
  }

  get season(): SeasonDefinition {
    const { seasons, daysPerSeason } = this.definition;

    return seasons[Math.floor((this.current - 1) / daysPerSeason) % seasons.length];
  }

  /** Dia da estação, de 1 a `daysPerSeason`. */
  get dayOfSeason(): number {
    return ((this.current - 1) % this.definition.daysPerSeason) + 1;
  }

  setDay(day: number): void {
    this.current = Math.max(1, Math.floor(day));
  }

  /** Vira o dia; devolve se a estação mudou junto. */
  nextDay(): boolean {
    const before = this.season;

    this.current += 1;

    return this.season !== before;
  }
}
