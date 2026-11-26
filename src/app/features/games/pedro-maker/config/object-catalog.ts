import {
  COIN_MULTIPLIER_KINDS,
  type CoinMultiplierKind,
  coinMultiplierLabel,
  formatCoinValue,
  GIANT_COIN_VALUES,
  giantCoinType,
  type LevelObject,
  type LevelObjectProperties,
  type LevelObjectType,
  type LevelTheme,
  perGiantCoin,
  POWER_UP_KINDS,
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
  'rainbow-block': { surface: 'solid', isUnique: false },
  pipe: { surface: 'solid', isUnique: false },
  cannon: { surface: 'solid', isUnique: false },
  'fire-bar': { surface: 'solid', isUnique: false },
  'fire-trap': { surface: 'solid', isUnique: false },
  'p-switch': { surface: 'none', isUnique: false },
  // Porta trancada e corrente são firmes no jogo, mas o validador de alcance
  // conta com a chave e a alavanca: para ele, o caminho por elas fica aberto.
  key: { surface: 'none', isUnique: false },
  'locked-door': { surface: 'none', isUnique: false },
  chain: { surface: 'none', isUnique: false },
  lever: { surface: 'none', isUnique: false },
  // A prensa não é terreno: a simulação cuida da colisão dela enquanto desce e sobe.
  crusher: { surface: 'none', isUnique: false },
  'wide-crusher': { surface: 'none', isUnique: false },
  'climb-chain': { surface: 'none', isUnique: false },
  brick: { surface: 'solid', isUnique: false },
  surprise: { surface: 'solid', isUnique: false },
  note: { surface: 'solid', isUnique: false },
  'invisible-grass': { surface: 'solid', isUnique: false },
  spring: { surface: 'one-way', isUnique: false },
  'ceiling-spring': { surface: 'solid', isUnique: false },
  'on-off-switch': { surface: 'solid', isUnique: false },
  // Firmes ou atravessáveis conforme o interruptor: para o validador de alcance,
  // valem dos dois jeitos — dá para pisar em cima e passar por baixo.
  'red-block': { surface: 'one-way', isUnique: false },
  'blue-block': { surface: 'one-way', isUnique: false },
  'pow-block': { surface: 'solid', isUnique: false },
  'exclamation-block': { surface: 'solid', isUnique: false },
  crumble: { surface: 'one-way', isUnique: false },
  platform: { surface: 'one-way', isUnique: false },
  cloud: { surface: 'one-way', isUnique: false },
  'rainbow-bridge': { surface: 'one-way', isUnique: false },
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
  'walking-bomb': { surface: 'none', isUnique: false },
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
  balloons: { surface: 'none', isUnique: false },
  hint: { surface: 'none', isUnique: false },
  'mascot-tip': { surface: 'none', isUnique: false },
};

/**
 * Largura de cada prensa esmagadora, em blocos. A larga é posta pelo bloco do
 * meio e ocupa também um de cada lado.
 */
export const CRUSHER_WIDTH_CELLS = {
  crusher: 1,
  'wide-crusher': 3,
} as const satisfies Partial<Record<LevelObjectType, number>>;

export type CrusherType = keyof typeof CRUSHER_WIDTH_CELLS;

export function isCrusherType(type: LevelObjectType): type is CrusherType {
  return type in CRUSHER_WIDTH_CELLS;
}

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

/**
 * As cores do arco-íris, na ordem em que aparecem no céu, e depois as peças
 * sem cor (cinza, branco e preto). O marrom conta como laranja e o rosa, como
 * violeta: é a cor mais perto que a criança reconhece.
 */
export const RAINBOW_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'neutral'] as const;

export type RainbowColor = (typeof RAINBOW_COLORS)[number];

/** Tom de cada cor nas abas: claro o bastante para o texto escuro continuar legível. */
export const RAINBOW_SWATCHES: Readonly<Record<RainbowColor, string>> = {
  red: '#ff6b6b',
  orange: '#ffa94d',
  yellow: '#ffd43b',
  green: '#69db7c',
  blue: '#4dabf7',
  indigo: '#748ffc',
  violet: '#da77f2',
  neutral: '#ced4da',
};

/**
 * Ordem alfabética do editor, do jeito que se lê em português: "Água" fica
 * junto do "A", e "Moeda Gigante 10" vem antes de "Moeda Gigante 100".
 */
const ALPHABETICAL = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

interface Colored {
  readonly label: string;
  readonly color: RainbowColor;
}

/**
 * Cópia em ordem de arco-íris: do vermelho ao violeta, e as sem cor no fim.
 * Dentro da mesma cor, pela letra, para a criança ainda achar a peça pelo nome.
 */
export function sortByRainbow<T extends Colored>(items: readonly T[]): readonly T[] {
  return [...items].sort(
    (first, second) =>
      RAINBOW_COLORS.indexOf(first.color) - RAINBOW_COLORS.indexOf(second.color) || ALPHABETICAL.compare(first.label, second.label),
  );
}

export interface EditorCategory {
  readonly id: EditorCategoryId;
  readonly label: string;
  readonly emoji: string;
  /** Cor da aba, a mesma do emoji: as abas formam um arco-íris. */
  readonly color: RainbowColor;
}

export const EDITOR_CATEGORIES: readonly EditorCategory[] = [
  { id: 'terreno', label: 'Terreno', emoji: '🟫', color: 'orange' },
  { id: 'blocos', label: 'Blocos', emoji: '🧱', color: 'orange' },
  { id: 'inimigos', label: 'Inimigos', emoji: '👾', color: 'violet' },
  { id: 'itens', label: 'Itens', emoji: '🪙', color: 'yellow' },
  { id: 'plataformas', label: 'Plataformas', emoji: '🟰', color: 'indigo' },
  { id: 'decoracao', label: 'Decoração', emoji: '🌳', color: 'green' },
  { id: 'cogumelos', label: 'Cogumelos', emoji: '🍄', color: 'red' },
  { id: 'portais', label: 'Portais', emoji: '🌀', color: 'blue' },
  { id: 'bandeiras', label: 'Bandeiras', emoji: '🏁', color: 'neutral' },
];

/** A aba Telas não tem peças: escolhe a tela da fase. Fica no fim, com as abas sem cor. */
export interface EditorTab {
  readonly id: EditorCategoryId | 'telas';
  readonly label: string;
  readonly emoji: string;
  readonly color: RainbowColor;
}

/** Abas do editor em ordem de arco-íris. */
export const EDITOR_TABS: readonly EditorTab[] = sortByRainbow<EditorTab>([
  ...EDITOR_CATEGORIES,
  { id: 'telas', label: 'Telas', emoji: '📺', color: 'neutral' },
]);

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
  /** A cor que mais aparece no ícone da peça: é ela que põe a peça no lugar do arco-íris. */
  readonly color: RainbowColor;
}

/** Peça que só existe em fase antiga: o editor sabe o nome, mas ela não entra na paleta nem no arco-íris. */
type RetiredPiece = Omit<EditorPiece, 'color'>;

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
  .map(({ value, type }): EditorPiece => ({ id: type, category: 'itens', type, label: `Moeda Gigante ${formatCoinValue(value)}`, color: 'yellow' }));

/** Cada moeda de multiplicação tem a sua cor no ícone, do verde da ×2 ao rosa da ×9999. */
const COIN_MULTIPLIER_COLORS: Readonly<Record<CoinMultiplierKind, RainbowColor>> = {
  'coin-x2': 'green',
  'coin-x4': 'blue',
  'coin-x1000': 'indigo',
  'coin-x9999': 'violet',
};

/** Moedas de multiplicação: na aba Itens, ao lado das outras moedas, mas funcionam como poder com tempo. */
const COIN_MULTIPLIER_PIECES: readonly EditorPiece[] = COIN_MULTIPLIER_KINDS.map((kind): EditorPiece => ({
  id: `power-${kind}`,
  category: 'itens',
  type: 'power-up',
  label: `Moeda ${coinMultiplierLabel(kind)}`,
  properties: { powerUp: kind },
  color: COIN_MULTIPLIER_COLORS[kind],
}));

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
  'pedrere-mushroom': { label: 'Cogumelo Pedrerê', emoji: '🤸' },
  'extra-life-mushroom': { label: 'Cogumelo 1UP', emoji: '🆙' },
  'bubble-flower': { label: 'Flor de Bolha', emoji: '🫧' },
  'propeller-mushroom': { label: 'Cogumelo de Voar', emoji: '🚁' },
  boot: { label: 'Bota', emoji: '🥾' },
  'wing-cap': { label: 'Chapéu de Voar', emoji: '🧢' },
  hammer: { label: 'Martelo Gigante', emoji: '🔨' },
  'penguin-suit': { label: 'Roupa de Pinguim', emoji: '🐧' },
  'double-cherry': { label: 'Cogumelo Cereja', emoji: '🍒' },
  'coin-x2': { label: 'Moeda ×2', emoji: '🪙' },
  'coin-x4': { label: 'Moeda ×4', emoji: '🪙' },
  'coin-x1000': { label: 'Moeda ×1000', emoji: '🪙' },
  'coin-x9999': { label: 'Moeda ×9999', emoji: '🪙' },
} as const satisfies Readonly<Record<PowerUpKind, { readonly label: string; readonly emoji: string }>>;

/**
 * Poderes que têm um bloco surpresa próprio na aba Cogumelos: a cabeçada solta
 * aquele poder. A Surpresa Cogumelo Vida saiu do editor; fases antigas com ela
 * continuam abrindo, porque a peça é só um bloco surpresa com aquele poder.
 */
export const SURPRISE_POWER_UPS = [
  'mushroom',
  'fire-flower',
  'star',
  'extra-life-mushroom',
  'ice-flower',
  'bubble-flower',
  'cat-mushroom',
  'raccoon-leaf',
  'giga-mushroom',
  'turbo-mushroom',
  'swap-mushroom',
  'magnet-mushroom',
  'tall-mushroom',
  'mini-mushroom',
  'pedrere-mushroom',
  'propeller-mushroom',
  'boot',
  'wing-cap',
  'hammer',
  'penguin-suit',
  'double-cherry',
] as const satisfies readonly PowerUpKind[];

/**
 * Uma surpresa para cada poder. O id segue o poder, e a do Super Cogumelo
 * continua `surprise-mushroom`, como antes: a peça que já existia não muda.
 */
const POWER_UP_SURPRISE_PIECES: readonly EditorPiece[] = SURPRISE_POWER_UPS.map((powerUp): EditorPiece => ({
  id: `surprise-${powerUp}`,
  category: 'cogumelos',
  type: 'surprise',
  label: `Surpresa ${POWER_UP_LABELS[powerUp].label}`,
  properties: { contents: 'power-up', powerUp },
  // O ícone é o bloco amarelo da surpresa: o poder aparece pequeno, dentro dele.
  color: 'yellow',
}));

/** Canos mágicos em pares de A a F: entrar num leva ao outro cano da mesma letra. */
const WARP_PIPE_PIECES: readonly EditorPiece[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((pair): EditorPiece => ({
  id: `warp-pipe-${pair.toLowerCase()}`,
  category: 'portais',
  type: 'warp-pipe',
  label: `Cano ${pair}`,
  properties: { pair },
  color: 'green',
}));

export const EDITOR_PIECES: readonly EditorPiece[] = [
  { id: 'ground', category: 'terreno', type: 'ground', label: 'Grama', color: 'green' },
  { id: 'stone', category: 'terreno', type: 'stone', label: 'Pedra', color: 'neutral' },
  { id: 'ice', category: 'terreno', type: 'ice', label: 'Gelo', color: 'blue' },
  { id: 'sand', category: 'terreno', type: 'sand', label: 'Areia', color: 'yellow' },
  { id: 'desert-mountain', category: 'terreno', type: 'desert-mountain', label: 'Montanha do Deserto', color: 'orange' },
  { id: 'wood', category: 'terreno', type: 'wood', label: 'Madeira', color: 'orange' },
  { id: 'lava', category: 'terreno', type: 'lava', label: 'Lava', color: 'red' },
  { id: 'water', category: 'terreno', type: 'water', label: 'Água', color: 'blue' },
  { id: 'spikes', category: 'terreno', type: 'spikes', label: 'Espinhos', color: 'neutral' },
  { id: 'invisible-grass', category: 'terreno', type: 'invisible-grass', label: 'Grama Invisível', color: 'green' },
  { id: 'rainbow-block', category: 'terreno', type: 'rainbow-block', label: 'Bloco Arco-Íris', color: 'red' },

  { id: 'cannon', category: 'blocos', type: 'cannon', label: 'Canhão', color: 'neutral' },
  { id: 'fire-bar', category: 'blocos', type: 'fire-bar', label: 'Bastão de Fogo', properties: { range: 4 }, color: 'orange' },
  { id: 'fire-bar-long', category: 'blocos', type: 'fire-bar', label: 'Bastão de Fogo Comprido', properties: { range: 6 }, color: 'orange' },
  { id: 'brick', category: 'blocos', type: 'brick', label: 'Quebrável', color: 'orange' },
  { id: 'p-switch', category: 'blocos', type: 'p-switch', label: 'Botão P', color: 'blue' },
  { id: 'chain', category: 'blocos', type: 'chain', label: 'Corrente', color: 'neutral' },
  { id: 'lever', category: 'blocos', type: 'lever', label: 'Alavanca', color: 'neutral' },
  { id: 'crusher', category: 'blocos', type: 'crusher', label: 'Prensa Esmagadora', color: 'neutral' },
  { id: 'wide-crusher', category: 'blocos', type: 'wide-crusher', label: 'Prensa Esmagadora Larga', color: 'neutral' },
  { id: 'fire-trap', category: 'blocos', type: 'fire-trap', label: 'Armadilha de Fogo', color: 'neutral' },
  { id: 'climb-chain', category: 'blocos', type: 'climb-chain', label: 'Corrente de Subir', color: 'neutral' },
  { id: 'pipe', category: 'blocos', type: 'pipe', label: 'Cano', color: 'green' },
  { id: 'note', category: 'blocos', type: 'note', label: 'Bloco Musical', color: 'neutral' },
  { id: 'on-off-switch', category: 'blocos', type: 'on-off-switch', label: 'Bloco ON/OFF', color: 'red' },
  { id: 'red-block', category: 'blocos', type: 'red-block', label: 'Bloco Vermelho', color: 'red' },
  { id: 'blue-block', category: 'blocos', type: 'blue-block', label: 'Bloco Azul', color: 'blue' },
  { id: 'pow-block', category: 'blocos', type: 'pow-block', label: 'Bloco POW', color: 'blue' },
  { id: 'exclamation-block', category: 'blocos', type: 'exclamation-block', label: 'Bloco !', color: 'red' },
  {
    id: 'surprise-multi-coins',
    category: 'blocos',
    type: 'surprise',
    label: 'Bloco de Moedas',
    properties: { contents: 'multi-coins' },
    color: 'orange',
  },
  { id: 'surprise-coins', category: 'blocos', type: 'surprise', label: 'Surpresa', properties: { contents: 'coins' }, color: 'yellow' },
  { id: 'surprise-crystal', category: 'blocos', type: 'surprise', label: 'Surpresa 💎', properties: { contents: 'crystal' }, color: 'yellow' },
  { id: 'surprise-empty', category: 'blocos', type: 'surprise', label: 'Surpresa Vazia', properties: { contents: 'empty' }, color: 'yellow' },

  { id: 'slime', category: 'inimigos', type: 'slime', label: 'Slime', color: 'green' },
  { id: 'spiky', category: 'inimigos', type: 'spiky', label: 'Espinhudo', color: 'orange' },
  { id: 'bat', category: 'inimigos', type: 'bat', label: 'Morcego', color: 'indigo' },
  { id: 'robot', category: 'inimigos', type: 'robot', label: 'Robô', color: 'neutral' },
  { id: 'ghost', category: 'inimigos', type: 'ghost', label: 'Fantasminha', color: 'neutral' },
  { id: 'turtle', category: 'inimigos', type: 'turtle', label: 'Tartaruga', color: 'green' },
  { id: 'piranha', category: 'inimigos', type: 'piranha', label: 'Planta Carnívora', color: 'red' },
  { id: 'penguin', category: 'inimigos', type: 'penguin', label: 'Pinguim', color: 'neutral' },
  { id: 'lava-bubble', category: 'inimigos', type: 'lava-bubble', label: 'Bolinha de Lava', color: 'orange' },
  { id: 'bee', category: 'inimigos', type: 'bee', label: 'Abelha', color: 'yellow' },
  { id: 'goomba', category: 'inimigos', type: 'goomba', label: 'Goomba', color: 'orange' },
  { id: 'bullet', category: 'inimigos', type: 'bullet', label: 'Bala de Canhão', color: 'neutral' },
  { id: 'thwomp', category: 'inimigos', type: 'thwomp', label: 'Thwomp', color: 'neutral' },
  { id: 'king-slime', category: 'inimigos', type: 'king-slime', label: 'Rei Slime', color: 'blue' },
  { id: 'iron-ball', category: 'inimigos', type: 'iron-ball', label: 'Bolão na Corrente', color: 'neutral' },
  { id: 'fish', category: 'inimigos', type: 'fish', label: 'Peixe Nadador', color: 'blue' },
  { id: 'jumping-fish', category: 'inimigos', type: 'jumping-fish', label: 'Peixe Saltador', color: 'red' },
  { id: 'king-cactus', category: 'inimigos', type: 'king-cactus', label: 'Rei Cacto', color: 'green' },
  { id: 'living-pumpkin', category: 'inimigos', type: 'living-pumpkin', label: 'Abóbora Viva', color: 'orange' },
  { id: 'witch', category: 'inimigos', type: 'witch', label: 'Bruxa', color: 'violet' },
  { id: 'walking-bomb', category: 'inimigos', type: 'walking-bomb', label: 'Bomb-omb', color: 'neutral' },

  { id: 'coin', category: 'itens', type: 'coin', label: 'Moeda', color: 'yellow' },
  { id: 'mega-coin', category: 'itens', type: 'mega-coin', label: 'Moeda Gigantesca', color: 'yellow' },
  ...GIANT_COIN_PIECES,
  ...COIN_MULTIPLIER_PIECES,
  { id: 'key', category: 'itens', type: 'key', label: 'Chave', color: 'yellow' },
  { id: 'crystal', category: 'itens', type: 'crystal', label: 'Cristal', color: 'blue' },
  { id: 'coin-chest', category: 'itens', type: 'coin-chest', label: 'Baú de Moedas', color: 'orange' },

  { id: 'platform', category: 'plataformas', type: 'platform', label: 'Plataforma', color: 'orange' },
  { id: 'cloud', category: 'plataformas', type: 'cloud', label: 'Nuvem', color: 'neutral' },
  { id: 'rainbow-bridge', category: 'plataformas', type: 'rainbow-bridge', label: 'Ponte Arco-Íris', color: 'red' },
  {
    id: 'moving-horizontal',
    category: 'plataformas',
    type: 'moving-platform',
    label: 'Móvel ↔',
    properties: { axis: 'horizontal', range: 4 },
    color: 'yellow',
  },
  {
    id: 'moving-vertical',
    category: 'plataformas',
    type: 'moving-platform',
    label: 'Móvel ↕',
    properties: { axis: 'vertical', range: 3 },
    color: 'yellow',
  },
  { id: 'skeleton-platform', category: 'plataformas', type: 'skeleton-platform', label: 'Móvel Esqueleto', color: 'neutral' },
  { id: 'crumble', category: 'plataformas', type: 'crumble', label: 'Desaparece', color: 'orange' },
  { id: 'spring', category: 'plataformas', type: 'spring', label: 'Mola', color: 'red' },
  { id: 'ceiling-spring', category: 'plataformas', type: 'ceiling-spring', label: 'Mola de Cabeça pra Baixo', color: 'red' },
  { id: 'slide', category: 'plataformas', type: 'slide', label: 'Escorregador', color: 'red' },

  { id: 'tree', category: 'decoracao', type: 'tree', label: 'Árvore', color: 'green' },
  { id: 'bush', category: 'decoracao', type: 'bush', label: 'Arbusto', color: 'green' },
  { id: 'flower', category: 'decoracao', type: 'flower', label: 'Flor', color: 'violet' },
  { id: 'talking-flower', category: 'decoracao', type: 'talking-flower', label: 'Flor Falante', properties: { text: 'Oi! Boa sorte na fase!' }, color: 'violet' },
  { id: 'rock', category: 'decoracao', type: 'rock', label: 'Pedrinha', color: 'neutral' },
  { id: 'sign', category: 'decoracao', type: 'sign', label: 'Placa', properties: { text: 'Fase Secreta!' }, color: 'orange' },
  { id: 'fence', category: 'decoracao', type: 'fence', label: 'Cerca', color: 'orange' },
  { id: 'snowman', category: 'decoracao', type: 'snowman', label: 'Boneco de Neve', color: 'neutral' },
  { id: 'toadstool', category: 'decoracao', type: 'toadstool', label: 'Cogumelinho', color: 'red' },
  { id: 'pumpkin', category: 'decoracao', type: 'pumpkin', label: 'Abóbora', color: 'orange' },
  { id: 'barrel', category: 'decoracao', type: 'barrel', label: 'Barril', color: 'orange' },
  { id: 'lamp', category: 'decoracao', type: 'lamp', label: 'Poste', color: 'neutral' },
  { id: 'grass', category: 'decoracao', type: 'grass', label: 'Matinho', color: 'green' },
  { id: 'arrow', category: 'decoracao', type: 'arrow', label: 'Seta', color: 'orange' },
  { id: 'crate', category: 'decoracao', type: 'crate', label: 'Caixote', color: 'orange' },
  { id: 'balloons', category: 'decoracao', type: 'balloons', label: 'Balões', color: 'yellow' },

  { id: 'power-mushroom', category: 'cogumelos', type: 'power-up', label: 'Super Cogumelo', properties: { powerUp: 'mushroom' }, color: 'red' },
  { id: 'power-fire-flower', category: 'cogumelos', type: 'power-up', label: 'Flor de Fogo', properties: { powerUp: 'fire-flower' }, color: 'orange' },
  { id: 'power-ice-flower', category: 'cogumelos', type: 'power-up', label: 'Flor de Gelo', properties: { powerUp: 'ice-flower' }, color: 'blue' },
  { id: 'power-star', category: 'cogumelos', type: 'power-up', label: 'Super Estrela', properties: { powerUp: 'star' }, color: 'yellow' },
  {
    id: 'power-extra-life-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo 1UP',
    properties: { powerUp: 'extra-life-mushroom' },
    color: 'green',
  },
  {
    id: 'power-bubble-flower',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Flor de Bolha',
    properties: { powerUp: 'bubble-flower' },
    color: 'blue',
  },
  { id: 'power-cat-mushroom', category: 'cogumelos', type: 'power-up', label: 'Cogumelo Gato', properties: { powerUp: 'cat-mushroom' }, color: 'orange' },
  { id: 'power-raccoon-leaf', category: 'cogumelos', type: 'power-up', label: 'Folha do Guaxinim', properties: { powerUp: 'raccoon-leaf' }, color: 'orange' },
  { id: 'power-giga-mushroom', category: 'cogumelos', type: 'power-up', label: 'Giga Cogumelo', properties: { powerUp: 'giga-mushroom' }, color: 'red' },
  {
    id: 'power-turbo-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Turbo',
    properties: { powerUp: 'turbo-mushroom' },
    color: 'blue',
  },
  {
    id: 'power-swap-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Troca-Personagem',
    properties: { powerUp: 'swap-mushroom' },
    color: 'violet',
  },
  {
    id: 'power-magnet-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Ímã',
    properties: { powerUp: 'magnet-mushroom' },
    color: 'red',
  },
  {
    id: 'power-tall-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Alto',
    properties: { powerUp: 'tall-mushroom' },
    color: 'violet',
  },
  {
    id: 'power-reverse-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Reverso',
    properties: { powerUp: 'reverse-mushroom' },
    color: 'green',
  },
  {
    id: 'power-mini-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo de Encolher',
    properties: { powerUp: 'mini-mushroom' },
    color: 'blue',
  },
  {
    id: 'power-pedrere-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Pedrerê',
    properties: { powerUp: 'pedrere-mushroom' },
    color: 'yellow',
  },
  {
    id: 'power-propeller-mushroom',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo de Voar',
    properties: { powerUp: 'propeller-mushroom' },
    color: 'blue',
  },
  { id: 'power-boot', category: 'cogumelos', type: 'power-up', label: 'Bota', properties: { powerUp: 'boot' }, color: 'green' },
  { id: 'power-wing-cap', category: 'cogumelos', type: 'power-up', label: 'Chapéu de Voar', properties: { powerUp: 'wing-cap' }, color: 'red' },
  { id: 'power-hammer', category: 'cogumelos', type: 'power-up', label: 'Martelo Gigante', properties: { powerUp: 'hammer' }, color: 'neutral' },
  {
    id: 'power-penguin-suit',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Roupa de Pinguim',
    properties: { powerUp: 'penguin-suit' },
    color: 'indigo',
  },
  {
    id: 'power-double-cherry',
    category: 'cogumelos',
    type: 'power-up',
    label: 'Cogumelo Cereja',
    properties: { powerUp: 'double-cherry' },
    color: 'red',
  },
  { id: 'lucky-block', category: 'cogumelos', type: 'surprise', label: 'Lucky Block', properties: { contents: 'lucky' }, color: 'yellow' },
  ...POWER_UP_SURPRISE_PIECES,

  { id: 'start', category: 'portais', type: 'start', label: 'Início', color: 'orange' },
  { id: 'portal', category: 'portais', type: 'portal', label: 'Portal final', color: 'indigo' },
  { id: 'portal-castle', category: 'portais', type: 'portal', label: 'Castelo final', properties: { portalLook: 'castle' }, color: 'neutral' },
  { id: 'door-a', category: 'portais', type: 'door', label: 'Porta A', properties: { pair: 'A' }, color: 'orange' },
  { id: 'door-b', category: 'portais', type: 'door', label: 'Porta B', properties: { pair: 'B' }, color: 'orange' },
  { id: 'door-c', category: 'portais', type: 'door', label: 'Porta C', properties: { pair: 'C' }, color: 'orange' },
  { id: 'door-d', category: 'portais', type: 'door', label: 'Porta D', properties: { pair: 'D' }, color: 'orange' },
  { id: 'door-e', category: 'portais', type: 'door', label: 'Porta E', properties: { pair: 'E' }, color: 'orange' },
  { id: 'door-f', category: 'portais', type: 'door', label: 'Porta F', properties: { pair: 'F' }, color: 'orange' },
  // Par próprio: duas portas douradas já se ligam sem mexer nas portas de madeira de A a F.
  { id: 'door-golden', category: 'portais', type: 'golden-door', label: 'Porta Dourada', properties: { pair: 'G' }, color: 'yellow' },
  { id: 'locked-door', category: 'portais', type: 'locked-door', label: 'Porta com Chave', color: 'orange' },
  ...WARP_PIPE_PIECES,

  { id: 'checkpoint', category: 'bandeiras', type: 'checkpoint', label: 'Checkpoint', color: 'violet' },
  // É o portal final com outro desenho: continua um só por fase, como o arco e o castelo.
  { id: 'portal-flag', category: 'bandeiras', type: 'portal', label: 'Bandeira Final', properties: { portalLook: 'flag' }, color: 'neutral' },
];

const PIECES_BY_CATEGORY: ReadonlyMap<EditorCategoryId, readonly EditorPiece[]> = new Map(
  EDITOR_CATEGORIES.map((category) => [category.id, sortByRainbow(EDITOR_PIECES.filter((piece) => piece.category === category.id))]),
);

/**
 * Peças de uma aba, em ordem de arco-íris. `EDITOR_PIECES` continua na ordem
 * em que as peças foram criadas, porque a primeira de cada tipo é a peça
 * padrão de `findEditorPiece`; a paleta é que mostra pela cor.
 */
export function editorPiecesIn(category: EditorCategoryId): readonly EditorPiece[] {
  return PIECES_BY_CATEGORY.get(category) ?? [];
}

type PlacedPiece = Pick<LevelObject, 'type' | 'properties'>;

/**
 * Peça da paleta que corresponde a uma peça já colocada na fase.
 *
 * O mesmo tipo pode ter várias peças (Porta A e Porta B, surpresa de moedas e
 * de cristal): vale a que tem as mesmas propriedades, da mais específica para
 * a mais geral — o castelo final não pode passar por portal comum só porque a
 * peça do portal não tem propriedade nenhuma. Sem nenhuma igual, a primeira do
 * tipo.
 */
export function findEditorPiece(object: PlacedPiece): EditorPiece | undefined {
  return matchingPiece(EDITOR_PIECES, object) ?? EDITOR_PIECES.find((piece) => piece.type === object.type);
}

/** A peça da lista com o mesmo tipo e as mesmas propriedades, da mais específica para a mais geral. */
function matchingPiece<T extends RetiredPiece>(pieces: readonly T[], object: PlacedPiece): T | undefined {
  const properties = object.properties ?? {};
  const propertyCount = (piece: T): number => Object.keys(piece.properties ?? {}).length;
  const mostSpecificFirst = pieces.filter((piece) => piece.type === object.type).sort((first, second) => propertyCount(second) - propertyCount(first));

  return mostSpecificFirst.find((piece) =>
    Object.entries(piece.properties ?? {}).every(([key, value]) => properties[key as keyof LevelObjectProperties] === value),
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
 * Turbo, o Ímã, a Asa, o Cogumelo Folha e o Cogumelo Vida saíram do editor,
 * mas fases antigas com eles continuam funcionando.
 */
export const EDITOR_POWER_UPS: readonly PowerUpKind[] = [
  ...new Set(
    EDITOR_PIECES.flatMap((piece) => (piece.type === 'power-up' && piece.properties?.powerUp ? [piece.properties.powerUp] : [])),
  ),
];

/**
 * Peças que saíram da paleta, mas continuam nas fases antigas: o editor ainda
 * sabe o nome delas. Não aparecem nas abas nem vão para o pincel.
 */
const RETIRED_PIECES: readonly RetiredPiece[] = [
  { id: 'heart', category: 'itens', type: 'heart', label: 'Coração' },
  { id: 'surprise-heart', category: 'blocos', type: 'surprise', label: 'Surpresa ❤️', properties: { contents: 'heart' } },
  {
    id: 'surprise-one-up',
    category: 'cogumelos',
    type: 'surprise',
    label: 'Surpresa Cogumelo Vida',
    properties: { contents: 'power-up', powerUp: 'one-up' },
  },
  ...POWER_UP_KINDS.filter((kind) => !EDITOR_POWER_UPS.includes(kind)).map((kind): RetiredPiece => ({
    id: `power-${kind}`,
    category: 'cogumelos',
    type: 'power-up',
    label: POWER_UP_LABELS[kind].label,
    properties: { powerUp: kind },
  })),
];

/** A peça colocada saiu da paleta: só existe em fase antiga. */
export function isRetiredPiece(object: PlacedPiece): boolean {
  return !matchingPiece(EDITOR_PIECES, object) && Boolean(matchingPiece(RETIRED_PIECES, object));
}

/** Nome da peça colocada, como a criança lê no editor — também o das peças que saíram da paleta. */
export function editorPieceLabel(object: PlacedPiece): string {
  const piece = matchingPiece(EDITOR_PIECES, object) ?? matchingPiece(RETIRED_PIECES, object) ?? findEditorPiece(object);

  return piece?.label ?? object.type;
}

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
