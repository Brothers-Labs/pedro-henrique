import { DEFAULT_SCREEN } from './screen.config';
import type { MakerAchievement } from '../models/progress.model';
import type { DifficultyRules, MakerDifficulty, MakerSettings } from '../models/settings.model';

/**
 * Regras numéricas do Pedro Maker.
 *
 * Todo XP, moeda e estrela nasce destes números. Mudar o equilíbrio do jogo é
 * mudar este arquivo, e só ele.
 */

export const XP_RULES = {
  /** Primeira vez que a fase é concluída. */
  levelCompleted: 100,
  /** Repetir uma fase já vencida ainda vale um pouco: treinar é bom. */
  levelReplayed: 25,
  allCrystals: 50,
  threeStars: 100,
  bossDefeated: 300,
  customLevelCompleted: 20,
  dailyMission: 100,
} as const;

export const COIN_RULES = {
  dailyMission: 30,
  /**
   * Teto de moedas por partida em fase criada no editor.
   *
   * Sem ele, uma fase feita só de moedas viraria uma máquina de moedas — e o
   * prazer de juntar para comprar um boné novo acabaria no primeiro dia.
   */
  customLevelCap: 50,
} as const;

/** Parcela das moedas da fase que vale a segunda estrela. */
export const COIN_STAR_RATIO = 0.7;

export const DAILY_MISSION = {
  levelsToComplete: 2,
  title: 'Complete 2 fases no Pedro Maker',
  emoji: '🎯',
} as const;

/** XP necessário para sair de um nível do aventureiro para o seguinte. */
export function xpForAdventurerLevel(level: number): number {
  return 300 + Math.max(1, Math.trunc(level)) * 100;
}

export const DIFFICULTY_RULES: Readonly<Record<MakerDifficulty, DifficultyRules>> = {
  tranquilo: {
    label: 'Tranquilo',
    emoji: '😊',
    description: 'Cinco corações e inimigos mais devagar.',
    hearts: 5,
    enemySpeed: 0.7,
    invincibilityMs: 2000,
  },
  aventura: {
    label: 'Aventura',
    emoji: '😎',
    description: 'Três corações e tudo no ritmo certo.',
    hearts: 3,
    enemySpeed: 1,
    invincibilityMs: 1500,
  },
  desafio: {
    label: 'Desafio',
    emoji: '🔥',
    description: 'Três corações e inimigos mais rápidos.',
    hearts: 3,
    enemySpeed: 1.25,
    invincibilityMs: 1200,
  },
};

export const DIFFICULTY_ORDER: readonly MakerDifficulty[] = ['tranquilo', 'aventura', 'desafio'];

export const DEFAULT_SETTINGS: MakerSettings = {
  sounds: true,
  music: true,
  vibration: true,
  effects: true,
  touchControls: 'automatico',
  difficulty: 'aventura',
  screen: DEFAULT_SCREEN,
  players: 1,
  partnerHero: 'gui',
  thirdHero: 'tina',
};

export const MAKER_ACHIEVEMENTS: readonly MakerAchievement[] = [
  {
    id: 'primeira-aventura',
    title: 'Primeira aventura',
    description: 'Complete sua primeira fase.',
    emoji: '🏆',
    measure: 'levelsCompleted',
    goal: 1,
  },
  {
    id: 'cacador-de-tesouros',
    title: 'Caçador de tesouros',
    description: 'Colete 100 moedas.',
    emoji: '💰',
    measure: 'coinsCollected',
    goal: 100,
  },
  {
    id: 'explorador',
    title: 'Explorador',
    description: 'Encontre 10 cristais.',
    emoji: '💎',
    measure: 'crystalsFound',
    goal: 10,
  },
  {
    id: 'super-aventureiro',
    title: 'Super aventureiro',
    description: 'Consiga 30 estrelas.',
    emoji: '⭐',
    measure: 'stars',
    goal: 30,
  },
  {
    id: 'cacador-de-chefoes',
    title: 'Caçador de chefões',
    description: 'Derrote seu primeiro chefão.',
    emoji: '👑',
    measure: 'bossesDefeated',
    goal: 1,
  },
  {
    id: 'velocista',
    title: 'Velocista',
    description: 'Complete uma fase abaixo do tempo-alvo.',
    emoji: '⚡',
    measure: 'fastCompletions',
    goal: 1,
  },
  {
    id: 'arquiteto',
    title: 'Arquiteto',
    description: 'Salve a primeira fase criada por você.',
    emoji: '🛠️',
    measure: 'customLevelsSaved',
    goal: 1,
  },
  {
    id: 'segredo-revelado',
    title: 'Segredo revelado',
    description: 'Descubra uma porta secreta.',
    emoji: '🔐',
    measure: 'secretsFound',
    goal: 1,
  },
];

/** Dicas da tela de carregamento. Curtas, para ler enquanto a barra enche. */
export const LOADING_TIPS: readonly string[] = [
  'Existem cristais escondidos pelas fases!',
  'Pule em cima dos slimes para derrotá-los.',
  'Cuidado: o Espinhudo não pode ser pisado!',
  'A bandeira guarda o seu lugar na fase.',
  'Blocos com "?" escondem surpresas.',
  'Algumas paredes escondem portas secretas…',
  'Com a Asa você pode pular duas vezes!',
];
