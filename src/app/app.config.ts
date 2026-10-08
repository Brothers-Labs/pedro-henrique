import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { AnalyticsService } from './core/services/analytics.service';
import { AppInstallService } from './core/services/app-install.service';
import { CalmModeService } from './core/services/calm-mode.service';
import { PetService } from './core/services/pet.service';
import { SiteTitleStrategy } from './core/services/site-title.strategy';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions(),
    ),
    // As páginas pré-renderizadas são reaproveitadas em vez de redesenhadas, e
    // um toque dado antes do JavaScript chegar não se perde.
    provideClientHydration(withEventReplay()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    // O modo calmo precisa valer desde a primeira pintura, e não só a partir do
    // momento em que algum componente que o consome for renderizado.
    provideAppInitializer(() => {
      inject(CalmModeService);

      // O mascote escuta os eventos dos jogos desde o primeiro clique: se ele
      // só nascesse ao abrir a própria página, o XP dos desafios já jogados
      // se perderia no caminho.
      inject(PetService);

      // O navegador avisa uma única vez que o site pode ser instalado, e esse
      // aviso pode chegar antes de qualquer tela que tenha o botão.
      inject(AppInstallService);

      inject(AnalyticsService).start();
    }),
    { provide: TitleStrategy, useExisting: SiteTitleStrategy },
    // Guarda o app no aparelho para a prancha de falar abrir mesmo sem internet.
    // Registra só depois que a página assenta, para não disputar banda com ela.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
