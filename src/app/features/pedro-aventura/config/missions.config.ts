import type { MissionDefinition } from '../models/economy.model';

/**
 * Missões da temporada.
 *
 * As diárias são sempre as mesmas quatro: rotina previsível ajuda mais do que
 * surpresa, e a criança sabe de manhã o que vai encontrar.
 */
export const MISSIONS: readonly MissionDefinition[] = [
  {
    id: 'diaria-completar-fase',
    category: 'daily',
    title: 'Completar 1 fase',
    emoji: '🎮',
    metric: 'levels-completed',
    target: 1,
    reward: { xp: 200, coins: 200, diamonds: 5 },
  },
  {
    id: 'diaria-coracoes',
    category: 'daily',
    title: 'Coletar 10 corações',
    emoji: '❤️',
    metric: 'hearts-collected',
    target: 10,
    reward: { xp: 150, coins: 150, diamonds: 5 },
  },
  {
    id: 'diaria-rampas',
    category: 'daily',
    title: 'Saltar 5 rampas',
    emoji: '🛹',
    metric: 'ramps-jumped',
    target: 5,
    reward: { xp: 150, coins: 150, diamonds: 5 },
  },
  {
    id: 'diaria-moedas',
    category: 'daily',
    title: 'Coletar 100 moedas',
    emoji: '🪙',
    metric: 'coins-collected',
    target: 100,
    reward: { xp: 150, coins: 100, diamonds: 5 },
  },
  {
    id: 'semanal-dez-fases',
    category: 'weekly',
    title: 'Completar 10 fases',
    emoji: '🏁',
    metric: 'levels-completed',
    target: 10,
    reward: { xp: 600, coins: 1000, diamonds: 20 },
  },
  {
    id: 'semanal-sem-perder-vidas',
    category: 'weekly',
    title: 'Concluir 3 fases sem perder vidas',
    emoji: '🛡️',
    metric: 'flawless-levels',
    target: 3,
    reward: { xp: 500, coins: 800, diamonds: 20 },
  },
  {
    id: 'semanal-tempo-alvo',
    category: 'weekly',
    title: 'Chegar 3 vezes antes do tempo-alvo',
    emoji: '⏱️',
    metric: 'under-target-time',
    target: 3,
    reward: { xp: 500, coins: 800, diamonds: 20 },
  },
  {
    id: 'semanal-coroas',
    category: 'weekly',
    title: 'Coletar 15 coroas',
    emoji: '👑',
    metric: 'crowns-collected',
    target: 15,
    reward: { xp: 500, coins: 600, diamonds: 15 },
  },
  {
    id: 'temporada-nova-regiao',
    category: 'season',
    title: 'Desbloquear uma nova região',
    emoji: '🗺️',
    metric: 'regions-unlocked',
    target: 1,
    reward: { xp: 800, coins: 1500, diamonds: 40 },
  },
  {
    id: 'temporada-tres-regioes',
    category: 'season',
    title: 'Desbloquear 3 novas regiões',
    emoji: '🧭',
    metric: 'regions-unlocked',
    target: 3,
    reward: { xp: 1500, coins: 3000, diamonds: 80 },
  },
  {
    id: 'temporada-sem-perder-vidas',
    category: 'season',
    title: 'Concluir uma fase sem perder vidas',
    emoji: '💖',
    metric: 'flawless-levels',
    target: 1,
    reward: { xp: 400, coins: 500, diamonds: 15 },
  },
  {
    id: 'temporada-tempo-alvo',
    category: 'season',
    title: 'Finalizar abaixo do tempo-alvo',
    emoji: '⚡',
    metric: 'under-target-time',
    target: 1,
    reward: { xp: 400, coins: 500, diamonds: 15 },
  },
  {
    id: 'especial-corrida-noturna',
    category: 'special',
    title: 'Vencer as 3 Corridas Noturnas',
    emoji: '🌙',
    metric: 'event-levels-completed',
    target: 3,
    reward: { xp: 1200, coins: 2500, diamonds: 60 },
  },
];

export const MISSION_CATEGORY_LABEL = {
  daily: 'Diárias',
  weekly: 'Semanais',
  season: 'Temporada',
  special: 'Especiais',
} as const;
