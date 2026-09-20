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
    id: 'falar',
    label: 'Falar',
    route: '/falar',
    emoji: '🗣️',
    description: 'A minha prancha de cartões: eu monto a frase e o computador fala.',
    color: 'purple',
  },
  {
    id: 'desenhos',
    label: 'Desenhos',
    route: '/desenhos',
    emoji: '🎨',
    description: 'A minha prancheta: escolho as cores e desenho o que eu quiser.',
    color: 'orange',
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
    description: 'Cinco joguinhos para brincar comigo e até aprender inglês.',
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

/**
 * Destinos fixos da barra inferior do celular.
 *
 * São os quatro lugares que o Pedro Henrique usa no dia a dia: a prancha de
 * falar, a prancheta de desenho e os jogos. O resto do site — inclusive a
 * galeria de fotos — continua a um toque de distância, no menu "Mais".
 */
export const PRIMARY_SECTIONS: readonly SiteSection[] = [
  'inicio',
  'falar',
  'desenhos',
  'jogos',
].map(
  (id) => {
    const section = SITE_SECTIONS.find((candidate) => candidate.id === id);

    if (!section) {
      throw new Error(`Seção "${id}" não existe em SITE_SECTIONS.`);
    }

    return section;
  },
);
