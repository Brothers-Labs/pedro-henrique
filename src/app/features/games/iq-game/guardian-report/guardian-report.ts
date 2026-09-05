import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import {
  IQ_GUARDIAN_DISCLAIMER,
  IQ_SKILL_FULL_LABELS,
} from '../../../../core/data/iq-game.data';
import type {
  IqGuardianReport,
  IqJourneyRecord,
  IqSkillScore,
} from '../../../../core/models/iq-game.model';

/** Um indicador do relatório, já pronto para virar barra na tela. */
interface SkillIndicator {
  readonly label: string;
  readonly score: IqSkillScore;
  readonly percentage: number;
}

/**
 * Leitura do desempenho para os responsáveis.
 *
 * Componente só de apresentação. O aviso educativo é parte fixa da tela, e não
 * um detalhe opcional: nada aqui é diagnóstico.
 */
@Component({
  selector: 'app-guardian-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './guardian-report.html',
  styleUrl: './guardian-report.scss',
})
export class GuardianReport {
  readonly report = input.required<IqGuardianReport>();
  readonly history = input<readonly IqJourneyRecord[]>([]);

  readonly closed = output<void>();

  protected readonly disclaimer = IQ_GUARDIAN_DISCLAIMER;
  protected readonly skillLabels = IQ_SKILL_FULL_LABELS;

  protected readonly indicators = computed<readonly SkillIndicator[]>(() =>
    this.report().summary.skills.map((score) => ({
      label: IQ_SKILL_FULL_LABELS[score.skill],
      score,
      percentage: Math.round(score.accuracy * 100),
    })),
  );

  /** Jornadas anteriores a esta, que já entram no histórico comparativo. */
  protected readonly previousJourneys = computed(() =>
    this.history().filter((record) => record.completedAt !== this.report().evaluatedAt),
  );

  protected close(): void {
    this.closed.emit();
  }
}
