import type { Cosmetic, CosmeticSlot } from '../models/economy.model';

/**
 * Roupas do Pedro, visuais do cachorro e veículos do lobby.
 *
 * Os três primeiros de cada tipo já vêm com o jogador. Os outros saem da loja
 * (moedas ou diamantes do jogo) ou do passe de temporada.
 */
export const COSMETICS: readonly Cosmetic[] = [
  // Roupas -----------------------------------------------------------------------------
  {
    id: 'moletom-coroa',
    slot: 'outfit',
    name: 'Moletom da Coroa',
    emoji: '👑',
    rarity: 'comum',
    palette: { primary: '#15151c', secondary: '#23232e', accent: '#f5c542' },
    price: null,
  },
  {
    id: 'agasalho-vermelho',
    slot: 'outfit',
    name: 'Agasalho Vermelho',
    emoji: '🔴',
    rarity: 'comum',
    palette: { primary: '#c62828', secondary: '#1c1c22', accent: '#ffffff' },
    price: { currency: 'coins', amount: 600 },
  },
  {
    id: 'jaqueta-neon',
    slot: 'outfit',
    name: 'Jaqueta Neon',
    emoji: '💙',
    rarity: 'raro',
    palette: { primary: '#0f2a5c', secondary: '#101018', accent: '#3fb8ff' },
    price: { currency: 'coins', amount: 1500 },
  },
  {
    id: 'conjunto-branco',
    slot: 'outfit',
    name: 'Conjunto Branco',
    emoji: '🤍',
    rarity: 'epico',
    palette: { primary: '#f2f2f5', secondary: '#c9c9d3', accent: '#f5c542' },
    price: null,
  },
  {
    id: 'traje-neon',
    slot: 'outfit',
    name: 'Traje Neon',
    emoji: '💜',
    rarity: 'epico',
    palette: { primary: '#1a0f33', secondary: '#0d0d18', accent: '#b06bff' },
    price: null,
  },
  {
    id: 'pedro-elite',
    slot: 'outfit',
    name: 'Pedro Elite',
    emoji: '🏆',
    rarity: 'lendario',
    palette: { primary: '#0b0b10', secondary: '#f5c542', accent: '#ffe08a' },
    price: null,
  },

  // Cachorro ---------------------------------------------------------------------------
  {
    id: 'rex',
    slot: 'dog',
    name: 'Rex',
    emoji: '🐕',
    rarity: 'comum',
    palette: { primary: '#1b1512', secondary: '#9a5a2b', accent: '#f5c542' },
    price: null,
  },
  {
    id: 'rex-azul',
    slot: 'dog',
    name: 'Rex Coleira Neon',
    emoji: '💎',
    rarity: 'raro',
    palette: { primary: '#1b1512', secondary: '#9a5a2b', accent: '#3fb8ff' },
    price: { currency: 'diamonds', amount: 80 },
  },
  {
    id: 'rex-oculos',
    slot: 'dog',
    name: 'Rex de Óculos',
    emoji: '🕶️',
    rarity: 'epico',
    palette: { primary: '#1b1512', secondary: '#b06a32', accent: '#ffffff' },
    price: null,
  },
  {
    id: 'rex-gold',
    slot: 'dog',
    name: 'Rex Gold',
    emoji: '🌟',
    rarity: 'lendario',
    palette: { primary: '#2a2010', secondary: '#d4a017', accent: '#ffe08a' },
    price: null,
  },

  // Veículos ---------------------------------------------------------------------------
  {
    id: 'suv-preto',
    slot: 'vehicle',
    name: 'SUV Preto',
    emoji: '🚙',
    rarity: 'comum',
    palette: { primary: '#121216', secondary: '#2a2a33', accent: '#cfe8ff' },
    vehicleShape: 'suv',
    price: null,
  },
  {
    id: 'esportivo-vermelho',
    slot: 'vehicle',
    name: 'Esportivo Vermelho',
    emoji: '🏎️',
    rarity: 'raro',
    palette: { primary: '#d32f2f', secondary: '#1a1a1f', accent: '#ffd1d1' },
    vehicleShape: 'sport',
    price: { currency: 'coins', amount: 2500 },
  },
  {
    id: 'moto-neon',
    slot: 'vehicle',
    name: 'Moto Neon',
    emoji: '🏍️',
    rarity: 'epico',
    palette: { primary: '#0f1d3a', secondary: '#15151c', accent: '#3fb8ff' },
    vehicleShape: 'moto',
    price: null,
  },
  {
    id: 'suv-dourado',
    slot: 'vehicle',
    name: 'SUV Dourado',
    emoji: '🚘',
    rarity: 'raro',
    palette: { primary: '#b8891a', secondary: '#1a1a1f', accent: '#fff1c2' },
    vehicleShape: 'suv',
    price: null,
  },
  {
    id: 'lambo-gold',
    slot: 'vehicle',
    name: 'Lambo Gold',
    emoji: '✨',
    rarity: 'lendario',
    palette: { primary: '#0b0b10', secondary: '#d4a017', accent: '#ffe08a' },
    vehicleShape: 'sport',
    price: null,
  },
];

export const DEFAULT_EQUIPPED: Readonly<Record<CosmeticSlot, string>> = {
  outfit: 'moletom-coroa',
  dog: 'rex',
  vehicle: 'suv-preto',
};

export const STARTER_COSMETICS: readonly string[] = Object.values(DEFAULT_EQUIPPED);

export const COSMETIC_SLOTS: readonly { readonly id: CosmeticSlot; readonly label: string; readonly emoji: string }[] = [
  { id: 'outfit', label: 'Roupas', emoji: '👕' },
  { id: 'dog', label: 'Cachorro', emoji: '🐕' },
  { id: 'vehicle', label: 'Veículos', emoji: '🚗' },
];

export const RARITY_LABEL = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
} as const;

const COSMETICS_BY_ID = new Map(COSMETICS.map((cosmetic) => [cosmetic.id, cosmetic]));

export function cosmeticById(id: string): Cosmetic {
  const cosmetic = COSMETICS_BY_ID.get(id);

  if (!cosmetic) {
    throw new Error(`Cosmético "${id}" não existe em COSMETICS.`);
  }

  return cosmetic;
}

export function isCosmeticId(id: string): boolean {
  return COSMETICS_BY_ID.has(id);
}
