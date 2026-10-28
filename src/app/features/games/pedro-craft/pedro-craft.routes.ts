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
  {
    path: 'configuracoes',
    title: 'Configurações — PedroCraft',
    loadComponent: () => import('./pages/craft-settings/craft-settings-page').then((m) => m.CraftSettingsPage),
  },
  {
    path: 'jogar/:worldId',
    title: 'Jogando — PedroCraft',
    loadComponent: () => import('./pages/craft-play/craft-play-page').then((m) => m.CraftPlayPage),
  },
];
