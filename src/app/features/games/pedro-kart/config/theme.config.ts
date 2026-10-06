import type { LevelTheme } from '../../pedro-maker/models/level.model';
import type { TrackTheme } from '../models/track.model';

/** Enfeite que o cenário espalha em volta da pista. */
export type SceneryKind = 'arvore' | 'flor' | 'coqueiro' | 'guarda-sol' | 'pinheiro' | 'boneco-de-neve' | 'dino' | 'vulcao' | 'cristal' | 'planeta';

export interface TrackThemeDefinition {
  readonly id: TrackTheme;
  readonly label: string;
  readonly emoji: string;
  readonly skyTop: string;
  readonly skyBottom: string;
  readonly ground: string;
  readonly groundDetail: string;
  readonly road: string;
  readonly roadLine: string;
  readonly curbA: string;
  readonly curbB: string;
  readonly sun: string;
  readonly isDark: boolean;
  /** Enfeites do cenário; o primeiro é o mais comum. */
  readonly scenery: readonly SceneryKind[];
  /** Trilha do Pedro Maker que combina com o cenário. */
  readonly music: LevelTheme;
}

/**
 * Os cinco cenários.
 *
 * O vale dos dinossauros existe porque dinossauro é o bicho favorito do
 * Pedro; o espaço é o único escuro, e por isso o único com estrelas no céu.
 */
export const TRACK_THEMES: readonly TrackThemeDefinition[] = [
  {
    id: 'parque',
    label: 'Parque',
    emoji: '🌳',
    skyTop: '#5fb8ff',
    skyBottom: '#d6f0ff',
    ground: '#6cc24a',
    groundDetail: '#5aa83c',
    road: '#5b5f6b',
    roadLine: '#f4f4f4',
    curbA: '#e03131',
    curbB: '#ffffff',
    sun: '#fff6dd',
    isDark: false,
    scenery: ['arvore', 'flor'],
    music: 'vale',
  },
  {
    id: 'praia',
    label: 'Praia',
    emoji: '🏖️',
    skyTop: '#3fa9f5',
    skyBottom: '#fff0c9',
    ground: '#f2d98b',
    groundDetail: '#e6c66f',
    road: '#6b6259',
    roadLine: '#fff7e0',
    curbA: '#ff8a3d',
    curbB: '#ffffff',
    sun: '#fff1d6',
    isDark: false,
    scenery: ['coqueiro', 'guarda-sol'],
    music: 'deserto',
  },
  {
    id: 'gelo',
    label: 'Montanha gelada',
    emoji: '❄️',
    skyTop: '#8ec5ff',
    skyBottom: '#f1f8ff',
    ground: '#eef6ff',
    groundDetail: '#d4e6f7',
    road: '#7d8aa3',
    roadLine: '#ffffff',
    curbA: '#3b82f6',
    curbB: '#ffffff',
    sun: '#eef8ff',
    isDark: false,
    scenery: ['pinheiro', 'boneco-de-neve'],
    music: 'gelo',
  },
  {
    id: 'dinos',
    label: 'Vale dos dinossauros',
    emoji: '🦖',
    skyTop: '#ff9a6b',
    skyBottom: '#ffe0b5',
    ground: '#8a6a45',
    groundDetail: '#75583a',
    road: '#4a3f3a',
    roadLine: '#ffd38a',
    curbA: '#ffb000',
    curbB: '#3a2d26',
    sun: '#ffb08a',
    isDark: false,
    scenery: ['dino', 'vulcao', 'arvore'],
    music: 'vulcao',
  },
  {
    id: 'espaco',
    label: 'Pista das estrelas',
    emoji: '🚀',
    skyTop: '#0b0a2a',
    skyBottom: '#3b2d7a',
    ground: '#2b2558',
    groundDetail: '#3a3270',
    road: '#16142e',
    roadLine: '#8ef1ff',
    curbA: '#ff4f9a',
    curbB: '#8ef1ff',
    sun: '#c9b8ff',
    isDark: true,
    scenery: ['cristal', 'planeta'],
    music: 'estrelas',
  },
];

const THEMES_BY_ID = new Map(TRACK_THEMES.map((theme) => [theme.id, theme]));

export function trackTheme(id: TrackTheme): TrackThemeDefinition {
  const theme = THEMES_BY_ID.get(id);

  if (!theme) {
    throw new Error(`Cenário "${id}" não existe.`);
  }

  return theme;
}

export function isTrackTheme(value: unknown): value is TrackTheme {
  return typeof value === 'string' && THEMES_BY_ID.has(value as TrackTheme);
}
