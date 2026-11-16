import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import type { TubeEffect } from '../../models/tube.model';

/** Fileira de botões de efeito; o escolhido fica marcado. */
@Component({
  selector: 'app-effect-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker" role="group" [attr.aria-label]="label()">
      @for (effect of effects(); track effect.id) {
        <button
          type="button"
          class="picker__chip"
          [attr.aria-pressed]="effect.id === selected()"
          (click)="selected.set(effect.id)"
        >
          <span aria-hidden="true">{{ effect.emoji }}</span>
          {{ effect.name }}
        </button>
      }
    </div>
  `,
  styles: `
    .picker {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .picker__chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 2.5rem;
      padding: 0.35rem 0.85rem;
      border: 2px solid rgb(255 255 255 / 18%);
      border-radius: 999px;
      background: rgb(255 255 255 / 8%);
      color: #ffffff;
      font-family: var(--font-body);
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;

      &[aria-pressed='true'] {
        border-color: #ffffff;
        background: #ffffff;
        color: #1b1530;
      }

      &:focus-visible {
        outline: 3px solid #c86bff;
        outline-offset: 2px;
      }
    }
  `,
})
export class EffectPicker {
  readonly effects = input.required<readonly TubeEffect[]>();
  readonly selected = model.required<string>();
  readonly label = input('Efeitos');
}
