import type { SiteSection } from '../models/site-section.model';

/** Fonte única do menu de navegação e dos cartões da seção "Explore". */
export const SITE_SECTIONS: readonly SiteSection[] = [
  {
    id: 'inicio',
    label: 'Início',
    route: '/',
    emoji: '🏠',
    description: 'A porta de entrada do meu mundo, com tudo que eu gosto.',
    color: 'pink',
  },
  {
    id: 'galeria',
    label: 'Galeria',
    route: '/galeria',
    emoji: '🖼️',
    description: 'Meus desenhos, passeios e momentos preferidos em imagens.',
    color: 'blue',
  },
  {
    id: 'historia',
    label: 'História',
    route: '/historia',
    emoji: '📜',
    description: 'A linha do tempo da minha vida, ano por ano.',
    color: 'purple',
  },
  {
    id: 'ideias',
    label: 'Ideias',
    route: '/ideias',
    emoji: '💡',
    description: 'Invenções que eu quero construir quando crescer (ou amanhã).',
    color: 'yellow',
  },
  {
    id: 'jogos',
    label: 'Jogos',
    route: '/jogos',
    emoji: '🎮',
    description: 'Três joguinhos para você brincar comigo agora mesmo.',
    color: 'mint',
  },
  {
    id: 'videos',
    label: 'Vídeos',
    route: '/videos',
    emoji: '🎬',
    description: 'Meus vídeos organizados em cards com descrição e data.',
    color: 'orange',
  },
];

/** Seções internas (tudo menos a home), usadas nos cartões de exploração. */
export const EXPLORABLE_SECTIONS: readonly SiteSection[] = SITE_SECTIONS.filter(
  (section) => section.id !== 'inicio',
);
