import type { Routes } from '@angular/router';

/**
 * Rotas do PedroCraft, sob `/jogos/pedro-craft`.
 *
 * Cada tela é um pedaço carregado sob demanda, e o motor 3D (Three.js) é
 * outro, baixado só quando um mundo abre.
 */
export const PEDRO_CRAFT_ROUTES: Routes = [
  {
    path: '',
    title: 'PedroCraft',
    loadComponent: () => import('./pages/craft-home/craft-home-page').then((m) => m.CraftHomePage),
  },
];
