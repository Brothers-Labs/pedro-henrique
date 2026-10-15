import { ChangeDetectionStrategy, Component, effect, type ElementRef, input, output, viewChild } from '@angular/core';

/**
 * Pergunta antes de gastar diamantes, moedas ou apagar o progresso.
 *
 * É um `<dialog>` nativo: o foco fica preso nele, o Esc fecha e o foco volta
 * ao botão de origem sozinho. Um toque sem querer de uma criança nunca gasta
 * nada.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="confirm" [attr.aria-labelledby]="titleId" (close)="cancelled.emit()">
      <h2 [id]="titleId" class="confirm__title">{{ heading() }}</h2>
      <p class="confirm__message">{{ message() }}</p>
      <div class="confirm__actions">
        <button type="button" class="confirm__cancel" (click)="cancelled.emit()">Agora não</button>
        <button type="button" class="confirm__ok" (click)="confirmed.emit()" autofocus>{{ confirmLabel() }}</button>
      </div>
    </dialog>
  `,
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly isOpen = input(false);
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly titleId = `confirmar-${Math.random().toString(36).slice(2, 8)}`;

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;

      if (this.isOpen() && !element.open) {
        element.showModal();
      } else if (!this.isOpen() && element.open) {
        element.close();
      }
    });
  }
}
