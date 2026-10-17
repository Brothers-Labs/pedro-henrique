import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { type Difficulty, DIFFICULTIES, difficultyById } from '../config/difficulty.config';
import { AventuraAudio } from '../services/aventura-audio.service';
import { AventuraStore } from '../services/aventura-store.service';

/**
 * Escolha de dificuldade: Fácil, Médio ou Difícil.
 *
 * Vale para as próximas partidas e fica salva no aparelho. Uma corrida em
 * andamento não muda: a fase guarda a dificuldade com que começou.
 */
@Component({
  selector: 'app-difficulty-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker" role="radiogroup" aria-label="Dificuldade">
      @for (option of options; track option.id) {
        <button
          type="button"
          role="radio"
          class="picker__option"
          [class.picker__option--active]="selected().id === option.id"
          [attr.aria-checked]="selected().id === option.id"
          (click)="choose(option.id)"
        >
          <span aria-hidden="true">{{ option.emoji }}</span> {{ option.label }}
        </button>
      }
    </div>
    @if (showDescription()) {
      <p class="picker__hint">{{ selected().description }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 0.4rem;
      justify-items: center;
    }

    .picker {
      display: inline-flex;
      gap: 0.25rem;
      padding: 0.25rem;
      border: 1px solid var(--av-line);
      border-radius: 999px;
      background: rgb(10 10 20 / 70%);
    }

    .picker__option {
      min-height: 2.75rem;
      padding: 0.35rem 0.9rem;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--av-text-soft);
      font-family: var(--font-display);
      font-weight: 800;
      cursor: pointer;
    }

    .picker__option--active {
      background: linear-gradient(180deg, #ffe08a, var(--av-gold) 50%, var(--av-gold-deep));
      color: #1a1206;
    }

    .picker__option:focus-visible {
      outline: 3px solid var(--av-blue);
      outline-offset: 2px;
    }

    .picker__hint {
      margin: 0;
      color: var(--av-text-soft);
      font-size: var(--text-sm);
      font-weight: 700;
      text-align: center;
    }
  `,
})
export class DifficultyPicker {
  readonly showDescription = input(true);

  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);

  protected readonly options = DIFFICULTIES;
  protected readonly selected = computed(() => difficultyById(this.store.settings().difficulty));

  protected choose(difficulty: Difficulty): void {
    if (difficulty !== this.selected().id) {
      this.store.updateSettings({ difficulty });
      this.audio.play('button');
    }
  }
}
