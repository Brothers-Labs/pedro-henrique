import type {
  LevelObject,
  LevelObjectProperties,
  LevelObjectType,
  LevelTheme,
} from '../models/level.model';

/**
 * Como um objeto ocupa a grade.
 *
 * - `solid`: bloqueia por todos os lados;
 * - `one-way`: sustenta quem cai de cima e deixa passar por baixo;
 * - `hazard`: machuca quem encosta;
 * - `none`: não interfere no movimento.
 */
export type ObjectSurface = 'solid' | 'one-way' | 'hazard' | 'none';

export interface ObjectBehavior {
  readonly surface: ObjectSurface;
  /** Só pode existir um na fase (início e portal). */
  readonly isUnique: boolean;
}

export const OBJECT_BEHAVIOR: Readonly<Record<LevelObjectType, ObjectBehavior>> = {
  ground: { surface: 'solid', isUnique: false },
  stone: { surface: 'solid', isUnique: false },
  ice: { surface: 'solid', isUnique: false },
  sand: { surface: 'solid', isUnique: false },
  wood: { surface: 'solid', isUnique: false },
  pipe: { surface: 'solid', isUnique: false },
  brick: { surface: 'solid', isUnique: false },
  surprise: { surface: 'solid', isUnique: false },
  spring: { surface: 'one-way', isUnique: false },
  crumble: { surface: 'one-way', isUnique: false },
  platform: { surface: 'one-way', isUnique: false },
  cloud: { surface: 'one-way', isUnique: false },
  lava: { surface: 'hazard', isUnique: false },
  'moving-platform': { surface: 'none', isUnique: false },
  slime: { surface: 'none', isUnique: false },
  spiky: { surface: 'none', isUnique: false },
  bat: { surface: 'none', isUnique: false },
  robot: { surface: 'none', isUnique: false },
  ghost: { surface: 'none', isUnique: false },
  boss: { surface: 'none', isUnique: true },
  coin: { surface: 'none', isUnique: false },
  crystal: { surface: 'none', isUnique: false },
  heart: { surface: 'none', isUnique: false },
  'power-up': { surface: 'none', isUnique: false },
  start: { surface: 'none', isUnique: true },
  checkpoint: { surface: 'none', isUnique: false },
  portal: { surface: 'none', isUnique: true },
  door: { surface: 'none', isUnique: false },
  'secret-door': { surface: 'none', isUnique: false },
  tree: { surface: 'none', isUnique: false },
  bush: { surface: 'none', isUnique: false },
  flower: { surface: 'none', isUnique: false },
  rock: { surface: 'none', isUnique: false },
  sign: { surface: 'none', isUnique: false },
  hint: { surface: 'none', isUnique: false },
  'mascot-tip': { surface: 'none', isUnique: false },
};

export type EditorCategoryId =
  | 'terreno'
  | 'blocos'
  | 'inimigos'
  | 'itens'
  | 'plataformas'
  | 'decoracao'
  | 'power-ups'
  | 'portais'
  | 'checkpoints';

export interface EditorCategory {
  readonly id: EditorCategoryId;
  readonly label: string;
  readonly emoji: string;
}

export const EDITOR_CATEGORIES: readonly EditorCategory[] = [
  { id: 'terreno', label: 'Terreno', emoji: '🟫' },
  { id: 'blocos', label: 'Blocos', emoji: '🧱' },
  { id: 'inimigos', label: 'Inimigos', emoji: '👾' },
  { id: 'itens', label: 'Itens', emoji: '🪙' },
  { id: 'plataformas', label: 'Plataformas', emoji: '🟰' },
  { id: 'decoracao', label: 'Decoração', emoji: '🌳' },
  { id: 'power-ups', label: 'Power-ups', emoji: '⚡' },
  { id: 'portais', label: 'Portais', emoji: '🌀' },
  { id: 'checkpoints', label: 'Checkpoints', emoji: '🚩' },
];

/**
 * Peça da paleta do editor.
 *
 * Uma mesma peça de jogo pode aparecer mais de uma vez com propriedades
 * diferentes — o bloco surpresa de moedas e o de coração, por exemplo.
 */
export interface EditorPiece {
  readonly id: string;
  readonly category: EditorCategoryId;
  readonly type: LevelObjectType;
  readonly label: string;
  readonly properties?: LevelObjectProperties;
}

export const EDITOR_PIECES: readonly EditorPiece[] = [
  { id: 'ground', category: 'terreno', type: 'ground', label: 'Grama' },
  { id: 'stone', category: 'terreno', type: 'stone', label: 'Pedra' },
  { id: 'ice', category: 'terreno', type: 'ice', label: 'Gelo' },
  { id: 'sand', category: 'terreno', type: 'sand', label: 'Areia' },
  { id: 'wood', category: 'terreno', type: 'wood', label: 'Madeira' },
  { id: 'lava', category: 'terreno', type: 'lava', label: 'Lava' },

  { id: 'brick', category: 'blocos', type: 'brick', label: 'Quebrável' },
  { id: 'pipe', category: 'blocos', type: 'pipe', label: 'Cano' },
  { id: 'surprise-coins', category: 'blocos', type: 'surprise', label: 'Surpresa', properties: { contents: 'coins' } },
  { id: 'surprise-heart', category: 'blocos', type: 'surprise', label: 'Surpresa ❤️', properties: { contents: 'heart' } },
  { id: 'surprise-crystal', category: 'blocos', type: 'surprise', label: 'Surpresa 💎', properties: { contents: 'crystal' } },
  {
    id: 'surprise-power',
    category: 'blocos',
    type: 'surprise',
    label: 'Surpresa ⚡',
    properties: { contents: 'power-up', powerUp: 'super-jump' },
  },

  { id: 'slime', category: 'inimigos', type: 'slime', label: 'Slime' },
  { id: 'spiky', category: 'inimigos', type: 'spiky', label: 'Espinhudo' },
  { id: 'bat', category: 'inimigos', type: 'bat', label: 'Morcego' },
  { id: 'robot', category: 'inimigos', type: 'robot', label: 'Robô' },
  { id: 'ghost', category: 'inimigos', type: 'ghost', label: 'Fantasminha' },

  { id: 'coin', category: 'itens', type: 'coin', label: 'Moeda' },
  { id: 'crystal', category: 'itens', type: 'crystal', label: 'Cristal' },
  { id: 'heart', category: 'itens', type: 'heart', label: 'Coração' },

  { id: 'platform', category: 'plataformas', type: 'platform', label: 'Plataforma' },
  { id: 'cloud', category: 'plataformas', type: 'cloud', label: 'Nuvem' },
  {
    id: 'moving-horizontal',
    category: 'plataformas',
    type: 'moving-platform',
    label: 'Móvel ↔',
    properties: { axis: 'horizontal', range: 4 },
  },
  {
    id: 'moving-vertical',
    category: 'plataformas',
    type: 'moving-platform',
    label: 'Móvel ↕',
    properties: { axis: 'vertical', range: 3 },
  },
  { id: 'crumble', category: 'plataformas', type: 'crumble', label: 'Desaparece' },
  { id: 'spring', category: 'plataformas', type: 'spring', label: 'Mola' },

  { id: 'tree', category: 'decoracao', type: 'tree', label: 'Árvore' },
  { id: 'bush', category: 'decoracao', type: 'bush', label: 'Arbusto' },
  { id: 'flower', category: 'decoracao', type: 'flower', label: 'Flor' },
  { id: 'rock', category: 'decoracao', type: 'rock', label: 'Pedrinha' },
  { id: 'sign', category: 'decoracao', type: 'sign', label: 'Placa', properties: { text: 'Fase do Pedro!' } },

  { id: 'power-super-jump', category: 'power-ups', type: 'power-up', label: 'Super Pulo', properties: { powerUp: 'super-jump' } },
  { id: 'power-shield', category: 'power-ups', type: 'power-up', label: 'Escudo', properties: { powerUp: 'shield' } },
  { id: 'power-turbo', category: 'power-ups', type: 'power-up', label: 'Turbo', properties: { powerUp: 'turbo' } },
  { id: 'power-magnet', category: 'power-ups', type: 'power-up', label: 'Ímã', properties: { powerUp: 'magnet' } },
  { id: 'power-wings', category: 'power-ups', type: 'power-up', label: 'Asa', properties: { powerUp: 'wings' } },

  { id: 'start', category: 'portais', type: 'start', label: 'Início' },
  { id: 'portal', category: 'portais', type: 'portal', label: 'Portal final' },
  { id: 'door-a', category: 'portais', type: 'door', label: 'Porta A', properties: { pair: 'A' } },
  { id: 'door-b', category: 'portais', type: 'door', label: 'Porta B', properties: { pair: 'B' } },

  { id: 'checkpoint', category: 'checkpoints', type: 'checkpoint', label: 'Checkpoint' },
];

/**
 * Peça da paleta que corresponde a uma peça já colocada na fase.
 *
 * O mesmo tipo pode ter várias peças (Porta A e Porta B, surpresa de moedas e
 * de coração): vale a que tem as mesmas propriedades; sem nenhuma igual, a
 * primeira do tipo.
 */
export function findEditorPiece(object: Pick<LevelObject, 'type' | 'properties'>): EditorPiece | undefined {
  const sameType = EDITOR_PIECES.filter((piece) => piece.type === object.type);
  const properties = object.properties ?? {};

  return (
    sameType.find((piece) =>
      Object.entries(piece.properties ?? {}).every(([key, value]) => properties[key as keyof LevelObjectProperties] === value),
    ) ?? sameType[0]
  );
}

export const POWER_UP_LABELS = {
  'super-jump': { label: 'Super Pulo', emoji: '🦘' },
  shield: { label: 'Escudo', emoji: '🛡️' },
  turbo: { label: 'Turbo', emoji: '⚡' },
  magnet: { label: 'Ímã', emoji: '🧲' },
  wings: { label: 'Asa', emoji: '🪽' },
} as const;

export const THEME_LABELS: Readonly<Record<LevelTheme, { readonly label: string; readonly emoji: string }>> = {
  vale: { label: 'Vale', emoji: '🌳' },
  floresta: { label: 'Floresta', emoji: '🌲' },
  caverna: { label: 'Caverna', emoji: '💎' },
  deserto: { label: 'Deserto', emoji: '🏜️' },
  gelo: { label: 'Gelo', emoji: '❄️' },
  vulcao: { label: 'Vulcão', emoji: '🌋' },
  estrelas: { label: 'Estrelas', emoji: '🌌' },
  castelo: { label: 'Castelo', emoji: '🏰' },
  praia: { label: 'Praia', emoji: '🏖️' },
};

/** Temas que o Pedro pode escolher para as próprias fases. */
export const EDITOR_THEMES: readonly LevelTheme[] = [
  'vale',
  'floresta',
  'caverna',
  'deserto',
  'gelo',
  'vulcao',
  'estrelas',
  'praia',
];
