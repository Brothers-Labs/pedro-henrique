import type { HeroId } from '../models/progress.model';
import type { CharacterPalette } from './character.config';
import { CORAL_PRINCESS, CROWN_GOLD, ESTRELA_PRINCESS, JADE_PRINCESS } from './princess.config';
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
 *
 * Giuseppe, Zeca, Tina, Bruno, Ana, Caio, Nina, Otto, Vavá, Rafa e Duda são
 * heróis originais do Pedro Maker. Nenhum pula menos que o Pedro — senão uma
 * fase validada poderia ficar impossível —, e o que muda entre eles é a altura
 * extra do pulo e o jeito de frear.
 *
 * As princesas Estrela, Jade e Coral também são originais: de vestido rodado e
 * coroa, seguem a mesma regra de nunca pular menos que o Pedro.
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
  {
    id: 'giuseppe',
    name: 'Giuseppe',
    description: 'O padeiro do bairro: bigode grisalho, boné creme e avental marrom.',
    traits: [
      { emoji: '🥖', label: 'Pula igual ao Pedro' },
      { emoji: '🎯', label: 'Para na hora, sem escorregar' },
    ],
    abilities: { jumpMultiplier: 1, brakingMultiplier: 1.2 },
    outfit: { cap: '#f4e3c3', shirt: '#f08a24', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'zeca',
    name: 'Zeca Trovão',
    description: 'O rival barulhento: boné cinza com Z e camiseta amarela de raio.',
    traits: [
      { emoji: '⚡', label: 'Pula alto como um trovão' },
      { emoji: '🧊', label: 'Derrapa um pouco ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.15), brakingMultiplier: 0.7 },
    outfit: { cap: '#5d6372', shirt: '#ffd23f', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'tina',
    name: 'Tina Turbo',
    description: 'A rival mais rápida das pistas: boné turquesa e camiseta rosa.',
    traits: [
      { emoji: '🚀', label: 'Pula bem alto' },
      { emoji: '🛼', label: 'Escorrega bastante ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.25), brakingMultiplier: 0.5 },
    outfit: { cap: '#14b8a6', shirt: '#ff4f9a', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'bruno',
    name: 'Bruno Bigorna',
    description: 'O rival ferreiro: baixinho, ruivo e firme como uma bigorna.',
    traits: [
      { emoji: '🔨', label: 'Pula igual ao Pedro' },
      { emoji: '🧱', label: 'Freia mais firme que todos' },
    ],
    abilities: { jumpMultiplier: 1, brakingMultiplier: 1.3 },
    outfit: { cap: '#d0632a', shirt: '#7b4a2b', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'ana',
    name: 'Ana Faísca',
    description: 'A inventora da turma: boné roxo, camiseta lilás e macacão grafite.',
    traits: [
      { emoji: '🔧', label: 'Pula um pouquinho mais alto' },
      { emoji: '🎯', label: 'Freia quase sem escorregar' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.1), brakingMultiplier: 0.9 },
    outfit: { cap: '#7b52d3', shirt: '#c9a7ff', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'caio',
    name: 'Caio Cometa',
    description: 'O ruivo que sonha com o espaço: boné azul-marinho e macacão prateado.',
    traits: [
      { emoji: '☄️', label: 'Pula alto como um cometa' },
      { emoji: '🧊', label: 'Derrapa um pouco ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.2), brakingMultiplier: 0.6 },
    outfit: { cap: '#1f3a8a', shirt: '#ff8a3d', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'nina',
    name: 'Nina Neblina',
    description: 'Leve como a névoa: cabelo prateado e roupa toda em azul-claro.',
    traits: [
      { emoji: '🌫️', label: 'Pula tão alto quanto o Luigi' },
      { emoji: '🛼', label: 'Escorrega mais que todos ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.3), brakingMultiplier: 0.4 },
    outfit: { cap: '#9fd3ff', shirt: '#eef1f6', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'otto',
    name: 'Otto Onda',
    description: 'O surfista bigodudo: boné verde-água e camiseta azul do mar.',
    traits: [
      { emoji: '🏄', label: 'Pula igual ao Pedro' },
      { emoji: '⚖️', label: 'Freia na medida certa' },
    ],
    abilities: { jumpMultiplier: 1, brakingMultiplier: 1 },
    outfit: { cap: '#12b886', shirt: '#2bb7c9', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'vava',
    name: 'Vavá Varapau',
    description: 'O rival mais comprido da turma: boné vinho com V, camiseta verde-limão e bigodinho fino.',
    traits: [
      { emoji: '🦒', label: 'Pernas compridas, pulo bem alto' },
      { emoji: '🛼', label: 'Escorrega bastante ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.3), brakingMultiplier: 0.5 },
    outfit: { cap: '#7a1f3d', shirt: '#a6e22e', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'rafa',
    name: 'Rafa Rodopio',
    description: 'O rival que imita todo mundo: boné laranja com R, camiseta roxa e macacão mostarda.',
    traits: [
      { emoji: '🌀', label: 'Pula um pouco mais alto' },
      { emoji: '⚖️', label: 'Escorrega só um tiquinho' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.15), brakingMultiplier: 0.8 },
    outfit: { cap: '#ff8a3d', shirt: '#8e44c9', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'duda',
    name: 'Duda Dínamo',
    description: 'Baixinho e cheio de energia: boné verde-escuro com D e macacão cor de tijolo.',
    traits: [
      { emoji: '🔋', label: 'Pula igual ao Pedro' },
      { emoji: '🧱', label: 'Freia firme, sem escorregar' },
    ],
    abilities: { jumpMultiplier: 1, brakingMultiplier: 1.15 },
    outfit: { cap: '#1f6b3a', shirt: '#ffd23f', backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'estrela',
    name: 'Princesa Estrela',
    description: 'A princesa que conta as estrelas: vestido lilás e coroa com pedra azul.',
    traits: [
      { emoji: '⭐', label: 'Pula um pouco mais alto' },
      { emoji: '🎯', label: 'Freia quase sem escorregar' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.15), brakingMultiplier: 0.9 },
    outfit: { cap: CROWN_GOLD, shirt: ESTRELA_PRINCESS.dress, backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'jade',
    name: 'Princesa Jade',
    description: 'A princesa do jardim: vestido verde-jade, cabelo preto e pedra vermelha.',
    traits: [
      { emoji: '🌿', label: 'Pula igual ao Pedro' },
      { emoji: '🧱', label: 'Para firme, sem escorregar' },
    ],
    abilities: { jumpMultiplier: 1, brakingMultiplier: 1.2 },
    outfit: { cap: CROWN_GOLD, shirt: JADE_PRINCESS.dress, backpack: '#cccccc', backpackStyle: 'none' },
  },
  {
    id: 'coral',
    name: 'Princesa Coral',
    description: 'A princesa do mar: vestido coral com barra turquesa e cabelo ruivo.',
    traits: [
      { emoji: '🌊', label: 'Pula bem alto, como uma onda' },
      { emoji: '🛼', label: 'Escorrega um pouco ao frear' },
    ],
    abilities: { jumpMultiplier: Math.sqrt(1.25), brakingMultiplier: 0.6 },
    outfit: { cap: CROWN_GOLD, shirt: CORAL_PRINCESS.dress, backpack: '#cccccc', backpackStyle: 'none' },
  },
];

export const DEFAULT_HERO: HeroId = 'pedro';

const HEROES_BY_ID = new Map<HeroId, HeroDefinition>(HEROES.map((hero) => [hero.id, hero]));

export function isHeroId(value: unknown): value is HeroId {
  return typeof value === 'string' && HEROES_BY_ID.has(value as HeroId);
}

/**
 * Quem o Cogumelo Troca-Personagem traz: o herói seguinte da turma, na ordem
 * da tela de personagens, voltando ao começo depois do último. Em ordem, e não
 * sorteado, para a criança ver a turma inteira pegando cogumelo atrás de cogumelo.
 */
export function nextHero(id: HeroId): HeroId {
  const index = HEROES.findIndex((hero) => hero.id === id);

  return HEROES[(index + 1) % HEROES.length].id;
}

export function heroDefinition(id: HeroId): HeroDefinition {
  const hero = HEROES_BY_ID.get(id);

  if (!hero) {
    throw new Error(`Herói desconhecido: ${id}`);
  }

  return hero;
}
