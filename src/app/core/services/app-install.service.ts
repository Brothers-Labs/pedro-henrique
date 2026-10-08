import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { detectDisplayMode } from '../utils/display-mode';
import { AnalyticsService } from './analytics.service';

/**
 * Evento que o Chrome e o Edge disparam quando o site pode virar app.
 * Ainda não faz parte do `lib.dom` do TypeScript.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/**
 * Instalação do site como app (PWA).
 *
 * O navegador avisa uma única vez que a instalação é possível; o evento fica
 * guardado aqui até alguém tocar em "Instalar". No Safari do iPhone esse aviso
 * não existe — lá a instalação é pelo "Adicionar à Tela de Início", e
 * `canInstall` simplesmente nunca fica verdadeiro.
 *
 * Precisa nascer junto com o app: o aviso pode chegar antes de qualquer tela
 * que tenha o botão.
 */
@Injectable({ providedIn: 'root' })
export class AppInstallService {
  private readonly analytics = inject(AnalyticsService);
  private readonly canInstallState = signal(false);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = this.canInstallState.asReadonly();

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    if (!isBrowser || !view || detectDisplayMode(view) === 'standalone') {
      return;
    }

    const handleInstallPrompt = (event: Event): void => {
      // Sem isto o navegador mostra a própria faixa de instalação, por cima do site.
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstallState.set(true);
    };

    const handleInstalled = (): void => {
      this.forgetPrompt();
      this.analytics.track({ name: 'app_installed' });
    };

    view.addEventListener('beforeinstallprompt', handleInstallPrompt);
    view.addEventListener('appinstalled', handleInstalled);

    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      view.removeEventListener('appinstalled', handleInstalled);
    });
  }

  async install(): Promise<InstallOutcome> {
    const installPrompt = this.deferredPrompt;

    if (!installPrompt) {
      return 'unavailable';
    }

    // O evento só pode ser usado uma vez, aceito ou não.
    this.forgetPrompt();

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    this.analytics.track({ name: 'app_install_answered', properties: { outcome } });

    return outcome;
  }

  private forgetPrompt(): void {
    this.deferredPrompt = null;
    this.canInstallState.set(false);
  }
}
