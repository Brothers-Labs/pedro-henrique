import type { TubeChannel, TubeVideo } from '../models/tube.model';

export const PEDRO_CHANNEL_ID = 'canal-pedro';
export const GAMES_CHANNEL_ID = 'canal-pedro-games';

/**
 * Canais que já vêm com o PedroTube. Não podem ser apagados, mas recebem
 * vídeos novos como qualquer outro.
 */
export const SEED_CHANNELS: readonly TubeChannel[] = [
  {
    id: PEDRO_CHANNEL_ID,
    name: 'Pedro Henrique',
    handle: 'pedrohenrique',
    avatar: '👷',
    color: '#e5243b',
    description: 'O canal oficial do Pedro: como fazer vídeos, invenções e muita diversão.',
    createdAt: '2026-11-15T12:00:00.000Z',
  },
  {
    id: GAMES_CHANNEL_ID,
    name: 'Pedro Games',
    handle: 'pedrogames',
    avatar: '🎮',
    color: '#7b52d3',
    description: 'Os jogos do site do Pedro: Pedro Maker, Pedro Kart, PedroCraft e mais.',
    createdAt: '2026-11-15T12:00:00.000Z',
  },
];

/** Vídeos de animação prontos: tocam no navegador sem nenhum arquivo. */
export const SEED_VIDEOS: readonly TubeVideo[] = [
  {
    id: 'video-como-fazer-videos',
    channelId: PEDRO_CHANNEL_ID,
    title: 'Como fazer vídeos',
    description: 'O Pedro ensina a criar o seu canal, montar um vídeo e colocar efeitos. Inscreva-se!',
    createdAt: '2026-11-15T12:00:00.000Z',
    source: 'animacao',
    scenes: [
      { emoji: '👷', text: 'Oi! Bem-vindo ao PedroTube!', background: '#2a2350', motion: 'pular', seconds: 3 },
      { emoji: '📺', text: 'Primeiro, crie o seu canal', background: '#e5243b', motion: 'crescer', seconds: 3 },
      { emoji: '🎬', text: 'Depois, monte o seu vídeo', background: '#7b52d3', motion: 'girar', seconds: 3 },
      { emoji: '✨', text: 'Escolha um efeito bem legal', background: '#2ba8e0', motion: 'tremer', seconds: 3 },
      { emoji: '🔔', text: 'Inscreva-se e ative o sininho!', background: '#e5243b', motion: 'pular', seconds: 3 },
    ],
    mediaId: null,
    durationSeconds: 15,
    posterDataUrl: null,
    effectId: 'neon',
  },
  {
    id: 'video-festa-do-canal',
    channelId: PEDRO_CHANNEL_ID,
    title: 'Festa do canal!',
    description: 'Comemorando o PedroTube no ar com bolo, confete e muita música.',
    createdAt: '2026-11-15T11:00:00.000Z',
    source: 'animacao',
    scenes: [
      { emoji: '🎂', text: 'O PedroTube está no ar!', background: '#ff4f9a', motion: 'crescer', seconds: 3 },
      { emoji: '🎵', text: 'Todo mundo dançando', background: '#ffb703', motion: 'tremer', seconds: 3 },
      { emoji: '❤️', text: 'Obrigado por assistir!', background: '#12b886', motion: 'pular', seconds: 3 },
    ],
    mediaId: null,
    durationSeconds: 9,
    posterDataUrl: null,
    effectId: 'festa',
  },
  {
    id: 'video-corrida-de-kart',
    channelId: GAMES_CHANNEL_ID,
    title: 'Corrida de kart na velocidade máxima',
    description: 'Três voltas no Pedro Kart, com turbo e chegada em primeiro lugar.',
    createdAt: '2026-11-14T18:00:00.000Z',
    source: 'animacao',
    scenes: [
      { emoji: '🚦', text: 'Preparar… apontar…', background: '#2a2350', motion: 'tremer', seconds: 2 },
      { emoji: '🏎️', text: 'Vaaai! Turbo ligado!', background: '#f4772e', motion: 'deslizar', seconds: 3 },
      { emoji: '🏆', text: 'Primeiro lugar!', background: '#ffb703', motion: 'crescer', seconds: 3 },
    ],
    mediaId: null,
    durationSeconds: 8,
    posterDataUrl: null,
    effectId: 'explosao',
  },
  {
    id: 'video-dinossauro-no-gelo',
    channelId: GAMES_CHANNEL_ID,
    title: 'O dinossauro que foi para o gelo',
    description: 'Uma aventura no PedroCraft: o dinossauro encontrou um mundo de neve.',
    createdAt: '2026-11-13T15:00:00.000Z',
    source: 'animacao',
    scenes: [
      { emoji: '🦖', text: 'Era uma vez um dinossauro', background: '#12b886', motion: 'pular', seconds: 3 },
      { emoji: '🏔️', text: 'Ele subiu a montanha', background: '#2ba8e0', motion: 'deslizar', seconds: 3 },
      { emoji: '⛄', text: 'E fez um amigo de neve!', background: '#d5f0ff', motion: 'girar', seconds: 3 },
    ],
    mediaId: null,
    durationSeconds: 9,
    posterDataUrl: null,
    effectId: 'gelo',
  },
];
