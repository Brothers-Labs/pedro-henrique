import { inject } from '@angular/core';
import { type CanActivateFn, Router, type Routes } from '@angular/router';

import { isPlayable } from './engine/adventure-progression';
import { AdventureService } from './services/adventure.service';

/**
 * Fase trancada ou inexistente volta para o mapa.
 *
 * Um link antigo, digitado ou guardado nos favoritos não pode pular a trilha.
 */
export const playableLevelGuard: CanActivateFn = (route) => {
  const view = inject(AdventureService).levelView(
    route.paramMap.get('worldId') ?? '',
    route.paramMap.get('levelId') ?? '',
  );

  return view && isPlayable(view.status) ? true : inject(Router).parseUrl('/aventura');
};

/** Rotas da Aventura, sob `/aventura`. Cada tela é um pedaço carregado sob demanda. */
export const ADVENTURE_ROUTES: Routes = [
  {
    path: '',
    title: 'Aventura',
    loadComponent: () => import('./pages/adventure-map/adventure-map-page').then((m) => m.AdventureMapPage),
  },
  {
    path: ':worldId/:levelId',
    title: 'Fase da Aventura',
    canActivate: [playableLevelGuard],
    loadComponent: () => import('./pages/adventure-level/adventure-level-page').then((m) => m.AdventureLevelPage),
  },
];
