import type { ThemeColor } from '../models/profile.model';

export interface ThemeColorPair {
  readonly base: string;
  readonly soft: string;
}

/**
 * Espelho em TypeScript dos tokens de cor definidos em `styles/_tokens.scss`.
 * Necessário porque SVGs gerados em runtime (data URI) não enxergam as custom
 * properties da página.
 */
export const THEME_COLOR_HEX: Readonly<Record<ThemeColor, ThemeColorPair>> = {
  pink: { base: '#ff4f9a', soft: '#ffd9e9' },
  blue: { base: '#2ba8e0', soft: '#d5f0ff' },
  yellow: { base: '#ffb703', soft: '#fff0c9' },
  mint: { base: '#12b886', soft: '#d3f7ea' },
  purple: { base: '#7b52d3', soft: '#e8ddff' },
  orange: { base: '#f4772e', soft: '#ffe3d1' },
};

export const THEME_COLORS: readonly ThemeColor[] = Object.keys(THEME_COLOR_HEX) as ThemeColor[];

/** Distribui cores de forma estável a partir de um índice. */
export function themeColorByIndex(index: number): ThemeColor {
  return THEME_COLORS[index % THEME_COLORS.length];
}
