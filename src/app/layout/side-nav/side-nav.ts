import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROFILE } from '../../core/data/profile.data';
import { SideNavService } from '../../core/services/side-nav.service';
import { SideNavMenu } from '../side-nav-menu/side-nav-menu';

/** Id compartilhado pelas duas formas do menu; nunca existem as duas ao mesmo tempo. */
export const SIDE_NAV_ID = 'menu-lateral';

/** Distância mínima, em pixels, do deslize para a esquerda que fecha a gaveta. */
const DISMISS_SWIPE_IN_PIXELS = 72;

/**
 * Menu lateral do site, nas duas formas que ele assume.
 *
 * No desktop é um trilho fixo ao lado do conteúdo, que recolhe até ficar só
 * com os ícones. No toque é uma gaveta que entra pela esquerda — e é um
 * `<dialog>` nativo, porque dele vêm de graça a prisão de foco, o `Esc`, a
 * devolução do foco ao botão que abriu e o bloqueio da página atrás.
 */
@Component({
  selector: 'app-side-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SideNavMenu],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
})
export class SideNav {
  protected readonly sideNav = inject(SideNavService);
  protected readonly profile = PROFILE;
  protected readonly navId = SIDE_NAV_ID;

  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  private swipeOrigin: { readonly x: number; readonly y: number } | null = null;

  constructor() {
    effect(() => this.syncDrawer(this.sideNav.isDrawerOpen()));
  }

  protected closeDrawer(): void {
    this.sideNav.closeDrawer();
  }

  /** Toque fora do painel: o alvo do clique é o próprio `<dialog>`, não o conteúdo. */
  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === this.drawer()?.nativeElement) {
      this.closeDrawer();
    }
  }

  protected startSwipe(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this.swipeOrigin = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  /** Fecha com um deslize para a esquerda — mas não com a rolagem vertical da lista. */
  protected finishSwipe(event: TouchEvent): void {
    const origin = this.swipeOrigin;
    const touch = event.changedTouches[0];
    this.swipeOrigin = null;

    if (!origin || !touch) {
      return;
    }

    const deltaX = touch.clientX - origin.x;
    const deltaY = touch.clientY - origin.y;

    if (deltaX <= -DISMISS_SWIPE_IN_PIXELS && Math.abs(deltaX) > Math.abs(deltaY)) {
      this.closeDrawer();
    }
  }

  private syncDrawer(shouldBeOpen: boolean): void {
    const element = this.drawer()?.nativeElement;

    if (!element) {
      return;
    }

    if (shouldBeOpen && !element.open) {
      element.showModal();
      return;
    }

    if (!shouldBeOpen && element.open) {
      element.close();
    }
  }
}
