import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { MATH_TIER_LABELS } from '../../../../core/data/math-game.data';
import type { MathTrailStep } from '../../../../core/models/math-game.model';
import { MAX_STARS } from '../math-game.logic';

/**
 * Mapa da trilha de matemática.
 *
 * É um componente só de apresentação: recebe as paradas já prontas e avisa o pai
 * quando a criança escolhe uma fase liberada.
 */
@Component({
  selector: 'app-trail-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trail-map.html',
  styleUrl: './trail-map.scss',
})
export class TrailMap {
  readonly steps = input.required<readonly MathTrailStep[]>();
  readonly isFinished = input(false);

  readonly selected = output<number>();

  /** Uma estrela por posição, para desenhar as vazias junto das conquistadas. */
  protected readonly starSlots = Array.from({ length: MAX_STARS }, (_, index) => index + 1);
  protected readonly tierLabels = MATH_TIER_LABELS;

  protected chooseStep(step: MathTrailStep): void {
    if (step.isUnlocked) {
      this.selected.emit(step.index);
    }
  }

  protected ariaLabelFor(step: MathTrailStep): string {
    const position = `Fase ${step.index + 1}`;

    if (!step.isUnlocked) {
      return `${position}, ainda trancada`;
    }
    if (step.isCompleted) {
      return `${position}, concluída com ${step.stars} de ${MAX_STARS} estrelas`;
    }

    return `${position}, liberada`;
  }
}
