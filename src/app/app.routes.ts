import { Routes } from '@angular/router';

import { guestOnlyGuard } from './core/guards/guest-only.guard';

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
    path: 'jogos/pedro-kart',
    data: {
      description:
        'Pedro Kart: corridas de kart com o Pedro Maker em cinco pistas, garagem de karts coloridos e o Pedro Kart Maker para criar as próprias pistas.',
    },
    loadChildren: () =>
      import('./features/games/pedro-kart/pedro-kart.routes').then((m) => m.PEDRO_KART_ROUTES),
  },
  {
    path: 'jogos/pedro-flash',
    data: {
      description:
        'Pedro Flash: o Pedro corre na velocidade do raio em 3D, com loopings, robôs, corridas, chefões e o Pedro Flash Maker para criar fases.',
    },
    loadChildren: () =>
      import('./features/games/pedro-flash/pedro-flash.routes').then((m) => m.PEDRO_FLASH_ROUTES),
  },
  {
    path: 'jogos/pedro-craft',
    data: {
      description:
        'PedroCraft: o jogo de blocos do Pedro Henrique. Colha madeira, pedra e água, construa, fabrique ferramentas e cuide da fazenda.',
    },
    loadChildren: () =>
      import('./features/games/pedro-craft/pedro-craft.routes').then((m) => m.PEDRO_CRAFT_ROUTES),
  },
  {
    path: 'jogos/pedro-sprunks',
    data: {
      description:
        'Pedro Sprunks: monte uma banda de bonecos cantores, toque neles para ver as ações e crie os seus próprios personagens.',
    },
    loadChildren: () =>
      import('./features/games/pedro-sprunks/pedro-sprunks.routes').then((m) => m.PEDRO_SPRUNKS_ROUTES),
  },
  {
    path: 'jogos/pedro-pedrere',
    data: {
      description:
        'Pedro Pedrerê: aventuras de plataforma, pula-pula, corrida contra os amigos, roupa do personagem e modo maker para criar fases.',
    },
    loadChildren: () =>
      import('./features/games/pedro-pedrere/pedro-pedrere.routes').then((m) => m.PEDRO_PEDRERE_ROUTES),
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
    path: 'aventura',
    data: {
      description:
        'O Mapa da Aventura do Pedro Henrique: mundos, fases e desafios para aprender junto com o mascote.',
    },
    loadChildren: () => import('./features/adventure/adventure.routes').then((m) => m.ADVENTURE_ROUTES),
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
    path: 'pedro-tube',
    data: {
      description:
        'PedroTube: o canal de vídeos do Pedro Henrique. Assista, crie o seu canal, faça vídeos de animação ou com a câmera e invente efeitos.',
    },
    loadChildren: () => import('./features/pedro-tube/pedro-tube.routes').then((m) => m.PEDRO_TUBE_ROUTES),
  },
  {
    path: 'planos',
    title: 'Planos',
    data: {
      description:
        'Os planos do site do Pedro Henrique: Essencial, Completo e Premium, com pagamento por Pix.',
    },
    loadComponent: () => import('./features/plans/plans-page').then((m) => m.PlansPage),
  },
  {
    path: 'entrar',
    title: 'Entrar',
    data: { description: 'Entre na sua conta do site do Pedro Henrique.' },
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./features/auth/pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'cadastro',
    title: 'Criar conta',
    data: { description: 'Crie a sua conta no site do Pedro Henrique.' },
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/pages/register/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'recuperar-senha',
    title: 'Recuperar senha',
    data: { description: 'Receba por e-mail um link para criar uma senha nova.' },
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password-page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'redefinir-senha',
    title: 'Criar senha nova',
    data: { description: 'Escolha uma senha nova para a sua conta.' },
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password-page').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    // Jogo separado do resto do site: abre em tela cheia, sem o cabeçalho e os menus.
    path: 'pedro-aventura',
    data: {
      immersive: true,
      description:
        'Temporada do Pedro: o jogo 3D do Pedro Henrique, com lobby, mapa de seis regiões, corridas, missões e passe de temporada.',
    },
    loadChildren: () =>
      import('./features/pedro-aventura/pedro-aventura.routes').then((m) => m.PEDRO_AVENTURA_ROUTES),
  },
  {
    path: '**',
    title: 'Página não encontrada',
    data: { description: 'Esta página não existe no site do Pedro Henrique.' },
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
