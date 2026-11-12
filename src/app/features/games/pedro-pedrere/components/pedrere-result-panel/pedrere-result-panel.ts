import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

const MAX_STARS = 3;

/**
 * Painel de fim de partida, igual em todos os modos.
 *
 * Sempre oferece jogar de novo como primeiro botão: para a criança, o fim da
 * partida é o começo da próxima.
 */
@Component({
  selector: 'app-pedrere-result-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="result" aria-live="polite" aria-labelledby="pedrere-resultado-titulo">
      <h2 id="pedrere-resultado-titulo" class="result__title">{{ heading() }}</h2>

      @if (stars() !== null) {
        <p class="result__stars" [attr.aria-label]="stars() + ' de 3 estrelas'">
          @for (isLit of starSlots(); track $index) {
            <span aria-hidden="true" [class.result__star--off]="!isLit">⭐</span>
          }
        </p>
      }

      <p class="result__message">{{ message() }}</p>

      @if (isNewRecord()) {
        <p class="result__record"><span aria-hidden="true">🏆</span> Novo recorde!</p>
      }

      <div class="result__actions">
        <button type="button" class="result__button" data-tone="green" (click)="replay.emit()">
          <span aria-hidden="true">🔁</span> Jogar de novo
        </button>
        <a class="result__button" data-tone="blue" [routerLink]="backLink()">
          <span aria-hidden="true">←</span> {{ backLabel() }}
        </a>
      </div>
    </section>
  `,
  styleUrl: './pedrere-result-panel.scss',
})
export class PedrereResultPanel {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  /** `null` nos modos que não dão estrelas. */
  readonly stars = input<number | null>(null);
  readonly isNewRecord = input(false);
  readonly backLink = input('/jogos/pedro-pedrere');
  readonly backLabel = input('Menu');

  readonly replay = output<void>();

  protected readonly starSlots = computed(() =>
    Array.from({ length: MAX_STARS }, (_, index) => index < (this.stars() ?? 0)),
  );
}
