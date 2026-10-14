import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import type {
  FlashDifficulty,
  RunnerSetup,
  Shoe,
  ShoeId,
  TrailColor,
  TrailColorId,
} from '../models/runner.model';
import type { FlashTuning } from '../simulation/flash-tuning';

/**
 * Catálogo do vestiário.
 *
 * Os quatro tênis somam a mesma quantidade de pontos (dez): nenhum é melhor
 * em tudo, cada um só é bom num jeito diferente de correr.
 */
export const SHOES: readonly Shoe[] = [
  {
    id: 'relampago',
    label: 'Relâmpago',
    emoji: '⚡',
    description: 'O tênis de todo dia: bom em tudo.',
    color: '#ffd23f',
    stats: { speed: 3, acceleration: 4, jump: 3 },
  },
  {
    id: 'foguete',
    label: 'Foguete',
    emoji: '🚀',
    description: 'O mais rápido da reta, mas demora para embalar.',
    color: '#ff5a3c',
    stats: { speed: 5, acceleration: 2, jump: 3 },
  },
  {
    id: 'mola',
    label: 'Mola',
    emoji: '🦘',
    description: 'Pula alto e sai do lugar num instante.',
    color: '#3ccf7a',
    stats: { speed: 2, acceleration: 4, jump: 4 },
  },
  {
    id: 'dino',
    label: 'Dino',
    emoji: '🦖',
    description: 'Um tênis de dinossauro, forte e veloz.',
    color: '#7b52d3',
    stats: { speed: 4, acceleration: 2, jump: 4 },
  },
];

/** Amarelo abre a lista porque é a cor do raio. */
export const TRAIL_COLORS: readonly TrailColor[] = [
  { id: 'amarelo', label: 'Amarelo raio', hex: '#ffd23f' },
  { id: 'azul', label: 'Azul elétrico', hex: '#3fb8ff' },
  { id: 'vermelho', label: 'Vermelho fogo', hex: '#ff4d4d' },
  { id: 'verde', label: 'Verde neon', hex: '#4dff8a' },
  { id: 'roxo', label: 'Roxo galáxia', hex: '#a678ff' },
  { id: 'rosa', label: 'Rosa cometa', hex: '#ff6fd0' },
];

export const DEFAULT_RUNNER_SETUP: RunnerSetup = { shoe: 'relampago', trail: 'amarelo' };

/** Corredor adversário: um apelido, o tênis, a cor do rastro e as cores da roupa. */
export interface RivalProfile {
  readonly id: string;
  readonly name: string;
  readonly setup: RunnerSetup;
  readonly look: CharacterPalette;
}

/**
 * Os três adversários da corrida.
 *
 * Cada um com tênis e rastro diferentes: na pista, dá para saber quem é quem
 * só pela cor do raio que fica para trás.
 */
export const RIVALS: readonly RivalProfile[] = [
  {
    id: 'ventania',
    name: 'Ventania',
    setup: { shoe: 'foguete', trail: 'azul' },
    look: { hero: 'pedro', cap: '#3fb8ff', shirt: '#ffffff', backpack: '#3fb8ff', backpackStyle: 'none' },
  },
  {
    id: 'faisca',
    name: 'Faísca',
    setup: { shoe: 'mola', trail: 'vermelho' },
    look: { hero: 'pedro', cap: '#ff4d4d', shirt: '#2d2d3a', backpack: '#ff4d4d', backpackStyle: 'none' },
  },
  {
    id: 'cometa',
    name: 'Cometa',
    setup: { shoe: 'dino', trail: 'roxo' },
    look: { hero: 'gui', cap: '#a678ff', shirt: '#ff6fd0', backpack: '#a678ff', backpackStyle: 'none' },
  },
];

export interface DifficultyOption {
  readonly id: FlashDifficulty;
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
  readonly tuning: FlashTuning;
}

/**
 * Fácil vem primeiro e é o padrão: a primeira fase tem que dar vontade de
 * correr de novo.
 *
 * - Fácil: um pouco mais devagar, pulo automático nos buracos, quase não
 *   perde raios e chefões cansam por mais tempo.
 * - Normal: velocidade de verdade e metade dos raios no machucado.
 * - Difícil: tudo no máximo, e o machucado leva todos os raios.
 */
export const DIFFICULTIES: readonly DifficultyOption[] = [
  {
    id: 'facil',
    label: 'Fácil',
    emoji: '🐢',
    description: 'Pulo automático nos buracos e quase nada de castigo.',
    tuning: {
      playerPace: 0.82,
      rivalPace: 0.74,
      rivalLeadLimit: 15,
      rivalLeadPace: 0.75,
      rivalEnergyPerSecond: 0,
      autoJumpGaps: true,
      raioLossFraction: 0.2,
      enemySpeed: 0.7,
      bossHitsFactor: 0.7,
      bossAttackInterval: 1.5,
      bossTiredSeconds: 4.5,
    },
  },
  {
    id: 'normal',
    label: 'Normal',
    emoji: '🐇',
    description: 'Velocidade de verdade e adversários espertos.',
    tuning: {
      playerPace: 0.92,
      rivalPace: 0.88,
      rivalLeadLimit: 30,
      rivalLeadPace: 0.85,
      rivalEnergyPerSecond: 3,
      autoJumpGaps: false,
      raioLossFraction: 0.5,
      enemySpeed: 1,
      bossHitsFactor: 1,
      bossAttackInterval: 1.15,
      bossTiredSeconds: 3.4,
    },
  },
  {
    id: 'dificil',
    label: 'Difícil',
    emoji: '🐆',
    description: 'Tudo no máximo: velocidade, robôs e chefões.',
    tuning: {
      playerPace: 1,
      rivalPace: 0.99,
      rivalLeadLimit: 40,
      rivalLeadPace: 0.9,
      rivalEnergyPerSecond: 6,
      autoJumpGaps: false,
      raioLossFraction: 1,
      enemySpeed: 1.25,
      bossHitsFactor: 1.4,
      bossAttackInterval: 0.85,
      bossTiredSeconds: 2.6,
    },
  },
];

const SHOES_BY_ID = new Map(SHOES.map((shoe) => [shoe.id, shoe]));
const TRAILS_BY_ID = new Map(TRAIL_COLORS.map((trail) => [trail.id, trail]));
const DIFFICULTIES_BY_ID = new Map(DIFFICULTIES.map((option) => [option.id, option]));

/** Ficha do tênis. Falha alto: um id fora do catálogo é erro de programação. */
export function shoe(id: ShoeId): Shoe {
  const found = SHOES_BY_ID.get(id);

  if (!found) {
    throw new Error(`Tênis "${id}" não existe no vestiário.`);
  }

  return found;
}

export function trailColor(id: TrailColorId): TrailColor {
  const found = TRAILS_BY_ID.get(id);

  if (!found) {
    throw new Error(`Rastro "${id}" não existe no vestiário.`);
  }

  return found;
}

export function difficultyOption(id: FlashDifficulty): DifficultyOption {
  const found = DIFFICULTIES_BY_ID.get(id);

  if (!found) {
    throw new Error(`Dificuldade "${id}" não existe.`);
  }

  return found;
}

export function isShoeId(value: unknown): value is ShoeId {
  return typeof value === 'string' && SHOES_BY_ID.has(value as ShoeId);
}

export function isTrailColorId(value: unknown): value is TrailColorId {
  return typeof value === 'string' && TRAILS_BY_ID.has(value as TrailColorId);
}

export function isFlashDifficulty(value: unknown): value is FlashDifficulty {
  return typeof value === 'string' && DIFFICULTIES_BY_ID.has(value as FlashDifficulty);
}
