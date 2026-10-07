import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  REDIRECT_QUERY_PARAM,
  redirectQueryParams,
  resolveSafeRedirect,
} from '../../../../core/utils/safe-redirect';
import { emailAddressValidator, hasVisibleError, MAX_EMAIL_LENGTH } from '../../auth-form';
import { AuthFormSubmission, focusFirstInvalidField } from '../../auth-form-submission';
import { AuthShell } from '../../components/auth-shell/auth-shell';
import { PasswordField } from '../../components/password-field/password-field';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, PasswordField],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formElement = viewChild.required<ElementRef<HTMLFormElement>>('formElement');

  private readonly redirectTo = resolveSafeRedirect(
    inject(ActivatedRoute).snapshot.queryParamMap.get(REDIRECT_QUERY_PARAM),
  );

  protected readonly isApiConfigured = this.auth.isApiConfigured;
  protected readonly submission = new AuthFormSubmission('login');
  protected readonly maxEmailLength = MAX_EMAIL_LENGTH;
  protected readonly hasVisibleError = hasVisibleError;

  /** Quem veio de uma página específica continua indo para ela depois do cadastro. */
  protected readonly registerQueryParams = redirectQueryParams(this.redirectTo);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, emailAddressValidator]],
    password: ['', Validators.required],
    rememberMe: [true],
  });

  private readonly typedEmail = toSignal(this.form.controls.email.valueChanges, {
    initialValue: '',
  });

  /** Leva o e-mail já digitado para a tela de recuperação, poupando redigitar. */
  protected readonly recoveryQueryParams = computed((): Record<string, string> => {
    const email = this.typedEmail().trim();

    return email ? { email } : {};
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalidField(this.formElement().nativeElement);
      return;
    }

    const hasSucceeded = await this.submission.run(() => this.auth.login(this.form.getRawValue()));

    if (hasSucceeded) {
      await this.router.navigateByUrl(this.redirectTo);
    }
  }
}
