import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { findPlan, PLANS } from '../../../../core/data/plans.data';
import type { PlanId } from '../../../../core/models/plan.model';
import { ApiError } from '../../../../core/services/api-client.service';
import { AuthService } from '../../../../core/services/auth.service';
import { describeApiError } from '../../../../core/utils/describe-api-error';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { emailAddressValidator, hasVisibleError, MAX_EMAIL_LENGTH } from '../../../auth/auth-form';
import { PixPaymentService } from '../../pix-payment.service';
import { RECEIPT_ACCEPT_ATTRIBUTE, validateReceipt } from '../../pix-receipt';
import { PricePipe } from '../../price.pipe';

type CopyStatus = 'idle' | 'copied' | 'failed';

/** Tempo em que o "Chave copiada!" fica na tela. */
const COPY_FEEDBACK_MS = 2500;

const PAYMENT_MESSAGES_BY_STATUS: Readonly<Record<number, string>> = {
  400: 'Confira o e-mail e o comprovante e tente de novo.',
  413: 'O comprovante é grande demais. Envie um print ou um PDF menor.',
  415: 'Este formato de comprovante não foi aceito. Envie uma imagem ou PDF.',
  422: 'Confira o e-mail e o comprovante e tente de novo.',
};

/**
 * Pagamento de uma assinatura por Pix: copiar a chave, pagar no banco e anexar
 * o comprovante para conferência.
 *
 * Abre sempre que `planId` recebe um plano e fecha devolvendo `null`. O plano
 * pode ser trocado aqui dentro sem perder o comprovante já anexado.
 */
@Component({
  selector: 'app-pix-payment-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FileSizePipe, PricePipe],
  templateUrl: './pix-payment-dialog.html',
  styleUrl: './pix-payment-dialog.scss',
})
export class PixPaymentDialog {
  readonly planId = model<PlanId | null>(null);

  private readonly payment = inject(PixPaymentService);
  private readonly auth = inject(AuthService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly keyInput = viewChild<ElementRef<HTMLInputElement>>('keyInput');
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly plans = PLANS;
  protected readonly pix = this.payment.settings;
  protected readonly isApiConfigured = this.payment.isApiConfigured;
  protected readonly receiptAccept = RECEIPT_ACCEPT_ATTRIBUTE;
  protected readonly maxEmailLength = MAX_EMAIL_LENGTH;
  protected readonly hasVisibleError = hasVisibleError;

  protected readonly selectedPlan = computed(() => {
    const planId = this.planId();

    return planId ? findPlan(planId) : null;
  });

  protected readonly receipt = signal<File | null>(null);
  protected readonly receiptError = signal<string | null>(null);
  protected readonly isDraggingReceipt = signal(false);
  protected readonly copyStatus = signal<CopyStatus>('idle');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** E-mail para o qual o aviso de conferência vai; preenchido, mostra a confirmação. */
  protected readonly submittedTo = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, emailAddressValidator]],
  });

  constructor() {
    effect(() => {
      const shouldBeOpen = this.planId() !== null;
      untracked(() => this.syncDialog(shouldBeOpen));
    });
  }

  protected selectPlan(planId: PlanId): void {
    this.planId.set(planId);
  }

  protected close(): void {
    this.planId.set(null);
  }

  /** `Esc` e o fechamento nativo também precisam devolver o estado. */
  protected handleNativeClose(): void {
    this.cancelCopyFeedback();
    this.planId.set(null);
  }

  protected async copyKey(): Promise<void> {
    const key = this.pix.key;

    if (!key) {
      return;
    }

    try {
      await navigator.clipboard.writeText(key);
      this.showCopyStatus('copied');
    } catch (error) {
      // Sem permissão de área de transferência: a chave fica selecionada para copiar à mão.
      console.warn('Pagamento Pix: não foi possível copiar a chave.', error);
      this.keyInput()?.nativeElement.select();
      this.showCopyStatus('failed');
    }
  }

  protected handleReceiptInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.acceptReceipt(input.files?.[0] ?? null);

    // Permite escolher o mesmo arquivo de novo depois de removê-lo.
    input.value = '';
  }

  protected handleReceiptDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingReceipt.set(true);
  }

  protected handleReceiptDragLeave(): void {
    this.isDraggingReceipt.set(false);
  }

  protected handleReceiptDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingReceipt.set(false);
    this.acceptReceipt(event.dataTransfer?.files[0] ?? null);
  }

  protected removeReceipt(): void {
    this.receipt.set(null);
    this.receiptError.set(null);
  }

  protected async submit(): Promise<void> {
    const planId = this.planId();
    const receipt = this.receipt();

    this.form.markAllAsTouched();

    if (!receipt) {
      this.receiptError.set('Anexe o comprovante do Pix para confirmar.');
    }

    if (!planId || !receipt || this.form.invalid || this.isSubmitting()) {
      return;
    }

    const { email } = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.payment.submitReceipt({ planId, email, receipt });
      this.submittedTo.set(email.trim());
    } catch (error) {
      this.errorMessage.set(describeApiError(error, PAYMENT_MESSAGES_BY_STATUS));

      // Falha de rede ou resposta do servidor é esperada; o resto é defeito do site.
      if (!(error instanceof ApiError)) {
        console.error('Pagamento Pix: falha inesperada ao enviar o comprovante.', error);
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private acceptReceipt(file: File | null): void {
    if (!file) {
      return;
    }

    const problem = validateReceipt(file);
    this.receiptError.set(problem);
    this.receipt.set(problem ? null : file);
  }

  private showCopyStatus(status: CopyStatus): void {
    this.cancelCopyFeedback();
    this.copyStatus.set(status);
    this.copyFeedbackTimer = setTimeout(() => this.copyStatus.set('idle'), COPY_FEEDBACK_MS);
  }

  private cancelCopyFeedback(): void {
    if (this.copyFeedbackTimer !== null) {
      clearTimeout(this.copyFeedbackTimer);
      this.copyFeedbackTimer = null;
    }

    this.copyStatus.set('idle');
  }

  private syncDialog(shouldBeOpen: boolean): void {
    const element = this.dialog().nativeElement;

    if (shouldBeOpen && !element.open) {
      this.startFresh();
      element.showModal();
      return;
    }

    if (!shouldBeOpen && element.open) {
      element.close();
    }
  }

  /** Cada abertura começa limpa, com o e-mail de quem já está conectado. */
  private startFresh(): void {
    this.form.reset({ email: this.auth.currentUser()?.email ?? '' });
    this.receipt.set(null);
    this.receiptError.set(null);
    this.errorMessage.set(null);
    this.submittedTo.set(null);
    this.isDraggingReceipt.set(false);
  }
}
