import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, fromEvent, interval, merge } from 'rxjs';

import { AnalyticsService } from './analytics.service';

/** Um tablet pode ficar dias com o site aberto: vale procurar novidade de vez em quando. */
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Novas versões do site instalado.
 *
 * Quando uma versão nova termina de baixar, o serviço só avisa — quem decide a
 * hora de atualizar é quem está usando. Recarregar sozinho poderia apagar a
 * frase que a criança estava montando na prancha ou a fase no meio do jogo.
 *
 * Sem service worker (desenvolvimento, testes, pré-renderização) nada acontece.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);
  private readonly updateReadyState = signal(false);

  readonly isUpdateReady = this.updateReadyState.asReadonly();

  constructor() {
    const swUpdate = this.swUpdate;

    if (!swUpdate?.isEnabled) {
      return;
    }

    swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.updateReadyState.set(true));

    // A versão em cache ficou inconsistente com o servidor: continuar nela
    // quebraria a próxima tela que precisasse de um arquivo que já não existe.
    swUpdate.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    const becameVisible = fromEvent(this.document, 'visibilitychange').pipe(
      filter(() => this.document.visibilityState === 'visible'),
    );

    merge(interval(UPDATE_CHECK_INTERVAL_MS), becameVisible)
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.checkForUpdate(swUpdate));
  }

  applyUpdate(): void {
    this.analytics.track({ name: 'app_updated' });
    this.reload();
  }

  private async checkForUpdate(swUpdate: SwUpdate): Promise<void> {
    // Sem internet não há o que procurar, e a falha seria só ruído no console.
    if (!this.document.defaultView?.navigator.onLine) {
      return;
    }

    try {
      await swUpdate.checkForUpdate();
    } catch (error: unknown) {
      console.warn('Não foi possível procurar uma nova versão do site.', error);
    }
  }

  private reload(): void {
    this.document.location.reload();
  }
}
