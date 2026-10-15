import { ChangeDetectionStrategy, Component, computed, effect, type ElementRef, input, output, viewChild } from '@angular/core';

import { formatNumber, formatStopwatch } from '../../components/format';
import type { RunSummary } from '../../rules/aventura-game';
import type { ObjectiveStatus } from '../../rules/campaign';
import type { RunHud } from '../../simulation/run-simulation';

export type RunDialogMode = 'paused' | 'victory' | 'defeat';

/**
 * Os três diálogos da fase: pausa, vitória e derrota.
 *
 * É um `<dialog>` nativo: o foco vai para o primeiro botão, o Esc continua o
 * jogo na pausa, e o teclado nunca fica preso atrás da cena.
 */
@Component({
  selector: 'app-run-result-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './run-result-dialog.html',
  styleUrl: './run-result-dialog.scss',
})
export class RunResultDialog {
  readonly mode = input<RunDialogMode | null>(null);
  readonly summary = input<RunSummary | null>(null);
  readonly objectives = input<readonly ObjectiveStatus[]>([]);
  readonly hud = input.required<RunHud>();
  readonly hasNext = input(false);

  readonly resumed = output<void>();
  readonly continued = output<void>();
  readonly restarted = output<void>();
  readonly exited = output<void>();
  readonly nextChosen = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly formatNumber = formatNumber;
  protected readonly formatStopwatch = formatStopwatch;
  protected readonly starSlots = computed(() => {
    const stars = this.summary()?.stars ?? 0;

    return [1, 2, 3].map((slot) => slot <= stars);
  });

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      const isOpen = this.mode() !== null;

      if (isOpen && !element.open) {
        element.showModal();
      } else if (!isOpen && element.open) {
        element.close();
      }
    });
  }

  /** Esc fecha o diálogo nativo; na pausa isso vale como "continuar". */
  protected onCancel(event: Event): void {
    event.preventDefault();

    if (this.mode() === 'paused') {
      this.resumed.emit();
    }
  }
}
