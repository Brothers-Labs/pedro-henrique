import type { Routes } from '@angular/router';

/**
 * Rotas do Pedro Kart, sob `/jogos/pedro-kart`.
 *
 * Cada tela é um pedaço carregado sob demanda, e o motor 3D (Three.js) é
 * outro, baixado só quando a corrida ou a vitrine da garagem abre.
 */
export const PEDRO_KART_ROUTES: Routes = [
  {
    path: '',
    title: 'Pedro Kart',
    loadComponent: () => import('./pages/kart-home/kart-home-page').then((m) => m.KartHomePage),
  },
  {
    path: 'pistas',
    title: 'Escolher pista — Pedro Kart',
    loadComponent: () => import('./pages/kart-tracks/kart-tracks-page').then((m) => m.KartTracksPage),
  },
  {
    path: 'garagem',
    title: 'Garagem — Pedro Kart',
    loadComponent: () => import('./pages/kart-garage/kart-garage-page').then((m) => m.KartGaragePage),
  },
  {
    path: 'corrida/:trackId',
    title: 'Correndo — Pedro Kart',
    loadComponent: () => import('./pages/kart-race/kart-race-page').then((m) => m.KartRacePage),
  },
  {
    path: 'criar',
    title: 'Pedro Kart Maker',
    loadComponent: () => import('./pages/kart-maker/kart-maker-page').then((m) => m.KartMakerPage),
  },
  {
    path: 'criar/:trackId',
    title: 'Editar pista — Pedro Kart Maker',
    loadComponent: () => import('./pages/kart-maker/kart-maker-page').then((m) => m.KartMakerPage),
  },
];
