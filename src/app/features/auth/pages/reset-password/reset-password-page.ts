import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  hasVisibleConfirmationError,
  hasVisibleError,
  matchingFieldsValidator,
  MIN_PASSWORD_LENGTH,
  passwordRulesValidator,
} from '../../auth-form';
import { AuthFormSubmission, focusFirstInvalidField } from '../../auth-form-submission';
import { AuthShell } from '../../components/auth-shell/auth-shell';
import { PasswordField } from '../../components/password-field/password-field';
import { PasswordStrengthMeter } from '../../components/password-strength-meter/password-strength-meter';

/**
 * Página aberta pelo link do e-mail de recuperação (`/redefinir-senha?token=…`).
 *
 * O token só é conferido de verdade pelo servidor, no envio; aqui basta saber
 * se ele veio no link para mostrar o formulário ou o aviso de link quebrado.
 */
@Component({
  selector: 'app-reset-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, PasswordField, PasswordStrengthMeter],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.scss',
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('formElement');

  protected readonly token = (
    inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? ''
  ).trim();

  protected readonly isApiConfigured = this.auth.isApiConfigured;
  protected readonly submission = new AuthFormSubmission('reset-password');
  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  protected readonly hasVisibleError = hasVisibleError;
  protected readonly hasChangedPassword = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, passwordRulesValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchingFieldsValidator('password', 'confirmPassword') },
  );

  protected readonly typedPassword = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  protected isConfirmationInvalid(): boolean {
    return hasVisibleConfirmationError(this.form, 'confirmPassword');
  }

  protected async submit(): Promise<void> {
    const formElement = this.formElement()?.nativeElement;

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (formElement) {
        focusFirstInvalidField(formElement);
      }

      return;
    }

    const { password } = this.form.getRawValue();
    const hasSucceeded = await this.submission.run(() =>
      this.auth.resetPassword({ token: this.token, password }),
    );

    if (hasSucceeded) {
      this.form.reset();
      this.hasChangedPassword.set(true);
    }
  }
}
