export interface HeroEnergySettings {
  readonly max: number;
  /** Um ponto de energia vai embora a cada tanto de jogo. */
  readonly drainEveryMs: number;
  /** Abaixo disto, o jogo lembra com carinho de comer. */
  readonly lowAt: number;
}

/**
 * A energia do modo Sobrevivência gentil.
 *
 * Desce devagar com o tempo e sobe comendo. Ela nunca tira vida: quando
 * acaba, a vida só para de voltar sozinha. É um lembrete de cuidar do herói,
 * não um castigo.
 */
export class HeroEnergy {
  private current: number;
  private drainLeftMs: number;

  constructor(private readonly settings: HeroEnergySettings) {
    this.current = settings.max;
    this.drainLeftMs = settings.drainEveryMs;
  }

  get value(): number {
    return this.current;
  }

  get max(): number {
    return this.settings.max;
  }

  get isFull(): boolean {
    return this.current >= this.settings.max;
  }

  get isEmpty(): boolean {
    return this.current <= 0;
  }

  get isLow(): boolean {
    return this.current <= this.settings.lowAt;
  }

  /** Passa o tempo; devolve se a energia mudou. */
  step(elapsedMs: number): boolean {
    if (this.isEmpty) {
      return false;
    }

    this.drainLeftMs -= elapsedMs;

    if (this.drainLeftMs > 0) {
      return false;
    }

    this.drainLeftMs = this.settings.drainEveryMs;
    this.current -= 1;

    return true;
  }

  /** Comer: devolve quanto de energia voltou de verdade. */
  eat(amount: number): number {
    const before = this.current;

    this.current = Math.min(this.settings.max, this.current + Math.max(0, amount));

    return this.current - before;
  }

  /** Energia guardada no save. */
  set(value: number): void {
    this.current = Math.min(this.settings.max, Math.max(0, Math.round(value)));
  }

  restore(): void {
    this.current = this.settings.max;
    this.drainLeftMs = this.settings.drainEveryMs;
  }
}
