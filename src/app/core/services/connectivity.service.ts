import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { AnalyticsService } from './analytics.service';

/**
 * Se o aparelho está com internet agora.
 *
 * Fora do navegador (na pré-renderização) responde sempre que sim: a página
 * estática não pode nascer avisando de uma queda que ninguém teve.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly analytics = inject(AnalyticsService);
  private readonly onlineState = signal(true);

  readonly isOnline = this.onlineState.asReadonly();

  constructor() {
    const view = inject(DOCUMENT).defaultView;

    if (!isPlatformBrowser(inject(PLATFORM_ID)) || !view) {
      return;
    }

    this.onlineState.set(view.navigator.onLine);

    const handleOnline = (): void => this.onlineState.set(true);
    const handleOffline = (): void => {
      this.onlineState.set(false);
      this.analytics.track({ name: 'connection_lost' });
    };

    view.addEventListener('online', handleOnline);
    view.addEventListener('offline', handleOffline);

    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener('online', handleOnline);
      view.removeEventListener('offline', handleOffline);
    });
  }
}
