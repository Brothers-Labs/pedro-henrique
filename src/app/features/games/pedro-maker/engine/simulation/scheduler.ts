interface ScheduledAction {
  readonly at: number;
  readonly action: () => void;
}

/**
 * "Faça isto daqui a tanto tempo", no relógio da partida.
 *
 * Anda só quando a simulação anda: com o jogo pausado, a vitória não chega
 * sozinha e a plataforma que sumiu não volta antes da hora.
 */
export class Scheduler {
  private readonly pending: ScheduledAction[] = [];

  after(now: number, delayMs: number, action: () => void): void {
    this.pending.push({ at: now + delayMs, action });
  }

  run(now: number): void {
    // Roda a cada passo: sem nada vencido, sai sem criar lista nenhuma.
    if (!this.pending.some((entry) => entry.at <= now)) {
      return;
    }

    // Em duas etapas: uma ação pode agendar outra, e a nova espera o próximo passo.
    const due = this.pending.filter((entry) => entry.at <= now);

    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      if (this.pending[index].at <= now) {
        this.pending.splice(index, 1);
      }
    }

    for (const entry of due) {
      entry.action();
    }
  }
}
