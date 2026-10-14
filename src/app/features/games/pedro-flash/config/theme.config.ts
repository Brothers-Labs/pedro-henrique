import type { SceneryKind as KartSceneryKind } from '../../pedro-kart/config/theme.config';
import type { LevelTheme } from '../../pedro-maker/models/level.model';
import type { FlashTheme } from '../models/course.model';

/** Enfeite do cenário: os que o Pedro Kart já sabe desenhar e os novos do Pedro Flash. */
export type FlashSceneryKind = KartSceneryKind | 'predio' | 'poste' | 'torre-raio' | 'pedra-lava';

export interface FlashThemeDefinition {
  readonly id: FlashTheme;
  readonly label: string;
  readonly emoji: string;
  readonly skyTop: string;
  readonly skyBottom: string;
  readonly ground: string;
  readonly groundDetail: string;
  /** Brilho próprio do chão; só a lava do vulcão acende. */
  readonly groundGlow: number;
  readonly road: string;
  readonly roadDetail: string;
  /** Cor das faixas de luz na beira da pista; é ela que o brilho (bloom) realça. */
  readonly neon: string;
  readonly sun: string;
  readonly isDark: boolean;
  /** Relâmpagos de vez em quando no céu. */
  readonly hasLightning: boolean;
  /** Enfeites do cenário; o primeiro é o mais comum. */
  readonly scenery: readonly FlashSceneryKind[];
  /** Trilha do Pedro Maker que combina com o cenário. */
  readonly music: LevelTheme;
}

/**
 * Os seis cenários.
 *
 * A tempestade é o cenário-tema do jogo: o céu pisca com relâmpagos, como o
 * raio do Pedro. Cidade, tempestade e espaço são escuros, e é neles que as
 * luzes de neon da pista mais aparecem.
 */
export const FLASH_THEMES: readonly FlashThemeDefinition[] = [
  {
    id: 'cidade',
    label: 'Cidade Neon',
    emoji: '🌃',
    skyTop: '#0d0b2e',
    skyBottom: '#5b2a86',
    ground: '#1d1b3a',
    groundDetail: '#2a2752',
    groundGlow: 0,
    road: '#24233a',
    roadDetail: '#ff4fd8',
    neon: '#3ff0ff',
    sun: '#c9b8ff',
    isDark: true,
    hasLightning: false,
    scenery: ['predio', 'poste'],
    music: 'classico',
  },
  {
    id: 'praia',
    label: 'Praia Turbo',
    emoji: '🏖️',
    skyTop: '#2f9cf0',
    skyBottom: '#fff0c9',
    ground: '#f2d98b',
    groundDetail: '#e6c66f',
    groundGlow: 0,
    road: '#3f4a63',
    roadDetail: '#fff7e0',
    neon: '#ffb000',
    sun: '#fff1d6',
    isDark: false,
    hasLightning: false,
    scenery: ['coqueiro', 'guarda-sol'],
    music: 'praia',
  },
  {
    id: 'vulcao',
    label: 'Vulcão de Fogo',
    emoji: '🌋',
    skyTop: '#3a1210',
    skyBottom: '#ff7a3d',
    ground: '#ff5a1f',
    groundDetail: '#ffb000',
    groundGlow: 0.55,
    road: '#2c2224',
    roadDetail: '#ffd23f',
    neon: '#ff3d1f',
    sun: '#ffb08a',
    isDark: false,
    hasLightning: false,
    scenery: ['vulcao', 'pedra-lava'],
    music: 'vulcao',
  },
  {
    id: 'gelo',
    label: 'Geleira Veloz',
    emoji: '❄️',
    skyTop: '#7fb9ff',
    skyBottom: '#f1f8ff',
    ground: '#eef6ff',
    groundDetail: '#d4e6f7',
    groundGlow: 0,
    road: '#5d6f91',
    roadDetail: '#ffffff',
    neon: '#7fe3ff',
    sun: '#eef8ff',
    isDark: false,
    hasLightning: false,
    scenery: ['pinheiro', 'boneco-de-neve'],
    music: 'gelo',
  },
  {
    id: 'tempestade',
    label: 'Tempestade de Raios',
    emoji: '⛈️',
    skyTop: '#11142a',
    skyBottom: '#4a5578',
    ground: '#2e3550',
    groundDetail: '#3b4466',
    groundGlow: 0,
    road: '#1f2235',
    roadDetail: '#ffd23f',
    neon: '#ffd23f',
    sun: '#dfe6ff',
    isDark: true,
    hasLightning: true,
    scenery: ['torre-raio', 'cristal'],
    music: 'castelo',
  },
  {
    id: 'espaco',
    label: 'Estrada das Estrelas',
    emoji: '🚀',
    skyTop: '#050418',
    skyBottom: '#2d2266',
    ground: '#1c1844',
    groundDetail: '#2c2662',
    groundGlow: 0,
    road: '#14122c',
    roadDetail: '#8ef1ff',
    neon: '#ff4fd8',
    sun: '#c9b8ff',
    isDark: true,
    hasLightning: false,
    scenery: ['planeta', 'cristal'],
    music: 'estrelas',
  },
];

const THEMES_BY_ID = new Map(FLASH_THEMES.map((theme) => [theme.id, theme]));

export function flashTheme(id: FlashTheme): FlashThemeDefinition {
  const theme = THEMES_BY_ID.get(id);

  if (!theme) {
    throw new Error(`Cenário "${id}" não existe no Pedro Flash.`);
  }

  return theme;
}

export function isFlashTheme(value: unknown): value is FlashTheme {
  return typeof value === 'string' && THEMES_BY_ID.has(value as FlashTheme);
}
