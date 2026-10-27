import type { GoalDefinition, GoalTriggerType } from '../../models/content.model';

/** Algo que aconteceu no mundo e pode avançar a missão da vez. */
export interface GoalEvent {
  readonly trigger: GoalTriggerType;
  /** Item, bloco, plantação ou criatura; `null` para dormir. */
  readonly target: string | null;
  readonly count: number;
}

/** Onde a criança está na lista de missões: a missão da vez e quanto já fez dela. */
export interface GoalProgress {
  readonly index: number;
  readonly amount: number;
}

export const NO_GOAL_PROGRESS: GoalProgress = { index: 0, amount: 0 };

/**
 * Missões em fila, uma de cada vez.
 *
 * Uma criança pequena se perde com uma lista de dez tarefas; com uma só, sabe
 * exatamente o que fazer agora. O progresso conta a partir de quando a missão
 * começou: os troncos que já estavam na mochila não valem para "quebre 3
 * troncos".
 */
export class GoalTracker {
  private index: number;
  private amount: number;

  constructor(
    private readonly goals: readonly GoalDefinition[],
    progress: GoalProgress = NO_GOAL_PROGRESS,
  ) {
    this.index = Math.max(0, Math.min(goals.length, progress.index));
    this.amount = this.index < goals.length ? Math.max(0, progress.amount) : 0;
  }

  get current(): GoalDefinition | null {
    return this.goals[this.index] ?? null;
  }

  get progress(): GoalProgress {
    return { index: this.index, amount: this.amount };
  }

  get completedCount(): number {
    return this.index;
  }

  /** Conta o evento na missão da vez. Devolve a missão quando ela acaba de ser cumprida. */
  record(event: GoalEvent): GoalDefinition | null {
    const goal = this.current;

    if (!goal || goal.trigger !== event.trigger || goal.target !== event.target) {
      return null;
    }

    this.amount += event.count;

    if (this.amount < goal.count) {
      return null;
    }

    this.index += 1;
    this.amount = 0;

    return goal;
  }
}
