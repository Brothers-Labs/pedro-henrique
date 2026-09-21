import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';
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
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    // O modo calmo precisa valer desde a primeira pintura, e não só a partir do
    // momento em que algum componente que o consome for renderizado.
    provideAppInitializer(() => {
      inject(CalmModeService);

      // O mascote escuta os eventos dos jogos desde o primeiro clique: se ele
      // só nascesse ao abrir a própria página, o XP dos desafios já jogados
      // se perderia no caminho.
      inject(PetService);
    }),
    { provide: TitleStrategy, useExisting: SiteTitleStrategy },
  ],
};
