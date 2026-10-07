import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  REDIRECT_QUERY_PARAM,
  redirectQueryParams,
  resolveSafeRedirect,
} from '../../../../core/utils/safe-redirect';
import {
  emailAddressValidator,
  hasVisibleConfirmationError,
  hasVisibleError,
  matchingFieldsValidator,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordRulesValidator,
} from '../../auth-form';
import { AuthFormSubmission, focusFirstInvalidField } from '../../auth-form-submission';
import { AuthShell } from '../../components/auth-shell/auth-shell';
import { PasswordField } from '../../components/password-field/password-field';
import { PasswordStrengthMeter } from '../../components/password-strength-meter/password-strength-meter';

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, PasswordField, PasswordStrengthMeter],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formElement = viewChild.required<ElementRef<HTMLFormElement>>('formElement');

  private readonly redirectTo = resolveSafeRedirect(
    inject(ActivatedRoute).snapshot.queryParamMap.get(REDIRECT_QUERY_PARAM),
  );

  protected readonly isApiConfigured = this.auth.isApiConfigured;
  protected readonly submission = new AuthFormSubmission('register');
  protected readonly loginQueryParams = redirectQueryParams(this.redirectTo);
  protected readonly maxNameLength = MAX_NAME_LENGTH;
  protected readonly maxEmailLength = MAX_EMAIL_LENGTH;
  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  protected readonly hasVisibleError = hasVisibleError;

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]],
      email: ['', [Validators.required, emailAddressValidator]],
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalidField(this.formElement().nativeElement);
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    const hasSucceeded = await this.submission.run(() =>
      this.auth.register({ name, email, password }),
    );

    if (hasSucceeded) {
      await this.router.navigateByUrl(this.redirectTo);
    }
  }
}
