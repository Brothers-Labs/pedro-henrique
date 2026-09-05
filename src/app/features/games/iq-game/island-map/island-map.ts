import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { IqIslandProgress, IqIslandState } from '../../../../core/models/iq-game.model';

/** Texto que acompanha cada estado; a cor sozinha nunca conta a história. */
const STATE_LABELS: Readonly<Record<IqIslandState, string>> = {
  concluida: 'Concluída',
  atual: 'Você está aqui',
  disponivel: 'Liberada',
  bloqueada: 'Ainda fechada',
  recompensa: 'Recompensa aberta',
};

/**
 * Mapa da jornada do Desafio da Mente.
 *
 * É um componente só de apresentação: recebe as etapas já resolvidas pelo motor
 * e avisa o pai quando a criança entra na etapa liberada.
 */
@Component({
  selector: 'app-island-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './island-map.html',
  styleUrl: './island-map.scss',
})
export class IslandMap {
  readonly islands = input.required<readonly IqIslandProgress[]>();
  /** Desafios já respondidos na etapa atual, para o progresso por ilha. */
  readonly currentDone = input(0);
  readonly currentTotal = input(0);

  readonly entered = output<number>();

  protected readonly stateLabels = STATE_LABELS;

  protected enter(step: IqIslandProgress): void {
    if (step.state === 'atual' || step.state === 'disponivel') {
      this.entered.emit(step.index);
    }
  }

  protected ariaLabelFor(step: IqIslandProgress): string {
    return `${step.island.name}. ${STATE_LABELS[step.state]}.`;
  }
}
