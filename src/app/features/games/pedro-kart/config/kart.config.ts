import type {
  KartBody,
  KartBodyId,
  KartColor,
  KartColorId,
  KartSetup,
  RaceDifficulty,
} from '../models/kart.model';

/**
 * Catálogo da garagem.
 *
 * Os quatro karts somam a mesma quantidade de pontos (dez): nenhum é melhor
 * em tudo, cada um só é bom num jeito diferente de correr.
 */
export const KART_BODIES: readonly KartBody[] = [
  {
    id: 'classico',
    label: 'Clássico',
    emoji: '🏎️',
    description: 'O kart de todo dia: bom em tudo.',
    stats: { speed: 3, acceleration: 4, handling: 3 },
  },
  {
    id: 'foguete',
    label: 'Foguete',
    emoji: '🚀',
    description: 'O mais rápido da reta, mas demora para embalar.',
    stats: { speed: 5, acceleration: 2, handling: 3 },
  },
  {
    id: 'buggy',
    label: 'Buggy',
    emoji: '🛞',
    description: 'Faz curva fácil e sai do lugar num instante.',
    stats: { speed: 2, acceleration: 4, handling: 4 },
  },
  {
    id: 'dino',
    label: 'Dino',
    emoji: '🦖',
    description: 'Um kart dinossauro, forte e rápido nas curvas.',
    stats: { speed: 4, acceleration: 2, handling: 4 },
  },
];

/** Azul abre a lista porque é a cor favorita do Pedro. */
export const KART_COLORS: readonly KartColor[] = [
  { id: 'azul', label: 'Azul', hex: '#2b7fd9' },
  { id: 'vermelho', label: 'Vermelho', hex: '#e03131' },
  { id: 'verde', label: 'Verde', hex: '#2fb36a' },
  { id: 'amarelo', label: 'Amarelo', hex: '#f5c211' },
  { id: 'laranja', label: 'Laranja', hex: '#f4772e' },
  { id: 'roxo', label: 'Roxo', hex: '#7b52d3' },
  { id: 'rosa', label: 'Rosa', hex: '#ff6fae' },
  { id: 'preto', label: 'Preto', hex: '#2d2d3a' },
];

export const DEFAULT_KART_SETUP: KartSetup = { body: 'classico', color: 'azul' };

/** Adversário da corrida: um apelido de piloto, o kart e as cores da roupa. */
export interface RivalProfile {
  readonly id: string;
  readonly name: string;
  readonly setup: KartSetup;
  readonly cap: string;
  readonly shirt: string;
}

/**
 * Os cinco adversários.
 *
 * São pilotos inventados, com apelidos de kart, e nenhum usa o mesmo kart e a
 * mesma cor ao mesmo tempo: na pista, dá para saber quem é quem de longe.
 */
export const RIVALS: readonly RivalProfile[] = [
  { id: 'turbo', name: 'Turbo', setup: { body: 'foguete', color: 'vermelho' }, cap: '#e03131', shirt: '#ffffff' },
  { id: 'faisca', name: 'Faísca', setup: { body: 'buggy', color: 'amarelo' }, cap: '#f5c211', shirt: '#2d2d3a' },
  { id: 'cometa', name: 'Cometa', setup: { body: 'classico', color: 'roxo' }, cap: '#7b52d3', shirt: '#ff6fae' },
  { id: 'trovao', name: 'Trovão', setup: { body: 'dino', color: 'verde' }, cap: '#2fb36a', shirt: '#3fa9f5' },
  { id: 'bolinha', name: 'Bolinha', setup: { body: 'buggy', color: 'laranja' }, cap: '#f4772e', shirt: '#3ccf7a' },
];

export interface DifficultyOption {
  readonly id: RaceDifficulty;
  readonly label: string;
  readonly emoji: string;
  /** Fração da velocidade máxima que os adversários usam. */
  readonly rivalPace: number;
}

/** Fácil vem primeiro e é o padrão: a primeira corrida tem que dar vontade de correr de novo. */
export const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'facil', label: 'Fácil', emoji: '🐢', rivalPace: 0.78 },
  { id: 'normal', label: 'Normal', emoji: '🐇', rivalPace: 0.9 },
  { id: 'dificil', label: 'Difícil', emoji: '🐆', rivalPace: 0.99 },
];

const BODIES_BY_ID = new Map(KART_BODIES.map((body) => [body.id, body]));
const COLORS_BY_ID = new Map(KART_COLORS.map((color) => [color.id, color]));
const DIFFICULTIES_BY_ID = new Map(DIFFICULTIES.map((option) => [option.id, option]));

/** Ficha do kart. Falha alto: um id fora do catálogo é erro de programação. */
export function kartBody(id: KartBodyId): KartBody {
  const body = BODIES_BY_ID.get(id);

  if (!body) {
    throw new Error(`Kart "${id}" não existe na garagem.`);
  }

  return body;
}

export function kartColor(id: KartColorId): KartColor {
  const color = COLORS_BY_ID.get(id);

  if (!color) {
    throw new Error(`Cor "${id}" não existe na garagem.`);
  }

  return color;
}

export function difficultyOption(id: RaceDifficulty): DifficultyOption {
  const option = DIFFICULTIES_BY_ID.get(id);

  if (!option) {
    throw new Error(`Dificuldade "${id}" não existe.`);
  }

  return option;
}

export function isKartBodyId(value: unknown): value is KartBodyId {
  return typeof value === 'string' && BODIES_BY_ID.has(value as KartBodyId);
}

export function isKartColorId(value: unknown): value is KartColorId {
  return typeof value === 'string' && COLORS_BY_ID.has(value as KartColorId);
}

export function isRaceDifficulty(value: unknown): value is RaceDifficulty {
  return typeof value === 'string' && DIFFICULTIES_BY_ID.has(value as RaceDifficulty);
}
