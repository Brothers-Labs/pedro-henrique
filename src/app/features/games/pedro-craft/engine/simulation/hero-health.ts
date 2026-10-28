export interface HeroHealthSettings {
  readonly maxHealth: number;
  /** Um coração volta sozinho a cada tanto. */
  readonly regenEveryMs: number;
  /** Depois de um golpe, o herói fica um instante sem levar outro. */
  readonly invulnerableMs: number;
}

/**
 * Os corações do herói.
 *
 * Sem fome e sem punição: a vida volta sozinha com o tempo, comer acelera, e
 * zerar só leva o herói de volta para casa (quem decide isso é a simulação).
 */
export class HeroHealth {
  private current: number;
  private invulnerableLeftMs = 0;
  private regenLeftMs: number;

  constructor(private readonly settings: HeroHealthSettings) {
    this.current = settings.maxHealth;
    this.regenLeftMs = settings.regenEveryMs;
  }

  get value(): number {
    return this.current;
  }

  get max(): number {
    return this.settings.maxHealth;
  }

  get isFull(): boolean {
    return this.current >= this.settings.maxHealth;
  }

  get isDepleted(): boolean {
    return this.current <= 0;
  }

  /** Tira vida, a não ser logo depois de outro golpe. Devolve se o golpe valeu. */
  damage(amount: number): boolean {
    if (amount <= 0 || this.invulnerableLeftMs > 0 || this.isDepleted) {
      return false;
    }

    this.current = Math.max(0, this.current - amount);
    this.invulnerableLeftMs = this.settings.invulnerableMs;
    this.regenLeftMs = this.settings.regenEveryMs;

    return true;
  }

  /** Devolve quanto de vida voltou de verdade (a vida não passa do máximo). */
  heal(amount: number): number {
    const before = this.current;

    this.current = Math.min(this.settings.maxHealth, this.current + Math.max(0, amount));

    return this.current - before;
  }

  /** Vida guardada no save; fica entre 1 e o máximo. */
  set(value: number): void {
    this.current = Math.min(this.settings.maxHealth, Math.max(1, Math.round(value)));
  }

  restore(): void {
    this.current = this.settings.maxHealth;
    this.invulnerableLeftMs = 0;
    this.regenLeftMs = this.settings.regenEveryMs;
  }

  /**
   * Passa o tempo; devolve se a vida mudou (para a tela redesenhar os
   * corações). Sem `canRegenerate` (a energia acabou), a vida só não volta.
   */
  step(elapsedMs: number, canRegenerate = true): boolean {
    this.invulnerableLeftMs = Math.max(0, this.invulnerableLeftMs - elapsedMs);

    if (!canRegenerate || this.isFull || this.isDepleted) {
      return false;
    }

    this.regenLeftMs -= elapsedMs;

    if (this.regenLeftMs > 0) {
      return false;
    }

    this.regenLeftMs = this.settings.regenEveryMs;

    return this.heal(1) > 0;
  }
}
