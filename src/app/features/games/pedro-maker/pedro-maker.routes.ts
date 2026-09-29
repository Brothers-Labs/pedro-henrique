import type { Routes } from '@angular/router';

import type { PlaySource } from './pages/maker-play/maker-play-page';

const campaign: PlaySource = 'campanha';
const custom: PlaySource = 'minha';

/**
 * Rotas do Pedro Maker, sob `/jogos/pedro-maker`.
 *
 * Cada tela é um pedaço carregado sob demanda, e o motor do jogo (Phaser) é
 * outro, baixado só quando uma fase abre — quem só olha o mapa não paga por
 * ele.
 */
export const PEDRO_MAKER_ROUTES: Routes = [
  {
    path: '',
    title: 'Pedro Maker',
    loadComponent: () => import('./pages/maker-home/maker-home-page').then((m) => m.MakerHomePage),
  },
  {
    path: 'mapa',
    title: 'Mapa da aventura — Pedro Maker',
    loadComponent: () => import('./pages/maker-map/maker-map-page').then((m) => m.MakerMapPage),
  },
  {
    path: 'jogar/:levelId',
    title: 'Jogando — Pedro Maker',
    data: { source: campaign },
    loadComponent: () => import('./pages/maker-play/maker-play-page').then((m) => m.MakerPlayPage),
  },
  {
    path: 'criar',
    title: 'Criar minha fase — Pedro Maker',
    loadComponent: () => import('./pages/maker-editor/maker-editor-page').then((m) => m.MakerEditorPage),
  },
  {
    path: 'criar/:customId',
    title: 'Editar minha fase — Pedro Maker',
    loadComponent: () => import('./pages/maker-editor/maker-editor-page').then((m) => m.MakerEditorPage),
  },
  {
    path: 'minhas-fases',
    title: 'Minhas fases — Pedro Maker',
    loadComponent: () => import('./pages/maker-levels/maker-levels-page').then((m) => m.MakerLevelsPage),
  },
  {
    path: 'minhas-fases/jogar/:customId',
    title: 'Jogando minha fase — Pedro Maker',
    data: { source: custom },
    loadComponent: () => import('./pages/maker-play/maker-play-page').then((m) => m.MakerPlayPage),
  },
  {
    path: 'conquistas',
    title: 'Conquistas — Pedro Maker',
    loadComponent: () =>
      import('./pages/maker-achievements/maker-achievements-page').then((m) => m.MakerAchievementsPage),
  },
  {
    path: 'personagem',
    title: 'Meu personagem — Pedro Maker',
    loadComponent: () => import('./pages/maker-character/maker-character-page').then((m) => m.MakerCharacterPage),
  },
  {
    path: 'configuracoes',
    title: 'Configurações — Pedro Maker',
    loadComponent: () => import('./pages/maker-settings/maker-settings-page').then((m) => m.MakerSettingsPage),
  },
];
