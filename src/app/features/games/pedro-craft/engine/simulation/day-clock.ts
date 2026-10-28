import type { SpawnPeriod } from '../../models/content.model';

/** Quanto dura o pôr do sol e o nascer do sol: a luz muda devagar, sem susto. */
const TWILIGHT_MS = 20000;

/** O dia vira tarde depois desta fração da parte clara: manhã, tarde e noite para a criança. */
const MORNING_SHARE = 0.35;

export type PartOfDay = 'morning' | 'afternoon' | 'night';

/**
 * O relógio do mundo: um dia longo e uma noite curta, em volta.
 *
 * O tempo zero é o começo da manhã. A luz (`daylight`) vai de 0, a noite
 * funda, a 1, o meio do dia, e passa pelo crepúsculo sem pular. A duração do
 * dia e da noite muda com a estação, sempre na virada da manhã.
 */
export class DayClock {
  private timeMs = 0;

  constructor(
    private dayMs: number,
    private nightMs: number,
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

  get partOfDay(): PartOfDay {
    if (this.isNight) {
      return 'night';
    }

    return this.timeMs < this.dayMs * MORNING_SHARE ? 'morning' : 'afternoon';
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

  /** Troca a duração do dia e da noite (a estação mudou), mantendo a hora dentro do ciclo novo. */
  setDurations(dayMs: number, nightMs: number): void {
    this.dayMs = dayMs;
    this.nightMs = nightMs;
    this.setTime(this.timeMs);
  }

  /** Passa o tempo; devolve quantas manhãs começaram (para o calendário virar o dia). */
  advance(elapsedMs: number): number {
    const total = this.timeMs + elapsedMs;

    this.timeMs = total % this.cycleMs;

    return Math.floor(total / this.cycleMs);
  }

  /** Dormir pula o resto da noite: acorda-se no começo da manhã. */
  skipToMorning(): void {
    this.timeMs = 0;
  }
}
