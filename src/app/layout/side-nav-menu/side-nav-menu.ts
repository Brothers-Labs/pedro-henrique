import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { NAVIGATION_GROUPS } from '../../core/data/site-sections.data';
import { AppInstallService } from '../../core/services/app-install.service';
import { AuthService } from '../../core/services/auth.service';
import { redirectQueryParams } from '../../core/utils/safe-redirect';

/** Páginas de conta: voltar para elas depois do login não faria sentido. */
const ACCOUNT_PATHS = ['/entrar', '/cadastro', '/recuperar-senha', '/redefinir-senha'];

/**
 * Lista de destinos do menu lateral, agrupada, com a área de conta no fim.
 *
 * Não sabe se está na gaveta do celular ou fixa no desktop: quem decide a
 * moldura é `SideNav`. Recolhida, mostra só os ícones — os nomes continuam no
 * HTML, escondidos só da vista, para que o leitor de tela siga lendo tudo.
 */
@Component({
  selector: 'app-side-nav-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav-menu.html',
  styleUrl: './side-nav-menu.scss',
})
export class SideNavMenu {
  readonly isCollapsed = input(false);

  /** Emite quando um destino é escolhido, para a gaveta saber que pode fechar. */
  readonly navigated = output<void>();

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly appInstall = inject(AppInstallService);

  protected readonly groups = NAVIGATION_GROUPS;
  protected readonly currentUser = this.auth.currentUser;
  protected readonly canInstall = this.appInstall.canInstall;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Quem entra a partir de uma página volta para ela depois do login. */
  protected readonly loginQueryParams = computed(() => {
    const url = this.currentUrl();
    const isAccountPage = ACCOUNT_PATHS.some((path) => url.startsWith(path));

    return isAccountPage ? {} : redirectQueryParams(url);
  });

  protected readonly userInitial = computed(
    () => this.currentUser()?.name.trim().charAt(0).toLocaleUpperCase('pt-BR') ?? '',
  );

  protected select(): void {
    this.navigated.emit();
  }

  protected async install(): Promise<void> {
    await this.appInstall.install();
    this.navigated.emit();
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.navigated.emit();
  }
}
