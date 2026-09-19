import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  model,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { SITE_SECTIONS } from '../../core/data/site-sections.data';
import { CalmModeToggle } from '../calm-mode-toggle/calm-mode-toggle';

/** Distância mínima, em pixels, para o arrasto para baixo fechar a folha. */
const DISMISS_DRAG_IN_PIXELS = 72;

/**
 * Menu completo do celular, apresentado como folha que sobe pela base da tela.
 *
 * Sobe pela base porque é ali que o polegar está: a mão que abriu o menu na
 * barra inferior não precisa atravessar a tela para escolher um destino.
 *
 * É um `<dialog>` nativo, e isso não é detalhe de implementação — dele vêm de
 * graça a prisão de foco, o fechamento com `Esc`, a devolução do foco ao botão
 * de origem e o bloqueio da página atrás.
 */
@Component({
  selector: 'app-nav-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, CalmModeToggle],
  templateUrl: './nav-sheet.html',
  styleUrl: './nav-sheet.scss',
})
export class NavSheet {
  readonly isOpen = model(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private dragOrigin: number | null = null;

  protected readonly sections = SITE_SECTIONS;

  constructor() {
    effect(() => this.syncDialog(this.isOpen()));
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  /** Toque fora da folha: o alvo do clique é o próprio `<dialog>`, não o conteúdo. */
  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  protected handleNativeClose(): void {
    this.isOpen.set(false);
  }

  protected startDrag(event: TouchEvent): void {
    this.dragOrigin = event.changedTouches[0]?.clientY ?? null;
  }

  protected finishDrag(event: TouchEvent): void {
    const origin = this.dragOrigin;
    const touch = event.changedTouches[0];
    this.dragOrigin = null;

    if (origin !== null && touch && touch.clientY - origin >= DISMISS_DRAG_IN_PIXELS) {
      this.close();
    }
  }

  private syncDialog(shouldBeOpen: boolean): void {
    const element = this.dialog().nativeElement;

    if (shouldBeOpen && !element.open) {
      element.showModal();
      return;
    }

    if (!shouldBeOpen && element.open) {
      element.close();
    }
  }
}
