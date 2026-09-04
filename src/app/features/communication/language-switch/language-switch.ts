import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { LANGUAGE_OPTIONS } from '../../../core/data/language.data';
import type { AppLanguage } from '../../../core/models/language.model';

/**
 * Seletor de idioma da prancha.
 *
 * Os dois idiomas ficam sempre visíveis, lado a lado, em vez de um botão que
 * alterna: quem usa a prancha precisa enxergar para onde vai antes de tocar.
 * É apresentacional — quem guarda a escolha é a página.
 */
@Component({
  selector: 'app-language-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="language-switch" role="group" [attr.aria-label]="label()">
      @for (option of options; track option.id) {
        <button
          type="button"
          class="language-switch__option"
          [class.language-switch__option--active]="option.id === current()"
          [attr.aria-pressed]="option.id === current()"
          [attr.lang]="option.id"
          (click)="languageSelected.emit(option.id)"
        >
          <span class="language-switch__flag" aria-hidden="true">{{ option.flag }}</span>
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './language-switch.scss',
})
export class LanguageSwitch {
  readonly current = input.required<AppLanguage>();
  readonly label = input.required<string>();

  readonly languageSelected = output<AppLanguage>();

  protected readonly options = LANGUAGE_OPTIONS;
}
