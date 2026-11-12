import type { NavigationGroup, SiteSection } from '../models/site-section.model';

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
    id: 'aventura',
    label: 'Aventura',
    route: '/aventura',
    emoji: '🗺️',
    description: 'Meu mapa de aventura: atravesso mundos, venço desafios e ganho estrelas com o meu mascote.',
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
    id: 'pedro-maker',
    label: 'Pedro Maker',
    route: '/jogos/pedro-maker',
    emoji: '🗺️',
    description: 'Minha aventura de plataforma: corro, pulo, pego cristais e crio as minhas fases.',
    color: 'blue',
  },
  {
    id: 'pedro-kart',
    label: 'Pedro Kart',
    route: '/jogos/pedro-kart',
    emoji: '🏎️',
    description: 'Minhas corridas de kart: escolho o kart e a cor, corro em cinco pistas e crio as minhas.',
    color: 'orange',
  },
  {
    id: 'pedro-flash',
    label: 'Pedro Flash',
    route: '/jogos/pedro-flash',
    emoji: '⚡',
    description: 'Corro na velocidade do raio: loopings, robôs, chefões, corridas e fases que eu mesmo crio.',
    color: 'purple',
  },
  {
    id: 'pedro-craft',
    label: 'PedroCraft',
    route: '/jogos/pedro-craft',
    emoji: '⛏️',
    description: 'Meu mundo de blocos: colho madeira e pedra, construo, fabrico ferramentas e cuido da fazenda.',
    color: 'mint',
  },
  {
    id: 'pedro-sprunks',
    label: 'Pedro Sprunks',
    route: '/jogos/pedro-sprunks',
    emoji: '🎵',
    description: 'Minha banda de bonecos: toco neles, cada um canta um som e eu crio os meus personagens.',
    color: 'pink',
  },
  {
    id: 'pedro-pedrere',
    label: 'Pedro Pedrerê',
    route: '/jogos/pedro-pedrere',
    emoji: '🤸',
    description: 'Meu jogo de pular: aventuras, pula-pula, corrida com os amigos, a minha roupa e as fases que eu crio.',
    color: 'yellow',
  },
  {
    id: 'mascote',
    label: 'Mascote',
    route: '/mascote',
    emoji: '🐣',
    description: 'Meu companheiro de aventuras: ele cresce e evolui junto comigo.',
    color: 'purple',
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
 * galeria de fotos — continua a um toque de distância, no menu lateral que o
 * botão "Mais" abre.
 */
export const PRIMARY_SECTIONS: readonly SiteSection[] = ['inicio', 'falar', 'desenhos', 'jogos'].map(
  findSection,
);

/**
 * Menu lateral: todas as seções, agrupadas pelo que se faz em cada uma.
 *
 * Cada seção aparece em exatamente um grupo; o teste de
 * `site-sections.data.spec.ts` impede que uma seção nova fique de fora.
 */
export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  { id: 'comecar', label: 'Começar', sections: ['inicio', 'falar'].map(findSection) },
  { id: 'criar', label: 'Criar', sections: ['desenhos', 'ideias'].map(findSection) },
  {
    id: 'brincar',
    label: 'Brincar',
    sections: ['aventura', 'jogos', 'pedro-maker', 'pedro-kart', 'pedro-flash', 'pedro-craft', 'pedro-sprunks', 'pedro-pedrere', 'mascote'].map(findSection),
  },
  { id: 'memorias', label: 'Memórias', sections: ['galeria', 'historia', 'videos'].map(findSection) },
];

function findSection(id: string): SiteSection {
  const section = SITE_SECTIONS.find((candidate) => candidate.id === id);

  if (!section) {
    throw new Error(`Seção "${id}" não existe em SITE_SECTIONS.`);
  }

  return section;
}
