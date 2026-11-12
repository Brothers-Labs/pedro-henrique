import type { Routes } from '@angular/router';

/**
 * Rotas do Pedro Pedrerê, sob `/jogos/pedro-pedrere`.
 *
 * Cada tela é um pedaço carregado sob demanda; o motor 2D vem junto só com
 * as telas de partida.
 */
export const PEDRO_PEDRERE_ROUTES: Routes = [
  {
    path: '',
    title: 'Pedro Pedrerê',
    loadComponent: () => import('./pages/pedrere-home/pedrere-home-page').then((m) => m.PedrereHomePage),
  },
  {
    path: 'aventuras',
    title: 'Aventuras — Pedro Pedrerê',
    loadComponent: () =>
      import('./pages/pedrere-adventures/pedrere-adventures-page').then((m) => m.PedrereAdventuresPage),
  },
  {
    path: 'aventuras/:levelId',
    title: 'Jogando — Pedro Pedrerê',
    loadComponent: () => import('./pages/pedrere-play/pedrere-play-page').then((m) => m.PedrerePlayPage),
  },
  {
    path: 'pula-pula',
    title: 'Pula-pula — Pedro Pedrerê',
    loadComponent: () => import('./pages/pedrere-bounce/pedrere-bounce-page').then((m) => m.PedrereBouncePage),
  },
  {
    path: 'corrida',
    title: 'Corrida — Pedro Pedrerê',
    loadComponent: () => import('./pages/pedrere-race/pedrere-race-page').then((m) => m.PedrereRacePage),
  },
  {
    path: 'personagem',
    title: 'Personagem — Pedro Pedrerê',
    loadComponent: () =>
      import('./pages/pedrere-character/pedrere-character-page').then((m) => m.PedrereCharacterPage),
  },
  {
    path: 'maker',
    title: 'Modo maker — Pedro Pedrerê',
    loadComponent: () => import('./pages/pedrere-maker/pedrere-maker-page').then((m) => m.PedrereMakerPage),
  },
  {
    path: 'maker/:levelId',
    title: 'Editar fase — Pedro Pedrerê',
    loadComponent: () => import('./pages/pedrere-maker/pedrere-maker-page').then((m) => m.PedrereMakerPage),
  },
];
