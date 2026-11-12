/**
 * Opções de roupa do Pedro no Pedro Pedrerê.
 *
 * As listas são a fonte única: a tela de personagem mostra estas opções, o
 * desenho usa estas cores e a leitura do que estava guardado só aceita estes
 * ids.
 */

export interface ColorOption<TId extends string> {
  readonly id: TId;
  readonly label: string;
  readonly hex: string;
}

export const SHIRT_COLORS = [
  { id: 'vermelho', label: 'Vermelha', hex: '#e8433f' },
  { id: 'azul', label: 'Azul', hex: '#3f8cf0' },
  { id: 'verde', label: 'Verde', hex: '#3fb24a' },
  { id: 'amarelo', label: 'Amarela', hex: '#f5c518' },
  { id: 'roxo', label: 'Roxa', hex: '#8c5ce6' },
  { id: 'laranja', label: 'Laranja', hex: '#ff8a1f' },
] as const satisfies readonly ColorOption<string>[];

export const PANTS_COLORS = [
  { id: 'jeans', label: 'Jeans', hex: '#2f5fa8' },
  { id: 'preta', label: 'Preta', hex: '#2b2b38' },
  { id: 'marrom', label: 'Marrom', hex: '#7a4a26' },
  { id: 'cinza', label: 'Cinza', hex: '#7d8597' },
] as const satisfies readonly ColorOption<string>[];

export const HATS = [
  { id: 'nenhum', label: 'Sem chapéu', emoji: '🙂' },
  { id: 'bone', label: 'Boné', emoji: '🧢' },
  { id: 'coroa', label: 'Coroa', emoji: '👑' },
  { id: 'capacete', label: 'Capacete', emoji: '⛑️' },
  { id: 'cartola', label: 'Cartola', emoji: '🎩' },
] as const;

export type ShirtColorId = (typeof SHIRT_COLORS)[number]['id'];
export type PantsColorId = (typeof PANTS_COLORS)[number]['id'];
export type HatId = (typeof HATS)[number]['id'];

export interface HeroLook {
  readonly shirt: ShirtColorId;
  readonly pants: PantsColorId;
  readonly hat: HatId;
}

export const DEFAULT_HERO_LOOK: HeroLook = { shirt: 'vermelho', pants: 'jeans', hat: 'bone' };

export function isShirtColorId(value: unknown): value is ShirtColorId {
  return SHIRT_COLORS.some((option) => option.id === value);
}

export function isPantsColorId(value: unknown): value is PantsColorId {
  return PANTS_COLORS.some((option) => option.id === value);
}

export function isHatId(value: unknown): value is HatId {
  return HATS.some((option) => option.id === value);
}

export function shirtHex(id: ShirtColorId): string {
  return SHIRT_COLORS.find((option) => option.id === id)?.hex ?? SHIRT_COLORS[0].hex;
}

export function pantsHex(id: PantsColorId): string {
  return PANTS_COLORS.find((option) => option.id === id)?.hex ?? PANTS_COLORS[0].hex;
}
