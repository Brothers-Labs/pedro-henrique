import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { formatNumber } from '../components/format';
import { AventuraAudio } from '../services/aventura-audio.service';
import { AventuraStore } from '../services/aventura-store.service';

interface NavigationTab {
  readonly label: string;
  readonly emoji: string;
  readonly path: string;
  readonly isExact: boolean;
}

const TABS: readonly NavigationTab[] = [
  { label: 'Início', emoji: '🏠', path: '/pedro-aventura', isExact: true },
  { label: 'Mapa', emoji: '🗺️', path: '/pedro-aventura/mapa', isExact: false },
  { label: 'Missões', emoji: '📋', path: '/pedro-aventura/missoes', isExact: false },
  { label: 'Passe', emoji: '👑', path: '/pedro-aventura/passe', isExact: false },
  { label: 'Loja', emoji: '🛒', path: '/pedro-aventura/loja', isExact: false },
  { label: 'Ranking', emoji: '🏆', path: '/pedro-aventura/ranking', isExact: false },
];

/**
 * Moldura do Pedro Aventura: barra superior com as seções, a carteira, o
 * personagem e as configurações.
 *
 * Some durante a fase, para a corrida ocupar a tela inteira. O primeiro toque
 * em qualquer lugar libera o áudio — o navegador não deixa tocar antes disso.
 */
@Component({
  selector: 'app-aventura-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './aventura-shell.html',
  styleUrl: './aventura-shell.scss',
})
export class AventuraShell {
  private readonly router = inject(Router);
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);

  protected readonly tabs = TABS;
  protected readonly coins = this.store.coins;
  protected readonly diamonds = this.store.diamonds;
  protected readonly isPersistent = this.store.isPersistent;
  protected readonly claimableMissions = this.store.claimableMissionCount;
  protected readonly claimableRewards = this.store.claimableRewardCount;
  protected readonly formatNumber = formatNumber;

  /** Na fase, a moldura sai de cena. */
  protected readonly isPlaying = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => isGameplayRoute(this.router.routerState.snapshot.root)),
    ),
    { initialValue: isGameplayRoute(this.router.routerState.snapshot.root) },
  );

  constructor() {
    const unlock = (): void => this.audio.unlock();

    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      this.audio.stopMusic();
    });
  }

  protected badgeOf(tab: NavigationTab): number {
    if (tab.path.endsWith('/missoes')) {
      return this.claimableMissions();
    }

    return tab.path.endsWith('/passe') ? this.claimableRewards() : 0;
  }
}

function isGameplayRoute(root: ActivatedRouteSnapshot): boolean {
  for (let current: ActivatedRouteSnapshot | null = root; current; current = current.firstChild) {
    if (current.data['isGameplay'] === true) {
      return true;
    }
  }

  return false;
}
