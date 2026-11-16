import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface ChoiceChip {
  readonly value: string;
  /** Nome lido pelo leitor de tela; aparece escrito no modo `texto`. */
  readonly label: string;
  readonly emoji?: string;
  /** Cor da bolinha, no modo `cor`. */
  readonly color?: string;
}

/**
 * Grupo de botões em que só um fica marcado: emojis, cores ou opções com
 * nome. Cada botão diz o próprio nome e se está marcado (`aria-pressed`).
 */
@Component({
  selector: 'app-choice-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', '[attr.aria-label]': 'label()', '[attr.data-look]': 'look()' },
  template: `
    @for (option of options(); track option.value) {
      <button
        type="button"
        class="chip"
        [attr.aria-label]="look() === 'texto' ? null : option.label"
        [attr.title]="option.label"
        [attr.aria-pressed]="option.value === selected()"
        [style.background]="option.color ?? null"
        (click)="selected.set(option.value)"
      >
        @if (option.emoji) {
          <span class="chip__emoji" aria-hidden="true">{{ option.emoji }}</span>
        }
        @if (look() === 'texto') {
          {{ option.label }}
        }
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      min-width: 2.75rem;
      min-height: 2.75rem;
      padding: 0.3rem 0.8rem;
      border: 2px solid rgb(255 255 255 / 20%);
      border-radius: 0.8rem;
      background: rgb(255 255 255 / 8%);
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;

      &[aria-pressed='true'] {
        border-color: #ffffff;
        box-shadow:
          0 0 0 2px #0e0b1d,
          0 0 0 5px #ffffff;
      }

      &:focus-visible {
        outline: 3px solid #c86bff;
        outline-offset: 3px;
      }
    }

    :host([data-look='texto']) .chip[aria-pressed='true'] {
      background: #ffffff;
      color: #1b1530;
      box-shadow: none;
    }

    :host([data-look='emoji']) .chip {
      padding: 0.2rem;
      font-size: 1.5rem;
    }

    :host([data-look='cor']) .chip {
      width: 2.75rem;
      padding: 0;
      border-radius: 50%;
    }
  `,
})
export class ChoiceChips {
  readonly options = input.required<readonly ChoiceChip[]>();
  readonly selected = model.required<string>();
  readonly label = input.required<string>();
  /** `texto`: emoji e nome; `emoji`: só o emoji grande; `cor`: só a bolinha colorida. */
  readonly look = input<'texto' | 'emoji' | 'cor'>('texto');
}
