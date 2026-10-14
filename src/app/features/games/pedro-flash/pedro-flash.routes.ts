import type { Routes } from '@angular/router';

/**
 * Rotas do Pedro Flash, sob `/jogos/pedro-flash`.
 *
 * Cada tela é um pedaço carregado sob demanda, e o motor 3D (Three.js) é
 * outro, baixado só quando a partida ou a vitrine do vestiário abre.
 */
export const PEDRO_FLASH_ROUTES: Routes = [
  {
    path: '',
    title: 'Pedro Flash',
    loadComponent: () => import('./pages/flash-home/flash-home-page').then((m) => m.FlashHomePage),
  },
  {
    path: 'fases',
    title: 'Escolher fase — Pedro Flash',
    loadComponent: () => import('./pages/flash-courses/flash-courses-page').then((m) => m.FlashCoursesPage),
  },
  {
    path: 'batalha',
    title: 'Batalha — Pedro Flash',
    loadComponent: () => import('./pages/flash-battle/flash-battle-page').then((m) => m.FlashBattlePage),
  },
  {
    path: 'correr/:mode/:courseId',
    title: 'Correndo — Pedro Flash',
    loadComponent: () => import('./pages/flash-run/flash-run-page').then((m) => m.FlashRunPage),
  },
  {
    path: 'vestiario',
    title: 'Vestiário — Pedro Flash',
    loadComponent: () => import('./pages/flash-wardrobe/flash-wardrobe-page').then((m) => m.FlashWardrobePage),
  },
  {
    path: 'criar',
    title: 'Pedro Flash Maker',
    loadComponent: () => import('./pages/flash-maker/flash-maker-page').then((m) => m.FlashMakerPage),
  },
  {
    path: 'criar/:courseId',
    title: 'Editar fase — Pedro Flash Maker',
    loadComponent: () => import('./pages/flash-maker/flash-maker-page').then((m) => m.FlashMakerPage),
  },
];
