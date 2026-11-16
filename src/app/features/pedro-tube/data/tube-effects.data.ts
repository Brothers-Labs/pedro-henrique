import type { TubeFilter, TubeFrame, TubeMotion, TubeOverlay, TubePresetEffect } from '../models/tube.model';

/** Filtro neutro: a imagem do jeito que foi gravada. */
export const NEUTRAL_FILTER: TubeFilter = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
  blur: 0,
};

export const NORMAL_EFFECT_ID = 'normal';

/** Limites de cada controle deslizante do criador de efeitos. */
export const FILTER_LIMITS: Readonly<Record<keyof TubeFilter, { readonly min: number; readonly max: number; readonly step: number; readonly label: string; readonly unit: string }>> = {
  brightness: { min: 40, max: 180, step: 5, label: 'Brilho', unit: '%' },
  contrast: { min: 40, max: 200, step: 5, label: 'Contraste', unit: '%' },
  saturation: { min: 0, max: 300, step: 10, label: 'Cores fortes', unit: '%' },
  hue: { min: 0, max: 360, step: 10, label: 'Girar as cores', unit: '°' },
  sepia: { min: 0, max: 100, step: 5, label: 'Foto antiga', unit: '%' },
  grayscale: { min: 0, max: 100, step: 5, label: 'Preto e branco', unit: '%' },
  invert: { min: 0, max: 100, step: 5, label: 'Cores trocadas', unit: '%' },
  blur: { min: 0, max: 8, step: 1, label: 'Desfoque', unit: 'px' },
};

export const FILTER_KEYS = Object.keys(FILTER_LIMITS) as readonly (keyof TubeFilter)[];

export interface TubeOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  readonly emoji: string;
}

export const OVERLAY_OPTIONS: readonly TubeOption<TubeOverlay>[] = [
  { value: 'nenhum', label: 'Nada', emoji: '🚫' },
  { value: 'coracoes', label: 'Corações', emoji: '❤️' },
  { value: 'estrelas', label: 'Estrelas', emoji: '⭐' },
  { value: 'confete', label: 'Confete', emoji: '🎉' },
  { value: 'fogo', label: 'Fogo', emoji: '🔥' },
  { value: 'bolhas', label: 'Bolhas', emoji: '🫧' },
  { value: 'neve', label: 'Neve', emoji: '❄️' },
  { value: 'raios', label: 'Raios', emoji: '⚡' },
];

export const FRAME_OPTIONS: readonly TubeOption<TubeFrame>[] = [
  { value: 'nenhuma', label: 'Sem moldura', emoji: '⬜' },
  { value: 'neon', label: 'Neon', emoji: '💜' },
  { value: 'ouro', label: 'Ouro', emoji: '🏆' },
  { value: 'arco-iris', label: 'Arco-íris', emoji: '🌈' },
  { value: 'cinema', label: 'Cinema', emoji: '🎞️' },
];

export const MOTION_OPTIONS: readonly TubeOption<TubeMotion>[] = [
  { value: 'pular', label: 'Pular', emoji: '🦘' },
  { value: 'girar', label: 'Girar', emoji: '🌀' },
  { value: 'crescer', label: 'Crescer', emoji: '🎈' },
  { value: 'deslizar', label: 'Deslizar', emoji: '🛝' },
  { value: 'tremer', label: 'Tremer', emoji: '🫨' },
  { value: 'parado', label: 'Parado', emoji: '🗿' },
];

/** Figurinhas para o canto do vídeo. A primeira é "nenhuma". */
export const STICKER_OPTIONS: readonly string[] = ['', '❤️', '👍', '😂', '🔥', '⭐', '👑', '🦖', '🚀', '🎮', '🔔', '😎'];

/** Emojis prontos para cenas, canais e efeitos. */
export const EMOJI_CHOICES: readonly string[] = [
  '👷', '😀', '😎', '🤖', '🦖', '🐶', '🐱', '🦄', '🚀', '🏎️', '⚽', '🎮',
  '🎬', '🎵', '🌈', '🔥', '⭐', '❤️', '🍕', '🏰', '👻', '🐉', '🌊', '🎂',
];

export interface TubeColorChoice {
  readonly value: string;
  readonly label: string;
}

/** Cores para banners de canal e fundos de cena, com nome para quem não enxerga a cor. */
export const COLOR_CHOICES: readonly TubeColorChoice[] = [
  { value: '#e5243b', label: 'Vermelho' },
  { value: '#ff4f9a', label: 'Rosa' },
  { value: '#7b52d3', label: 'Roxo' },
  { value: '#2ba8e0', label: 'Azul' },
  { value: '#12b886', label: 'Verde' },
  { value: '#ffb703', label: 'Amarelo' },
  { value: '#f4772e', label: 'Laranja' },
  { value: '#2a2350', label: 'Noite' },
];

/** Efeitos que já vêm no PedroTube. O primeiro é o normal, sem nada. */
export const PRESET_EFFECTS: readonly TubePresetEffect[] = [
  { id: NORMAL_EFFECT_ID, name: 'Normal', emoji: '🎬', filter: NEUTRAL_FILTER, overlay: 'nenhum', frame: 'nenhuma', sticker: '', isPreset: true },
  {
    id: 'neon',
    name: 'Neon',
    emoji: '💜',
    filter: { ...NEUTRAL_FILTER, brightness: 110, contrast: 125, saturation: 180 },
    overlay: 'raios',
    frame: 'neon',
    sticker: '',
    isPreset: true,
  },
  {
    id: 'preto-e-branco',
    name: 'Preto e branco',
    emoji: '🖤',
    filter: { ...NEUTRAL_FILTER, contrast: 120, grayscale: 100 },
    overlay: 'nenhum',
    frame: 'cinema',
    sticker: '',
    isPreset: true,
  },
  {
    id: 'filme-antigo',
    name: 'Filme antigo',
    emoji: '📽️',
    filter: { ...NEUTRAL_FILTER, sepia: 80, contrast: 110, brightness: 95 },
    overlay: 'nenhum',
    frame: 'cinema',
    sticker: '',
    isPreset: true,
  },
  {
    id: 'festa',
    name: 'Festa',
    emoji: '🎉',
    filter: { ...NEUTRAL_FILTER, saturation: 150, brightness: 110 },
    overlay: 'confete',
    frame: 'arco-iris',
    sticker: '🎂',
    isPreset: true,
  },
  {
    id: 'amor',
    name: 'Amor',
    emoji: '❤️',
    filter: { ...NEUTRAL_FILTER, saturation: 130, hue: 330 },
    overlay: 'coracoes',
    frame: 'nenhuma',
    sticker: '❤️',
    isPreset: true,
  },
  {
    id: 'explosao',
    name: 'Explosão',
    emoji: '💥',
    filter: { ...NEUTRAL_FILTER, contrast: 140, saturation: 170, brightness: 105 },
    overlay: 'fogo',
    frame: 'ouro',
    sticker: '🔥',
    isPreset: true,
  },
  {
    id: 'gelo',
    name: 'Gelo',
    emoji: '❄️',
    filter: { ...NEUTRAL_FILTER, hue: 180, saturation: 80, brightness: 115 },
    overlay: 'neve',
    frame: 'nenhuma',
    sticker: '',
    isPreset: true,
  },
  {
    id: 'mundo-invertido',
    name: 'Mundo invertido',
    emoji: '🙃',
    filter: { ...NEUTRAL_FILTER, invert: 100, hue: 180 },
    overlay: 'bolhas',
    frame: 'neon',
    sticker: '👻',
    isPreset: true,
  },
];

export function isTubeOverlay(value: unknown): value is TubeOverlay {
  return OVERLAY_OPTIONS.some((option) => option.value === value);
}

export function isTubeFrame(value: unknown): value is TubeFrame {
  return FRAME_OPTIONS.some((option) => option.value === value);
}

export function isTubeMotion(value: unknown): value is TubeMotion {
  return MOTION_OPTIONS.some((option) => option.value === value);
}
