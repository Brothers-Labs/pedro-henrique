import type { LevelTheme } from '../models/level.model';

/** Cores de um tema: céu, camadas do fundo, terreno e detalhes. */
export interface ThemePalette {
  readonly skyTop: string;
  readonly skyBottom: string;
  readonly far: string;
  readonly mid: string;
  readonly near: string;
  readonly surface: string;
  readonly surfaceLight: string;
  readonly soil: string;
  readonly soilDark: string;
  readonly stone: string;
  readonly foliage: string;
  readonly foliageDark: string;
  readonly trunk: string;
  readonly flower: string;
  /** Temas escuros ganham estrelas no céu e luz ao redor do Pedro. */
  readonly isDark: boolean;
  readonly hasClouds: boolean;
}

export const THEME_PALETTES: Readonly<Record<LevelTheme, ThemePalette>> = {
  vale: {
    skyTop: '#6ec3ff',
    skyBottom: '#d9f2ff',
    far: '#9fbde6',
    mid: '#7ccf7a',
    near: '#58b85b',
    surface: '#4fc24d',
    surfaceLight: '#8ee36b',
    soil: '#c07f47',
    soilDark: '#9a5f33',
    stone: '#9aa3b5',
    foliage: '#45b95a',
    foliageDark: '#2f8f47',
    trunk: '#8a5a33',
    flower: '#ff6fae',
    isDark: false,
    hasClouds: true,
  },
  floresta: {
    skyTop: '#86d5c6',
    skyBottom: '#e3f7ea',
    far: '#6aae93',
    mid: '#4a9e66',
    near: '#3a8a55',
    surface: '#3fae4d',
    surfaceLight: '#78d36a',
    soil: '#8f5c38',
    soilDark: '#6d4127',
    stone: '#8e9a8f',
    foliage: '#2f9a4f',
    foliageDark: '#1f7038',
    trunk: '#6b4226',
    flower: '#ffd23f',
    isDark: false,
    hasClouds: true,
  },
  caverna: {
    skyTop: '#140f2b',
    skyBottom: '#2a2150',
    far: '#2e2553',
    mid: '#3b3066',
    near: '#473a7a',
    surface: '#8f7bd6',
    surfaceLight: '#b9a8f5',
    soil: '#453a6e',
    soilDark: '#342a57',
    stone: '#5d5487',
    foliage: '#4de0e0',
    foliageDark: '#2aa8c2',
    trunk: '#5d5487',
    flower: '#7ff3ff',
    isDark: true,
    hasClouds: false,
  },
  deserto: {
    skyTop: '#ffc27a',
    skyBottom: '#fff0cf',
    far: '#f1b66e',
    mid: '#e8a052',
    near: '#d98f45',
    surface: '#f5d27a',
    surfaceLight: '#ffe7a8',
    soil: '#dc9d52',
    soilDark: '#b87a3a',
    stone: '#c9a27a',
    foliage: '#5fb85a',
    foliageDark: '#3f8f40',
    trunk: '#5fb85a',
    flower: '#ff7a5c',
    isDark: false,
    hasClouds: true,
  },
  gelo: {
    skyTop: '#94d3ff',
    skyBottom: '#f0fbff',
    far: '#c4e2f7',
    mid: '#dcefff',
    near: '#b7dcf5',
    surface: '#ffffff',
    surfaceLight: '#ffffff',
    soil: '#8fbde3',
    soilDark: '#6d9dc7',
    stone: '#a6bdd6',
    foliage: '#3f8f6a',
    foliageDark: '#2c6b4f',
    trunk: '#6b4a33',
    flower: '#7fd4ff',
    isDark: false,
    hasClouds: true,
  },
  vulcao: {
    skyTop: '#2e1428',
    skyBottom: '#a8423a',
    far: '#55233a',
    mid: '#6e2d33',
    near: '#82372f',
    surface: '#7a5656',
    surfaceLight: '#a47575',
    soil: '#4d3037',
    soilDark: '#3a2329',
    stone: '#6f5a60',
    foliage: '#ff8a3d',
    foliageDark: '#d9542a',
    trunk: '#3a2329',
    flower: '#ffc23f',
    isDark: false,
    hasClouds: false,
  },
  estrelas: {
    skyTop: '#120c33',
    skyBottom: '#4a2f8a',
    far: '#35286f',
    mid: '#4b3a98',
    near: '#5c48b3',
    surface: '#b39cff',
    surfaceLight: '#dccfff',
    soil: '#4c3c96',
    soilDark: '#392d78',
    stone: '#6e62b0',
    foliage: '#ff8fd0',
    foliageDark: '#d965a8',
    trunk: '#6e62b0',
    flower: '#ffe066',
    isDark: false,
    hasClouds: false,
  },
  castelo: {
    skyTop: '#241c46',
    skyBottom: '#5d4b8c',
    far: '#352c5e',
    mid: '#40376e',
    near: '#4c4280',
    surface: '#a3a9c2',
    surfaceLight: '#c9cee0',
    soil: '#636985',
    soilDark: '#4d526c',
    stone: '#7d839e',
    foliage: '#ffcf3f',
    foliageDark: '#e89f2a',
    trunk: '#5a3d2a',
    flower: '#ff6f6f',
    isDark: false,
    hasClouds: false,
  },
};
