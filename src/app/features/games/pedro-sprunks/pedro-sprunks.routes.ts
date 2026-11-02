import type { Routes } from '@angular/router';

/**
 * Rotas do Pedro Sprunks, sob `/jogos/pedro-sprunks`.
 *
 * Uma tela só por enquanto: palco, paleta e criador de personagens convivem
 * juntos, porque o boneco criado entra na banda na mesma hora.
 */
export const PEDRO_SPRUNKS_ROUTES: Routes = [
  {
    path: '',
    title: 'Pedro Sprunks',
    loadComponent: () => import('./pages/sprunks-page/sprunks-page').then((m) => m.SprunksPage),
  },
];
