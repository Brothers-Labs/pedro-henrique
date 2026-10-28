import type { SpawnPeriod } from '../../models/content.model';

/** Quanto dura o pôr do sol e o nascer do sol: a luz muda devagar, sem susto. */
const TWILIGHT_MS = 20000;

/**
 * O relógio do mundo: um dia longo e uma noite curta, em volta.
 *
 * O tempo zero é o começo da manhã. A luz (`daylight`) vai de 0, a noite
 * funda, a 1, o meio do dia, e passa pelo crepúsculo sem pular.
 */
export class DayClock {
  private timeMs = 0;

  constructor(
    private readonly dayMs: number,
    private readonly nightMs: number,
    startMs = 0,
  ) {
    this.setTime(startMs);
  }

  get cycleMs(): number {
    return this.dayMs + this.nightMs;
  }

  /** Quanto do ciclo já passou, em milissegundos desde o começo da manhã. */
  get time(): number {
    return this.timeMs;
  }

  get period(): SpawnPeriod {
    return this.timeMs < this.dayMs ? 'day' : 'night';
  }

  get isNight(): boolean {
    return this.period === 'night';
  }

  /** De 0 (noite) a 1 (dia), com o crepúsculo no fim do dia e o amanhecer no fim da noite. */
  get daylight(): number {
    const time = this.timeMs;

    if (time < this.dayMs - TWILIGHT_MS) {
      return 1;
    }

    if (time < this.dayMs) {
      return (this.dayMs - time) / TWILIGHT_MS;
    }

    const untilMorning = this.cycleMs - time;

    return untilMorning < TWILIGHT_MS ? 1 - untilMorning / TWILIGHT_MS : 0;
  }

  /** Volta a hora guardada no save. */
  setTime(timeMs: number): void {
    this.timeMs = ((timeMs % this.cycleMs) + this.cycleMs) % this.cycleMs;
  }

  advance(elapsedMs: number): void {
    this.timeMs = (this.timeMs + elapsedMs) % this.cycleMs;
  }

  /** Dormir pula o resto da noite: acorda-se no começo da manhã. */
  skipToMorning(): void {
    this.timeMs = 0;
  }
}
