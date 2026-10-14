import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DIFFICULTIES, difficultyOption } from '../../config/runner.config';
import type { FlashDifficulty } from '../../models/runner.model';
import { FlashProgressService } from '../../services/flash-progress.service';

/**
 * Escolha da dificuldade, logo antes de correr.
 *
 * Fica nas telas de fases e de batalha, e não escondida num menu de
 * configurações: é a última escolha antes da largada, quando ela mais
 * importa. A escolha vale na hora e fica guardada.
 */
@Component({
  selector: 'app-flash-difficulty-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="difficulty" aria-labelledby="dificuldade-flash-titulo">
      <h2 id="dificuldade-flash-titulo" class="difficulty__title">Dificuldade</h2>
      <div class="difficulty__options" role="radiogroup" aria-labelledby="dificuldade-flash-titulo">
        @for (option of options; track option.id) {
          <button
            type="button"
            class="difficulty__option"
            role="radio"
            [attr.aria-checked]="selected() === option.id"
            [class.difficulty__option--active]="selected() === option.id"
            (click)="choose(option.id)"
          >
            <span aria-hidden="true">{{ option.emoji }}</span> {{ option.label }}
          </button>
        }
      </div>
      <p class="difficulty__hint">{{ description() }}</p>
    </section>
  `,
  styleUrl: './flash-difficulty-picker.scss',
})
export class FlashDifficultyPicker {
  private readonly progress = inject(FlashProgressService);

  protected readonly options = DIFFICULTIES;
  protected readonly selected = this.progress.difficulty;
  protected readonly description = computed(() => difficultyOption(this.selected()).description);

  protected choose(difficulty: FlashDifficulty): void {
    this.progress.chooseDifficulty(difficulty);
  }
}
