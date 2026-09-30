import type { CharacterLook } from '../models/progress.model';

export type LookCategory = keyof CharacterLook;

export type BackpackStyle = 'dino' | 'rocket' | 'star' | 'none';

/**
 * Opção de visual do Pedro.
 *
 * Nada aqui se compra com dinheiro de verdade: o preço é em moedas do próprio
 * jogo, e algumas opções só pedem que o aventureiro chegue a certo nível.
 */
export interface LookOption {
  readonly id: string;
  readonly category: LookCategory;
  readonly label: string;
  readonly color: string;
  readonly backpackStyle?: BackpackStyle;
  /** Preço em moedas do jogo; zero para as opções gratuitas. */
  readonly price: number;
  /** Nível do aventureiro que libera a opção. */
  readonly unlockLevel: number;
}

export const LOOK_CATEGORIES: readonly { readonly id: LookCategory; readonly label: string; readonly emoji: string }[] = [
  { id: 'cap', label: 'Bonés', emoji: '🧢' },
  { id: 'shirt', label: 'Camisetas', emoji: '👕' },
  { id: 'backpack', label: 'Mochilas', emoji: '🎒' },
];

/**
 * Catálogo de visual.
 *
 * O boné azul abre a lista porque azul é a cor favorita do Pedro, e a mochila
 * de dinossauro porque dinossauro é o bicho favorito dele.
 */
export const LOOK_OPTIONS: readonly LookOption[] = [
  { id: 'bone-azul', category: 'cap', label: 'Boné azul', color: '#2b7fd9', price: 0, unlockLevel: 1 },
  { id: 'bone-verde', category: 'cap', label: 'Boné verde', color: '#27a760', price: 0, unlockLevel: 1 },
  { id: 'bone-laranja', category: 'cap', label: 'Boné laranja', color: '#f4772e', price: 40, unlockLevel: 1 },
  { id: 'bone-roxo', category: 'cap', label: 'Boné roxo', color: '#7b52d3', price: 60, unlockLevel: 2 },
  { id: 'bone-dourado', category: 'cap', label: 'Boné dourado', color: '#f2b705', price: 150, unlockLevel: 5 },
  { id: 'bone-arco-iris', category: 'cap', label: 'Boné cometa', color: '#ff4f9a', price: 250, unlockLevel: 8 },

  { id: 'camiseta-laranja', category: 'shirt', label: 'Camiseta laranja', color: '#ff8a3d', price: 0, unlockLevel: 1 },
  { id: 'camiseta-azul', category: 'shirt', label: 'Camiseta azul', color: '#3fa9f5', price: 0, unlockLevel: 1 },
  { id: 'camiseta-verde', category: 'shirt', label: 'Camiseta verde', color: '#3ccf7a', price: 40, unlockLevel: 1 },
  { id: 'camiseta-rosa', category: 'shirt', label: 'Camiseta rosa', color: '#ff6fae', price: 60, unlockLevel: 3 },
  { id: 'camiseta-galaxia', category: 'shirt', label: 'Camiseta galáxia', color: '#3b2d7a', price: 200, unlockLevel: 6 },

  {
    id: 'mochila-dino',
    category: 'backpack',
    label: 'Mochila dino',
    color: '#4cc26b',
    backpackStyle: 'dino',
    price: 0,
    unlockLevel: 1,
  },
  {
    id: 'mochila-foguete',
    category: 'backpack',
    label: 'Mochila foguete',
    color: '#e8eef7',
    backpackStyle: 'rocket',
    price: 80,
    unlockLevel: 2,
  },
  {
    id: 'mochila-estrela',
    category: 'backpack',
    label: 'Mochila estrela',
    color: '#ffc629',
    backpackStyle: 'star',
    price: 120,
    unlockLevel: 4,
  },
  {
    id: 'sem-mochila',
    category: 'backpack',
    label: 'Sem mochila',
    color: '#cccccc',
    backpackStyle: 'none',
    price: 0,
    unlockLevel: 1,
  },
];

export const DEFAULT_LOOK: CharacterLook = {
  cap: 'bone-azul',
  shirt: 'camiseta-laranja',
  backpack: 'mochila-dino',
};

const OPTIONS_BY_ID = new Map(LOOK_OPTIONS.map((option) => [option.id, option]));

export function lookOption(id: string): LookOption | undefined {
  return OPTIONS_BY_ID.get(id);
}

/** Cores prontas para o pintor do personagem, com recuo para o visual padrão. */
export interface CharacterPalette {
  readonly cap: string;
  readonly shirt: string;
  readonly backpack: string;
  readonly backpackStyle: BackpackStyle;
}

export function paletteFor(look: CharacterLook): CharacterPalette {
  const cap = lookOption(look.cap) ?? lookOption(DEFAULT_LOOK.cap);
  const shirt = lookOption(look.shirt) ?? lookOption(DEFAULT_LOOK.shirt);
  const backpack = lookOption(look.backpack) ?? lookOption(DEFAULT_LOOK.backpack);

  return {
    cap: cap?.color ?? '#2b7fd9',
    shirt: shirt?.color ?? '#ff8a3d',
    backpack: backpack?.color ?? '#4cc26b',
    backpackStyle: backpack?.backpackStyle ?? 'dino',
  };
}
