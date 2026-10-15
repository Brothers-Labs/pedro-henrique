import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type ActivatedRouteSnapshot,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
  RoutesRecognized,
} from '@angular/router';
import { filter, map } from 'rxjs';

import { AppStatusBanner } from './layout/app-status-banner/app-status-banner';
import { BottomNav } from './layout/bottom-nav/bottom-nav';
import { SideNav } from './layout/side-nav/side-nav';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

/**
 * Moldura do site.
 *
 * Rotas marcadas com `data: { immersive: true }` (o jogo Pedro Aventura) ocupam
 * a tela inteira: cabeçalho, menus, rodapé e barra inferior saem de cena. O
 * `router-outlet` é sempre o mesmo, para que nenhuma página seja recriada só
 * porque a moldura mudou.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SideNav, AppStatusBanner, SiteFooter, BottomNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '[class.is-immersive]': 'isImmersive()' },
})
export class App {
  private readonly router = inject(Router);

  /**
   * Decide já quando a rota é reconhecida, antes de baixar a página: abrir o jogo
   * direto pela URL não mostra a moldura do site piscando. Se a navegação não se
   * completa, volta ao que está de fato na tela.
   */
  protected readonly isImmersive = toSignal(
    this.router.events.pipe(
      filter(
        (event) =>
          event instanceof RoutesRecognized ||
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError,
      ),
      map((event) => isImmersiveRoute(event instanceof RoutesRecognized ? event.state.root : this.router.routerState.snapshot.root)),
    ),
    { initialValue: false },
  );
}

/** Verdadeiro quando algum nível da rota ativa pediu a tela inteira. */
export function isImmersiveRoute(root: ActivatedRouteSnapshot): boolean {
  for (let current: ActivatedRouteSnapshot | null = root; current; current = current.firstChild) {
    if (current.data['immersive'] === true) {
      return true;
    }
  }

  return false;
}
