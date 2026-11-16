import {
  COIN_MULTIPLIER_KINDS,
  coinMultiplierLabel,
  formatCoinValue,
  GIANT_COIN_VALUES,
  giantCoinType,
  type LevelObject,
  type LevelObjectProperties,
  type LevelObjectType,
  type LevelTheme,
  perGiantCoin,
  type PowerUpKind,
} from '../models/level.model';
import { BIG_COIN_VALUE, HUGE_COIN_VALUE } from './physics.config';

/**
 * Como um objeto ocupa a grade.
 *
 * - `solid`: bloqueia por todos os lados;
 * - `one-way`: sustenta quem cai de cima e deixa passar por baixo;
 * - `hazard`: machuca quem encosta;
 * - `water`: não segura nem machuca, mas quem está dentro nada;
 * - `none`: não interfere no movimento.
 */
export type ObjectSurface = 'solid' | 'one-way' | 'hazard' | 'water' | 'none';

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
  'desert-mountain': { surface: 'solid', isUnique: false },
  wood: { surface: 'solid', isUnique: false },
  pipe: { surface: 'solid', isUnique: false },
  cannon: { surface: 'solid', isUnique: false },
  'fire-bar': { surface: 'solid', isUnique: false },
  'p-switch': { surface: 'none', isUnique: false },
  // Porta trancada e corrente são firmes no jogo, mas o validador de alcance
  // conta com a chave e a alavanca: para ele, o caminho por elas fica aberto.
  key: { surface: 'none', isUnique: false },
  'locked-door': { surface: 'none', isUnique: false },
  chain: { surface: 'none', isUnique: false },
  lever: { surface: 'none', isUnique: false },
  // A prensa não é terreno: a simulação cuida da colisão dela enquanto desce e sobe.
  crusher: { surface: 'none', isUnique: false },
  'climb-chain': { surface: 'none', isUnique: false },
  brick: { surface: 'solid', isUnique: false },
  surprise: { surface: 'solid', isUnique: false },
  note: { surface: 'solid', isUnique: false },
  'invisible-grass': { surface: 'solid', isUnique: false },
  spring: { surface: 'one-way', isUnique: false },
  'ceiling-spring': { surface: 'solid', isUnique: false },
  crumble: { surface: 'one-way', isUnique: false },
  platform: { surface: 'one-way', isUnique: false },
  cloud: { surface: 'one-way', isUnique: false },
  lava: { surface: 'hazard', isUnique: false },
  spikes: { surface: 'hazard', isUnique: false },
  water: { surface: 'water', isUnique: false },
  'moving-platform': { surface: 'none', isUnique: false },
  'skeleton-platform': { surface: 'none', isUnique: false },
  slide: { surface: 'none', isUnique: false },
  slime: { surface: 'none', isUnique: false },
  spiky: { surface: 'none', isUnique: false },
  bat: { surface: 'none', isUnique: false },
  robot: { surface: 'none', isUnique: false },
  ghost: { surface: 'none', isUnique: false },
  turtle: { surface: 'none', isUnique: false },
  piranha: { surface: 'none', isUnique: false },
  penguin: { surface: 'none', isUnique: false },
  'lava-bubble': { surface: 'none', isUnique: false },
  bee: { surface: 'none', isUnique: false },
  goomba: { surface: 'none', isUnique: false },
  bullet: { surface: 'none', isUnique: false },
  thwomp: { surface: 'none', isUnique: false },
  'king-slime': { surface: 'none', isUnique: false },
  'iron-ball': { surface: 'none', isUnique: false },
  fish: { surface: 'none', isUnique: false },
  'jumping-fish': { surface: 'none', isUnique: false },
  'king-cactus': { surface: 'none', isUnique: false },
  'living-pumpkin': { surface: 'none', isUnique: false },
  witch: { surface: 'none', isUnique: false },
  boss: { surface: 'none', isUnique: true },
  coin: { surface: 'none', isUnique: false },
  'big-coin': { surface: 'none', isUnique: false },
  'huge-coin': { surface: 'none', isUnique: false },
  ...perGiantCoin((): ObjectBehavior => ({ surface: 'none', isUnique: false })),
  'mega-coin': { surface: 'none', isUnique: false },
  crystal: { surface: 'none', isUnique: false },
  heart: { surface: 'none', isUnique: false },
  'power-up': { surface: 'none', isUnique: false },
  start: { surface: 'none', isUnique: true },
  checkpoint: { surface: 'none', isUnique: false },
  portal: { surface: 'none', isUnique: true },
  door: { surface: 'none', isUnique: false },
  'golden-door': { surface: 'none', isUnique: false },
  'secret-door': { surface: 'none', isUnique: false },
  'warp-pipe': { surface: 'none', isUnique: false },
  'coin-chest': { surface: 'none', isUnique: false },
  tree: { surface: 'none', isUnique: false },
  bush: { surface: 'none', isUnique: false },
  flower: { surface: 'none', isUnique: false },
  rock: { surface: 'none', isUnique: false },
  sign: { surface: 'none', isUnique: false },
  'talking-flower': { surface: 'none', isUnique: false },
  fence: { surface: 'none', isUnique: false },
  snowman: { surface: 'none', isUnique: false },
  toadstool: { surface: 'none', isUnique: false },
  pumpkin: { surface: 'none', isUnique: false },
  barrel: { surface: 'none', isUnique: false },
  lamp: { surface: 'none', isUnique: false },
  grass: { surface: 'none', isUnique: false },
  arrow: { surface: 'none', isUnique: false },
  crate: { surface: 'none', isUnique: false },
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
  | 'cogumelos'
  | 'portais'
  | 'bandeiras';

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
  { id: 'cogumelos', label: 'Cogumelos', emoji: '🍄' },
  { id: 'portais', label: 'Portais', emoji: '🌀' },
  { id: 'bandeiras', label: 'Bandeiras', emoji: '🏁' },
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

interface ValuedCoin {
  readonly value: number;
  readonly type: LevelObjectType;
}

/**
 * Moedas gigantes no editor, da menor para a maior. A de 10 e a de 50 têm tipo
 * próprio, mais antigo, e entram na fila no lugar do valor delas.
 */
const VALUED_COINS: readonly ValuedCoin[] = [
  { value: BIG_COIN_VALUE, type: 'big-coin' },
  { value: HUGE_COIN_VALUE, type: 'huge-coin' },
  ...GIANT_COIN_VALUES.map((value): ValuedCoin => ({ value, type: giantCoinType(value) })),
];

const GIANT_COIN_PIECES: readonly EditorPiece[] = [...VALUED_COINS]
  .sort((first, second) => first.value - second.value)
  .map(({ value, type }): EditorPiece => ({ id: type, category: 'itens', type, label: `Moeda Gigante ${formatCoinValue(value)}` }));

/** Moedas de multiplicação: na aba Itens, ao lado das outras moedas, mas funcionam como poder com tempo. */
const COIN_MULTIPLIER_PIECES: readonly EditorPiece[] = COIN_MULTIPLIER_KINDS.map((kind): EditorPiece => ({
  id: `power-${kind}`,
  category: 'itens',
  type: 'power-up',
  label: `Moeda ${coinMultiplierLabel(kind)}`,
  properties: { powerUp: kind },
}));

/** Canos mágicos em pares de A a F: entrar num leva ao outro cano da mesma letra. */
const WARP_PIPE_PIECES: readonly EditorPiece[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((pair): EditorPiece => ({
  id: `warp-pipe-${pair.toLowerCase()}`,
  category: 'portais',
  type: 'warp-pipe',
  label: `Cano ${pair}`,
  properties: { pair },
}));

export const EDITOR_PIECES: readonly EditorPiece[] = [
  { id: 'ground', category: 'terreno', type: 'ground', label: 'Grama' },
  { id: 'stone', category: 'terreno', type: 'stone', label: 'Pedra' },
  { id: 'ice', category: 'terreno', type: 'ice', label: 'Gelo' },
  { id: 'sand', category: 'terreno', type: 'sand', label: 'Areia' },
  { id: 'desert-mountain', category: 'terreno', type: 'desert-mountain', label: 'Montanha do Deserto' },
  { id: 'wood', category: 'terreno', type: 'wood', label: 'Madeira' },
  { id: 'lava', category: 'terreno', type: 'lava', label: 'Lava' },
  { id: 'water', category: 'terreno', type: 'water', label: 'Água' },
  { id: 'spikes', category: 'terreno', type: 'spikes', label: 'Espinhos' },
  { id: 'invisible-grass', category: 'terreno', type: 'invisible-grass', label: 'Grama Invisível' },

  { id: 'cannon', category: 'blocos', type: 'cannon', label: 'Canhão' },
  { id: 'fire-bar', category: 'blocos', type: 'fire-bar', label: 'Bastão de Fogo', properties: { range: 4 } },
  { id: 'fire-bar-long', category: 'blocos', type: 'fire-bar', label: 'Bastão de Fogo Comprido', properties: { range: 6 } },
  { id: 'brick', category: 'blocos', type: 'brick', label: 'Quebrável' },
  { id: 'p-switch', category: 'blocos', type: 'p-switch', label: 'Botão P' },
  { id: 'chain', category: 'blocos', type: 'chain', label: 'Corrente' },
  { id: 'lever', category: 'blocos', type: 'lever', label: 'Alavanca' },
  { id: 'crusher', category: 'blocos', type: 'crusher', label: 'Prensa Esmagadora' },
  { id: 'climb-chain', category: 'blocos', type: 'climb-chain', label: 'Corrente de Subir' },
  { id: 'pipe', category: 'blocos', type: 'pipe', label: 'Cano' },
  { id: 'note', category: 'blocos', type: 'note', label: 'Bloco Musical' },
  {
    id: 'surprise-multi-coins',
    category: 'blocos',
    type: 'surprise',
    label: 'Bloco de Moedas',
    properties: { contents: 'multi-coins' },
  },
  { id: 'surprise-coins', category: 'blocos', type: 'surprise', label: 'Surpresa', properties: { contents: 'coins' } },
  { id: 'surprise-heart', category: 'blocos', type: 'surprise', label: 'Surpresa ❤️', properties: { contents: 'heart' } },
  { id: 'surprise-crystal', category: 'blocos', type: 'surprise', label: 'Surpresa 💎', properties: { contents: 'crystal' } },

  { id: 'slime', category: 'inimigos', type: 'slime', label: 'Slime' },
  { id: 'spiky', category: 'inimigos', type: 'spiky', label: 'Espinhudo' },
  { id: 'bat', category: 'inimigos', type: 'bat', label: 'Morcego' },
  { id: 'robot', category: 'inimigos', type: 'robot', label: 'Robô' },
  { id: 'ghost', category: 'inimigos', type: 'ghost', label: 'Fantasminha' },
  { id: 'turtle', category: 'inimigos', type: 'turtle', label: 'Tartaruga' },
  { id: 'piranha', category: 'inimigos', type: 'piranha', label: 'Planta Carnívora' },
  { id: 'penguin', category: 'inimigos', type: 'penguin', label: 'Pinguim' },
  { id: 'lava-bubble', category: 'inimigos', type: 'lava-bubble', label: 'Bolinha de Lava' },
  { id: 'bee', category: 'inimigos', type: 'bee', label: 'Abelha' },
  { id: 'goomba', category: 'inimigos', type: 'goomba', label: 'Goomba' },
  { id: 'bullet', category: 'inimigos', type: 'bullet', label: 'Bala de Canhão' },
  { id: 'thwomp', category: 'inimigos', type: 'thwomp', label: 'Thwomp' },
  { id: 'king-slime', category: 'inimigos', type: 'king-slime', label: 'Rei Slime' },
  { id: 'iron-ball', category: 'inimigos', type: 'iron-ball', label: 'Bolão na Corrente' },
  { id: 'fish', category: 'inimigos', type: 'fish', label: 'Peixe Nadador' },
  { id: 'jumping-fish', category: 'inimigos', type: 'jumping-fish', label: 'Peixe Saltador' },
  { id: 'king-cactus', category: 'inimigos', type: 'king-cactus', label: 'Rei Cacto' },
  { id: 'living-pumpkin', category: 'inimigos', type: 'living-pumpkin', label: 'Abóbora Viva' },
  { id: 'witch', category: 'inimigos', type: 'witch', label: 'Bruxa' },

  { id: 'coin', category: 'itens', type: 'coin', label: 'Moeda' },
  { id: 'mega-coin', category: 'itens', type: 'mega-coin', label: 'Moeda Gigantesca' },
  ...GIANT_COIN_PIECES,
  ...COIN_MULTIPLIER_PIECES,
  { id: 'key', category: 'itens', type: 'key', label: 'Chave' },
  { id: 'crystal', category: 'itens', type: 'crystal', label: 'Cristal' },
  { id: 'heart', category: 'itens', type: 'heart', label: 'Coração' },
  { id: 'coin-chest', category: 'itens', type: 'coin-chest', label: 'Baú de Moedas' },

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
  { id: 'skeleton-platform', category: 'plataformas', type: 'skeleton-platform', label: 'Móvel Esqueleto' },
  { id: 'crumble', category: 'plataformas', type: 'crumble', label: 'Desaparece' },
  { id: 'spring', category: 'plataformas', type: 'spring', label: 'Mola' },
  { id: 'ceiling-spring', category: 'plataformas', type: 'ceiling-spring', label: 'Mola de Cabeça pra Baixo' },
  { id: 'slide', category: 'plataformas', type: 'slide', label: 'Escorregador' },

  { id: 'tree', category: 'decoracao', type: 'tree', label: 'Árvore' },
  { id: 'bush', category: 'decoracao', type: 'bush', label: 'Arbusto' },
  { id: 'flower', category: 'decoracao', type: 'flower', label: 'Flor' },
  { id: 'talking-flower', category: 'decoracao', type: 'talking-flower', label: 'Flor Falante', properties: { text: 'Oi! Boa sorte na fase!' } },
  { id: 'rock', category: 'decoracao', type: 'rock', label: 'Pedrinha' },
  { id: 'sign', category: 'decoracao', type: 'sign', label: 'Placa', properties: { text: 'Fase Secreta!' } },
  { id: 'fence', category: 'decoracao', type: 'fence', label: 'Cerca' },
  { id: 'snowman', category: 'decoracao', type: 'snowman', label: 'Boneco de Neve' },
  { id: 'toadstool', category: 'decoracao', type: 'toadstool', label: 'Cogumelinho' },
  { id: 'pumpkin', category: 'decoracao', type: 'pumpkin', label: 'Abóbora' },
  { id: 'barrel', category: 'decoracao', type: 'barrel', label: 'Barril' },
  { id: 'lamp', category: 'decoracao', type: 'lamp', label: 'Poste' },
  { id: 'grass', category: 'decoracao', type: 'grass', label: 'Matinho' },
  { id: 'arrow', category: 'decoracao', type: 'arrow', label: 'Seta' },
  { id: 'crate', category: 'decoracao', type: 'crate', label: 'Caixote' },

  { id: 'power-mushroom', category: 'cogumelos', type: 'power-up', label: 'Super Cogumelo', properties: { powerUp: 'mushroom' } },
  { id: 'power-fire-flower', category: 'cogumelos', type: 'power-up', label: 'Flor de Fogo', properties: { powerUp: 'fire-flower' } },
  { id: 'power-ice-flower', category: 'cogumelos', type: 'power-up', label: 'Flor de Gelo', properties: { powerUp: 'ice-flower' } },
  { id: 'power-star', category: 'cogumelos', type: 'power-up', label: 'Super Estrela', properties: { powerUp: 'star' } },
  { id: 'power-one-up', category: 'cogumelos', type: 'power-up', label: 'Cogumelo Vida', properties: { powerUp: 'one-up' } },
  { id: 'power-cat-mushroom', category: 'cogumelos', type: 'power-up', label: 'Cogumelo Gato', properties: { powerUp: 'cat-mushroom' } },
  { id: 'power-leaf-mushroom', category: 'cogumelos', type: 'power-up', label: 'Cogumelo Folha', properties: { powerUp: 'leaf-mushroom' } },
  { id: 'power-raccoon-leaf', category: 'cogumelos', type: 'power-up', label: 'Folha do Guaxinim', properties: { powerUp: 'raccoon-leaf' } },
  { id: 'power-giga-mushroom', category: 'cogumelos', type: 'power-up', label: 'Giga Cogumelo', properties: { powerUp: 'giga-mushroom' } },
  {
    id: 'power-turbo-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Turbo',
    properties: { powerUp: 'turbo-mushroom' },
  },
  {
    id: 'power-swap-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Troca-Personagem',
    properties: { powerUp: 'swap-mushroom' },
  },
  {
    id: 'power-magnet-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Ímã',
    properties: { powerUp: 'magnet-mushroom' },
  },
  {
    id: 'power-tall-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Alto',
    properties: { powerUp: 'tall-mushroom' },
  },
  {
    id: 'power-reverse-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Reverso',
    properties: { powerUp: 'reverse-mushroom' },
  },
  {
    id: 'power-mini-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo de Encolher',
    properties: { powerUp: 'mini-mushroom' },
  },
  { id: 'lucky-block', category: 'cogumelos', type: 'surprise', label: 'Lucky Block', properties: { contents: 'lucky' } },
  {
    id: 'surprise-mushroom',
    category: 'cogumelos',
    type: 'surprise',
    label: 'Surpresa 🍄',
    properties: { contents: 'power-up', powerUp: 'mushroom' },
  },

  { id: 'start', category: 'portais', type: 'start', label: 'Início' },
  { id: 'portal', category: 'portais', type: 'portal', label: 'Portal final' },
  { id: 'portal-castle', category: 'portais', type: 'portal', label: 'Castelo final', properties: { portalLook: 'castle' } },
  { id: 'door-a', category: 'portais', type: 'door', label: 'Porta A', properties: { pair: 'A' } },
  { id: 'door-b', category: 'portais', type: 'door', label: 'Porta B', properties: { pair: 'B' } },
  { id: 'door-c', category: 'portais', type: 'door', label: 'Porta C', properties: { pair: 'C' } },
  { id: 'door-d', category: 'portais', type: 'door', label: 'Porta D', properties: { pair: 'D' } },
  { id: 'door-e', category: 'portais', type: 'door', label: 'Porta E', properties: { pair: 'E' } },
  { id: 'door-f', category: 'portais', type: 'door', label: 'Porta F', properties: { pair: 'F' } },
  // Par próprio: duas portas douradas já se ligam sem mexer nas portas de madeira de A a F.
  { id: 'door-golden', category: 'portais', type: 'golden-door', label: 'Porta Dourada', properties: { pair: 'G' } },
  { id: 'locked-door', category: 'portais', type: 'locked-door', label: 'Porta com Chave' },
  ...WARP_PIPE_PIECES,

  { id: 'checkpoint', category: 'bandeiras', type: 'checkpoint', label: 'Checkpoint' },
  // É o portal final com outro desenho: continua um só por fase, como o arco e o castelo.
  { id: 'portal-flag', category: 'bandeiras', type: 'portal', label: 'Bandeira Final', properties: { portalLook: 'flag' } },
];

/**
 * Peça da paleta que corresponde a uma peça já colocada na fase.
 *
 * O mesmo tipo pode ter várias peças (Porta A e Porta B, surpresa de moedas e
 * de coração): vale a que tem as mesmas propriedades, da mais específica para
 * a mais geral — o castelo final não pode passar por portal comum só porque a
 * peça do portal não tem propriedade nenhuma. Sem nenhuma igual, a primeira do
 * tipo.
 */
export function findEditorPiece(object: Pick<LevelObject, 'type' | 'properties'>): EditorPiece | undefined {
  const sameType = EDITOR_PIECES.filter((piece) => piece.type === object.type);
  const properties = object.properties ?? {};
  const propertyCount = (piece: EditorPiece): number => Object.keys(piece.properties ?? {}).length;
  const mostSpecificFirst = [...sameType].sort((first, second) => propertyCount(second) - propertyCount(first));

  return (
    mostSpecificFirst.find((piece) =>
      Object.entries(piece.properties ?? {}).every(([key, value]) => properties[key as keyof LevelObjectProperties] === value),
    ) ?? sameType[0]
  );
}

/**
 * Letras dos pares de portas. Da A à F são as de madeira da paleta; a G é a
 * da porta dourada. Portas com a mesma letra levam uma à outra.
 */
export const DOOR_PAIRS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export type DoorPair = (typeof DOOR_PAIRS)[number];

/** Cor da plaquinha de cada letra, no editor e em cima da porta no jogo: o par se acha de longe. */
export const DOOR_PAIR_COLORS: Readonly<Record<DoorPair, string>> = {
  A: '#e5484d',
  B: '#3e7bfa',
  C: '#2fae5f',
  D: '#f08c1b',
  E: '#9a6cf0',
  F: '#e2559b',
  G: '#c99a06',
};

/** Cor da plaquinha de um par; pares com nome (das fases do Pedro) ficam roxos. */
export function doorPairColor(pair: string): string {
  return DOOR_PAIRS.find((letter) => letter === pair) ? DOOR_PAIR_COLORS[pair as DoorPair] : '#2a2350';
}

/**
 * Poderes que o editor oferece: os da paleta. O Super Pulo, o Escudo, o
 * Turbo, o Ímã e a Asa saíram do editor, mas fases antigas com eles continuam
 * funcionando.
 */
export const EDITOR_POWER_UPS: readonly PowerUpKind[] = [
  ...new Set(
    EDITOR_PIECES.flatMap((piece) => (piece.type === 'power-up' && piece.properties?.powerUp ? [piece.properties.powerUp] : [])),
  ),
];

export const POWER_UP_LABELS = {
  'super-jump': { label: 'Super Pulo', emoji: '🦘' },
  shield: { label: 'Escudo', emoji: '🛡️' },
  turbo: { label: 'Turbo', emoji: '⚡' },
  magnet: { label: 'Ímã', emoji: '🧲' },
  wings: { label: 'Asa', emoji: '🪽' },
  mushroom: { label: 'Super Cogumelo', emoji: '🍄' },
  'fire-flower': { label: 'Flor de Fogo', emoji: '🔥' },
  'ice-flower': { label: 'Flor de Gelo', emoji: '❄️' },
  star: { label: 'Super Estrela', emoji: '⭐' },
  'one-up': { label: 'Cogumelo Vida', emoji: '💚' },
  'cat-mushroom': { label: 'Cogumelo Gato', emoji: '🐱' },
  'leaf-mushroom': { label: 'Cogumelo Folha', emoji: '🍃' },
  'raccoon-leaf': { label: 'Folha do Guaxinim', emoji: '🦝' },
  'giga-mushroom': { label: 'Giga Cogumelo', emoji: '💪' },
  'turbo-mushroom': { label: 'Cogumelo Turbo', emoji: '💨' },
  'swap-mushroom': { label: 'Cogumelo Troca-Personagem', emoji: '🔄' },
  'magnet-mushroom': { label: 'Cogumelo Ímã', emoji: '🧲' },
  'tall-mushroom': { label: 'Cogumelo Alto', emoji: '🦒' },
  'reverse-mushroom': { label: 'Cogumelo Reverso', emoji: '🙃' },
  'mini-mushroom': { label: 'Cogumelo de Encolher', emoji: '🐜' },
  'coin-x2': { label: 'Moeda ×2', emoji: '🪙' },
  'coin-x4': { label: 'Moeda ×4', emoji: '🪙' },
  'coin-x1000': { label: 'Moeda ×1000', emoji: '🪙' },
  'coin-x9999': { label: 'Moeda ×9999', emoji: '🪙' },
} as const satisfies Readonly<Record<PowerUpKind, { readonly label: string; readonly emoji: string }>>;

export const THEME_LABELS: Readonly<Record<LevelTheme, { readonly label: string; readonly emoji: string }>> = {
  vale: { label: 'Vale', emoji: '🌳' },
  floresta: { label: 'Floresta', emoji: '🌲' },
  caverna: { label: 'Caverna', emoji: '💎' },
  deserto: { label: 'Deserto', emoji: '🏜️' },
  gelo: { label: 'Gelo', emoji: '❄️' },
  vulcao: { label: 'Vulcão', emoji: '🌋' },
  estrelas: { label: 'Estrelas', emoji: '🌌' },
  castelo: { label: 'Castelo', emoji: '🏰' },
  'castelo-rei-slime': { label: 'Castelo do Rei Slime', emoji: '👑' },
  'castelo-rei-cacto': { label: 'Castelo do Rei Cacto', emoji: '🌵' },
  praia: { label: 'Praia', emoji: '🏖️' },
  classico: { label: 'Clássico', emoji: '🍄' },
  'dia-das-bruxas': { label: 'Dia das Bruxas', emoji: '🎃' },
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
  'castelo-rei-slime',
  'castelo-rei-cacto',
  'praia',
  'classico',
  'dia-das-bruxas',
];
