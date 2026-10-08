import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, isDevMode, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { inject as injectWebAnalytics, pageview, track } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { filter } from 'rxjs';

import { GameEventBus } from '../events/game-event-bus';
import type { AnalyticsEvent } from '../models/analytics-event.model';
import type { GameEvent } from '../models/game-event.model';
import { detectDisplayMode } from '../utils/display-mode';

const NOT_FOUND_ROUTE_SEGMENT = '404';

/** Navigator com o sinal de privacidade que os navegadores modernos expõem. */
interface PrivacyAwareNavigator extends Navigator {
  readonly globalPrivacyControl?: boolean;
}

/**
 * Métricas de uso e de desempenho, sobre o Vercel Web Analytics e o Speed
 * Insights: sem cookies, sem identificar ninguém e sem banner de consentimento.
 *
 * Só começa a medir quando `start()` é chamado, e só no build de produção, no
 * navegador e para quem não pediu para não ser rastreado. Em qualquer outro
 * caso `track()` simplesmente não faz nada — desenvolvimento, testes e a
 * pré-renderização nunca enviam um evento sequer.
 *
 * As visitas são agrupadas pelo molde da rota (`/jogos/pedro-maker/jogar/:levelId`)
 * e não pela URL concreta, para que cada fase não vire uma página diferente.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly gameEvents = inject(GameEventBus);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private isStarted = false;

  start(): void {
    const view = this.document.defaultView;

    if (this.isStarted || !this.isBrowser || !view || isDevMode() || hasOptedOut(view.navigator)) {
      return;
    }

    this.isStarted = true;

    injectWebAnalytics({
      framework: 'angular',
      disableAutoTrack: true,
      beforeSend: (event) => ({ ...event, url: sanitizeAnalyticsUrl(event.url) }),
    });

    const speedInsights = injectSpeedInsights({
      framework: 'angular',
      beforeSend: (event) => ({ ...event, url: sanitizeAnalyticsUrl(event.url) }),
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const route = buildRouteTemplate(this.router.routerState.snapshot.root);

        pageview({ route, path: stripQueryAndFragment(event.urlAfterRedirects) });
        // `null` quando o script já tinha sido injetado: não há rota a acompanhar.
        speedInsights?.setRoute(route);
      });

    this.gameEvents.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((gameEvent) => {
      const event = gameEventToAnalyticsEvent(gameEvent);

      if (event) {
        this.track(event);
      }
    });

    this.track({
      name: 'app_opened',
      properties: { displayMode: detectDisplayMode(view), isOnline: view.navigator.onLine },
    });
  }

  track(event: AnalyticsEvent): void {
    if (!this.isStarted) {
      return;
    }

    track(event.name, 'properties' in event ? event.properties : undefined);
  }
}

/**
 * Traduz o que acontece nos jogos para o catálogo de métricas.
 *
 * Cada resposta de cada desafio fica de fora de propósito: seriam dezenas de
 * eventos por partida dizendo pouco além do que o fim de fase já diz.
 */
export function gameEventToAnalyticsEvent(event: GameEvent): AnalyticsEvent | null {
  switch (event.type) {
    case 'LEVEL_COMPLETED':
      return {
        name: 'game_level_completed',
        properties: { gameId: event.gameId, level: event.level, wasPerfect: event.wasPerfect },
      };
    case 'ACHIEVEMENT_UNLOCKED':
      return { name: 'achievement_unlocked', properties: { achievementId: event.achievementId } };
    case 'CHALLENGE_COMPLETED':
      return null;
  }
}

/** Molde da rota ativa, montado com o `path` de cada nível da árvore. */
export function buildRouteTemplate(root: ActivatedRouteSnapshot): string {
  const segments: string[] = [];
  let current: ActivatedRouteSnapshot | null = root;

  while (current) {
    const path = current.routeConfig?.path;

    if (path) {
      segments.push(path === '**' ? NOT_FOUND_ROUTE_SEGMENT : path);
    }

    current = current.firstChild;
  }

  return `/${segments.join('/')}`;
}

/**
 * Nada depois do caminho sai do aparelho: a query string pode carregar um
 * token (o link de redefinir senha carrega) e o fragmento é estado da tela.
 */
export function sanitizeAnalyticsUrl(url: string): string {
  try {
    const parsed = new URL(url);

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return stripQueryAndFragment(url);
  }
}

function stripQueryAndFragment(url: string): string {
  return url.split(/[?#]/)[0];
}

function hasOptedOut(navigator: PrivacyAwareNavigator): boolean {
  return navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
}
