import type { Routes } from '@angular/router';

/**
 * Rotas do Pedro Aventura (Temporada do Pedro 3D).
 *
 * Tudo mora sob `/pedro-aventura`, em tela cheia (`immersive`), separado do
 * resto do site. Cada tela é um chunk próprio; o three.js só chega com o
 * lobby, o mapa, a fase ou o personagem.
 */
export const PEDRO_AVENTURA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell/aventura-shell').then((m) => m.AventuraShell),
    children: [
      {
        path: '',
        title: 'Temporada do Pedro',
        loadComponent: () => import('./pages/lobby/lobby-page').then((m) => m.LobbyPage),
      },
      {
        path: 'mapa',
        title: 'Mapa · Temporada do Pedro',
        loadComponent: () => import('./pages/map/map-page').then((m) => m.MapPage),
      },
      {
        path: 'fase/:levelId',
        title: 'Fase · Temporada do Pedro',
        data: { isGameplay: true },
        loadComponent: () => import('./pages/level/level-page').then((m) => m.LevelPage),
      },
      {
        path: 'missoes',
        title: 'Missões · Temporada do Pedro',
        loadComponent: () => import('./pages/missions/missions-page').then((m) => m.MissionsPage),
      },
      {
        path: 'passe',
        title: 'Passe · Temporada do Pedro',
        loadComponent: () => import('./pages/pass/pass-page').then((m) => m.PassPage),
      },
      {
        path: 'loja',
        title: 'Loja · Temporada do Pedro',
        loadComponent: () => import('./pages/shop/shop-page').then((m) => m.ShopPage),
      },
      {
        path: 'personagem',
        title: 'Personagem · Temporada do Pedro',
        loadComponent: () => import('./pages/character/character-page').then((m) => m.CharacterPage),
      },
      {
        path: 'ranking',
        title: 'Ranking · Temporada do Pedro',
        loadComponent: () => import('./pages/ranking/ranking-page').then((m) => m.RankingPage),
      },
      {
        path: 'configuracoes',
        title: 'Configurações · Temporada do Pedro',
        loadComponent: () => import('./pages/settings/settings-page').then((m) => m.SettingsPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
