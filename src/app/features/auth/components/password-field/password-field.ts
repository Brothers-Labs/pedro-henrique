import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { type FormControl, ReactiveFormsModule } from '@angular/forms';

import { MAX_PASSWORD_LENGTH } from '../../auth-form';

export type PasswordAutocomplete = 'current-password' | 'new-password';

/**
 * Campo de senha com o botão de mostrar e esconder.
 *
 * Ver o que se digitou evita a senha errada por um dedo escorregado — o
 * principal motivo de "esqueci a senha" logo depois do cadastro. As mensagens
 * de erro e dicas chegam por projeção, porque cada tela fala de um jeito.
 */
@Component({
  selector: 'app-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="field">
      <label class="field__label" [for]="fieldId()">{{ label() }}</label>

      <div class="password">
        <input
          class="field__control password__input"
          [class.field__control--invalid]="isInvalid()"
          [id]="fieldId()"
          [type]="isVisible() ? 'text' : 'password'"
          [formControl]="control()"
          [attr.autocomplete]="autocomplete()"
          [attr.aria-invalid]="isInvalid()"
          [attr.aria-describedby]="describedBy()"
          [attr.maxlength]="maxLength"
          autocapitalize="off"
          spellcheck="false"
        />

        <button
          type="button"
          class="password__toggle"
          [attr.aria-pressed]="isVisible()"
          [attr.aria-controls]="fieldId()"
          (click)="toggleVisibility()"
        >
          <span aria-hidden="true">{{ isVisible() ? '🙈' : '👁️' }}</span>
          <span class="visually-hidden">Mostrar senha</span>
        </button>
      </div>

      <ng-content />
    </div>
  `,
  styleUrl: './password-field.scss',
})
export class PasswordField {
  readonly control = input.required<FormControl<string>>();
  readonly fieldId = input.required<string>();
  readonly label = input('Senha');
  readonly autocomplete = input.required<PasswordAutocomplete>();
  readonly isInvalid = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly maxLength = MAX_PASSWORD_LENGTH;
  protected readonly isVisible = signal(false);

  protected toggleVisibility(): void {
    this.isVisible.update((isVisible) => !isVisible);
  }
}
