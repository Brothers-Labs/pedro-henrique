import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { emailAddressValidator, hasVisibleError, MAX_EMAIL_LENGTH } from '../../auth-form';
import { AuthFormSubmission, focusFirstInvalidField } from '../../auth-form-submission';
import { AuthShell } from '../../components/auth-shell/auth-shell';

@Component({
  selector: 'app-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.scss',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('formElement');

  protected readonly isApiConfigured = this.auth.isApiConfigured;
  protected readonly submission = new AuthFormSubmission('forgot-password');
  protected readonly maxEmailLength = MAX_EMAIL_LENGTH;
  protected readonly hasVisibleError = hasVisibleError;

  /** E-mail para o qual o link foi pedido; preenchido, a tela mostra a confirmação. */
  protected readonly sentTo = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    // Vem preenchido quando a pessoa chega pelo "Esqueci minha senha" do login.
    email: [
      (inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '').slice(0, MAX_EMAIL_LENGTH),
      [Validators.required, emailAddressValidator],
    ],
  });

  protected async submit(): Promise<void> {
    const formElement = this.formElement()?.nativeElement;

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (formElement) {
        focusFirstInvalidField(formElement);
      }

      return;
    }

    await this.requestLink();
  }

  protected useAnotherEmail(): void {
    this.sentTo.set(null);
  }

  /**
   * A confirmação é a mesma exista ou não uma conta com o e-mail: uma resposta
   * diferente contaria a qualquer um quem tem cadastro no site.
   */
  protected async requestLink(): Promise<void> {
    const email = this.form.controls.email.value.trim();
    const hasSucceeded = await this.submission.run(() => this.auth.requestPasswordReset({ email }));

    if (hasSucceeded) {
      this.sentTo.set(email);
    }
  }
}
