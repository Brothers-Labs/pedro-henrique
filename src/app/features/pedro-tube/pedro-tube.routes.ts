import type { Routes } from '@angular/router';

/**
 * Rotas do PedroTube, sob `/pedro-tube`.
 *
 * A casca (marca, busca e botão de criar) fica fixa; as páginas trocam
 * embaixo dela. Tudo roda só no navegador: os canais e vídeos criados moram
 * no aparelho.
 */
export const PEDRO_TUBE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/tube-shell/tube-shell').then((m) => m.TubeShell),
    children: [
      {
        path: '',
        title: 'PedroTube',
        loadComponent: () => import('./pages/tube-home/tube-home').then((m) => m.TubeHome),
      },
      {
        path: 'assistir/:id',
        title: 'Assistir no PedroTube',
        loadComponent: () => import('./pages/tube-watch/tube-watch').then((m) => m.TubeWatch),
      },
      {
        path: 'canal/:id',
        title: 'Canal no PedroTube',
        loadComponent: () => import('./pages/tube-channel/tube-channel').then((m) => m.TubeChannelPage),
      },
      {
        path: 'estudio',
        title: 'Estúdio do PedroTube',
        loadComponent: () => import('./pages/tube-studio/tube-studio').then((m) => m.TubeStudio),
      },
    ],
  },
];
