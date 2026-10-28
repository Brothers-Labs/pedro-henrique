import type { SeasonDefinition } from '../../models/content.model';

export type WeatherKind = 'clear' | 'rain' | 'snow';

/** Quanto dura uma chuva ou uma neve: o bastante para regar, pouco para cansar. */
const SPELL_MS = { min: 60_000, max: 180_000 } as const;

/**
 * O tempo lá fora.
 *
 * A cada manhã a estação sorteia se vai chover ou nevar. A chuva rega as
 * plantações que estão a céu aberto. Nada de trovão: é uma chuva calma.
 */
export class Weather {
  private kind: WeatherKind = 'clear';
  private leftMs = 0;

  constructor(private readonly random: () => number) {}

  get current(): WeatherKind {
    return this.kind;
  }

  get isRaining(): boolean {
    return this.kind === 'rain';
  }

  /** Sorteio da manhã: chuva primeiro, neve depois, senão céu limpo. */
  newDay(season: SeasonDefinition): void {
    const roll = this.random();

    if (roll < season.rain) {
      this.start('rain');
    } else if (roll < season.rain + season.snow) {
      this.start('snow');
    } else {
      this.clear();
    }
  }

  /** Passa o tempo; devolve se o tempo mudou (a chuva parou). */
  step(elapsedMs: number): boolean {
    if (this.kind === 'clear') {
      return false;
    }

    this.leftMs -= elapsedMs;

    if (this.leftMs > 0) {
      return false;
    }

    this.clear();

    return true;
  }

  clear(): void {
    this.kind = 'clear';
    this.leftMs = 0;
  }

  private start(kind: WeatherKind): void {
    this.kind = kind;
    this.leftMs = SPELL_MS.min + this.random() * (SPELL_MS.max - SPELL_MS.min);
  }
}
