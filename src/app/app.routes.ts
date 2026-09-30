import { Routes } from '@angular/router';

/**
 * Todas as páginas são carregadas sob demanda: a home fica leve e cada seção
 * entra em um chunk próprio.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Início',
    data: {
      description:
        'O site do Pedro Henrique: do meu jeito, minha família, superpoderes, favoritos, medalhas e um mural de recados.',
    },
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'falar',
    title: 'Prancha de falar',
    data: {
      description:
        'A prancha de comunicação do Pedro Henrique: toque nos cartões, monte a frase e o computador fala.',
    },
    loadComponent: () =>
      import('./features/communication/communication-page').then((m) => m.CommunicationPage),
  },
  {
    path: 'desenhos',
    title: 'Meus desenhos',
    data: {
      description:
        'A prancheta do Pedro Henrique: escolha as cores, desenhe no site e guarde os desenhos no aparelho.',
    },
    loadComponent: () => import('./features/drawings/drawings-page').then((m) => m.DrawingsPage),
  },
  {
    path: 'galeria',
    title: 'Galeria',
    data: {
      description: 'Desenhos, passeios, escola e família nas imagens favoritas do Pedro Henrique.',
    },
    loadComponent: () => import('./features/gallery/gallery-page').then((m) => m.GalleryPage),
  },
  {
    path: 'historia',
    title: 'Minha história',
    data: { description: 'A linha do tempo do Pedro Henrique, de 2019 até hoje.' },
    loadComponent: () => import('./features/story/story-page').then((m) => m.StoryPage),
  },
  {
    path: 'ideias',
    title: 'Minhas ideias',
    data: { description: 'Invenções e projetos que o Pedro Henrique quer construir.' },
    loadComponent: () => import('./features/ideas/ideas-page').then((m) => m.IdeasPage),
  },
  {
    path: 'jogos/pedro-maker',
    data: {
      description:
        'Pedro Maker: a grande aventura de plataforma do Pedro Henrique. Corra, pule, pegue cristais, vença chefões e crie as suas próprias fases.',
    },
    loadChildren: () =>
      import('./features/games/pedro-maker/pedro-maker.routes').then((m) => m.PEDRO_MAKER_ROUTES),
  },
  {
    path: 'jogos',
    title: 'Jogos',
    data: {
      description:
        'Jogo da memória, jogo da velha, trilha dos feijões, quiz e um jogo de inglês para brincar com o Pedro Henrique.',
    },
    loadComponent: () => import('./features/games/games-page').then((m) => m.GamesPage),
  },
  {
    path: 'mascote',
    title: 'Meu mascote',
    data: {
      description:
        'O companheiro de aventuras do Pedro Henrique: escolha o mascote, ganhe XP nos jogos e veja ele evoluir.',
    },
    loadComponent: () => import('./features/pet/pet-page').then((m) => m.PetPage),
  },
  {
    path: 'videos',
    title: 'Vídeos',
    data: { description: 'Vídeos do Pedro Henrique em cards, com descrição e data de gravação.' },
    loadComponent: () => import('./features/videos/videos-page').then((m) => m.VideosPage),
  },
  {
    path: '**',
    title: 'Página não encontrada',
    data: { description: 'Esta página não existe no site do Pedro Henrique.' },
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
