import type { HeroId } from '../models/progress.model';
import type { CharacterPalette } from './character.config';
import { WARIO_COLORS } from './wario.config';

/** Jeito de se mexer de um herói, em proporção à física padrão do jogo. */
export interface HeroAbilities {
  /** Multiplica a velocidade do pulo; a altura cresce com o quadrado dela. */
  readonly jumpMultiplier: number;
  /** Multiplica o freio no chão: abaixo de 1, o herói escorrega ao parar. */
  readonly brakingMultiplier: number;
}

/** Roupa fixa de um herói que não usa o guarda-roupa do Pedro. */
export type HeroOutfit = Omit<CharacterPalette, 'hero'>;

export interface HeroDefinition {
  readonly id: HeroId;
  readonly name: string;
  readonly description: string;
  readonly traits: readonly { readonly emoji: string; readonly label: string }[];
  readonly abilities: HeroAbilities;
  /** `null` quando o herói veste o boné, a camiseta e a mochila escolhidos em "Meu personagem". */
  readonly outfit: HeroOutfit | null;
}

/**
 * Heróis jogáveis.
 *
 * O Gui é o melhor amigo do Pedro, inspirado no irmão de boné verde dos jogos
 * clássicos de plataforma: mais alto, pula mais alto e escorrega um pouquinho
 * ao frear. Mario e Luigi, os encanadores dos jogos clássicos, também pulam
 * mais que o Pedro. As fases continuam justas para todos, porque o validador
 * mede os pulos pelo Pedro, que pula menos.
 */
export const HEROES: readonly HeroDefinition[] = [
  {
    id: 'pedro',
    name: 'Pedro',
    description: 'O aventureiro de boné que dá nome ao jogo.',
    traits: [
      { emoji: '🎯', label: 'Para certinho onde quer' },
      { emoji: '🎨', label: 'Troca boné, camiseta e mochila' },
    ],
    abilities: { jumpMultiplier: 1, brakingMultiplier: 1 },
    outfit: null,
  },
  {
    id: 'gui',
    name: 'Gui',
    description: 'O melhor amigo do Pedro, alto e de boné verde.',
    traits: [
      { emoji: '⬆️', label: 'Pula mais alto' },
      { emoji: '🧊', label: 'Escorrega um pouquinho ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.2), brakingMultiplier: 0.55 },
    outfit: { cap: '#2fae4e', shirt: '#2fae4e', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'mario',
    name: 'Mario',
    description: 'O encanador de boné vermelho e bigodão.',
    traits: [
      { emoji: '⬆️', label: 'Pula um pouquinho mais alto' },
      { emoji: '🎯', label: 'Freia quase sem escorregar' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.1), brakingMultiplier: 0.85 },
    outfit: { cap: '#e52521', shirt: '#e52521', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'luigi',
    name: 'Luigi',
    description: 'O irmão alto do Mario, de boné verde.',
    traits: [
      { emoji: '🚀', label: 'O pulo mais alto de todos' },
      { emoji: '🧊', label: 'Escorrega bastante ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.3), brakingMultiplier: 0.45 },
    outfit: { cap: '#1f9e3a', shirt: '#1f9e3a', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'wario',
    name: 'Wario',
    description: 'Bigodão em zigue-zague, boné amarelo com W e macacão roxo.',
    traits: [
      { emoji: '💪', label: 'Forte e firme nos saltos' },
      { emoji: '🎯', label: 'Freia sem escorregar' },
    ],
    abilities: { jumpMultiplier: 1, brakingMultiplier: 1.1 },
    outfit: { cap: WARIO_COLORS.cap, shirt: WARIO_COLORS.cap, backpack: '#cccccc', backpackStyle: 'none' },
  },
];

export const DEFAULT_HERO: HeroId = 'pedro';

const HEROES_BY_ID = new Map<HeroId, HeroDefinition>(HEROES.map((hero) => [hero.id, hero]));

export function isHeroId(value: unknown): value is HeroId {
  return typeof value === 'string' && HEROES_BY_ID.has(value as HeroId);
}

export function heroDefinition(id: HeroId): HeroDefinition {
  const hero = HEROES_BY_ID.get(id);

  if (!hero) {
    throw new Error(`Herói desconhecido: ${id}`);
  }

  return hero;
}
