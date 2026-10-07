import { signal } from '@angular/core';

import { ApiError } from '../../core/services/api-client.service';
import { type AuthOperation, describeAuthError } from './auth-errors';

/**
 * Estado de envio de um formulário de conta: "enviando" e a mensagem de erro.
 *
 * As quatro telas de conta enviam do mesmo jeito; centralizar aqui garante que
 * nenhuma delas esqueça de destravar o botão depois de uma falha.
 */
export class AuthFormSubmission {
  private readonly submittingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly isSubmitting = this.submittingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();

  constructor(private readonly operation: AuthOperation) {}

  /** Executa o envio e devolve `true` quando deu certo. Ignora cliques repetidos. */
  async run(task: () => Promise<unknown>): Promise<boolean> {
    if (this.submittingState()) {
      return false;
    }

    this.submittingState.set(true);
    this.errorState.set(null);

    try {
      await task();
      return true;
    } catch (error) {
      this.errorState.set(describeAuthError(error, this.operation));

      // Falha de rede ou resposta do servidor é esperada; o resto é defeito do site.
      if (!(error instanceof ApiError)) {
        console.error(`Falha inesperada na operação de conta "${this.operation}".`, error);
      }

      return false;
    } finally {
      this.submittingState.set(false);
    }
  }
}

/**
 * Leva o foco ao primeiro campo com erro depois de uma tentativa de envio.
 *
 * Espera a próxima volta do navegador porque o `aria-invalid` só é aplicado
 * na detecção de mudanças que vem logo depois do clique.
 */
export function focusFirstInvalidField(form: HTMLFormElement): void {
  setTimeout(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}
