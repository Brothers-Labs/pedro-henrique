import type {
  LevelDefinition,
  ObstacleKind,
  RegionDefinition,
  RegionId,
  RegionTheme,
} from '../models/campaign.model';
import { SEASON } from './season.config';

/** Folga sobre o tempo de quem corre sem bater: o tempo-alvo é desafio, não castigo. */
const TARGET_TIME_SLACK = 1.12;

/** Uma moeda pedida a cada tantos metros de pista. */
const METERS_PER_TARGET_COIN = 14;

interface LevelSpec {
  readonly name: string;
  readonly lengthMeters: number;
  readonly obstacleKinds: readonly [ObstacleKind, ...ObstacleKind[]];
  readonly density: number;
  readonly rampTarget: number;
  readonly hint?: string;
}

interface SpeedRange {
  readonly startSpeed: number;
  readonly maxSpeed: number;
}

/** Monta as fases de uma região a partir do essencial; o resto é derivado. */
function levelsOf(regionNumber: number, regionId: RegionId, speed: SpeedRange, specs: readonly LevelSpec[]): readonly LevelDefinition[] {
  return specs.map((spec, index) => {
    const averageSpeed = (speed.startSpeed + speed.maxSpeed) / 2;

    return {
      id: `${regionNumber}-${index + 1}`,
      regionId,
      number: index + 1,
      name: spec.name,
      lengthMeters: spec.lengthMeters,
      startSpeed: speed.startSpeed,
      maxSpeed: speed.maxSpeed,
      obstacleKinds: spec.obstacleKinds,
      density: spec.density,
      coinTarget: Math.round(spec.lengthMeters / METERS_PER_TARGET_COIN),
      rampTarget: spec.rampTarget,
      targetTimeSeconds: Math.round((spec.lengthMeters / averageSpeed) * TARGET_TIME_SLACK),
      ...(spec.hint ? { hint: spec.hint } : {}),
    };
  });
}

const THEMES: Readonly<Record<RegionId, RegionTheme>> = {
  'ilha-inicial': {
    skyTop: '#2f8fe0',
    skyBottom: '#ffd7a1',
    ground: '#f2d49a',
    road: '#c9a46b',
    roadLine: '#fff4d6',
    accent: '#3ccf7a',
    isNight: false,
    scenery: 'palms',
  },
  'zona-urbana': {
    skyTop: '#3a6fd8',
    skyBottom: '#ffb37a',
    ground: '#5c6470',
    road: '#2e3138',
    roadLine: '#f5c542',
    accent: '#ffcf3f',
    isNight: false,
    scenery: 'buildings',
  },
  'montanha-radical': {
    skyTop: '#5b8bd6',
    skyBottom: '#e8f1ff',
    ground: '#dfe8f2',
    road: '#7a6a5a',
    roadLine: '#ffffff',
    accent: '#7ec8ff',
    isNight: false,
    scenery: 'rocks',
  },
  'cidade-do-luxo': {
    skyTop: '#0b0b24',
    skyBottom: '#4b2a7a',
    ground: '#14141f',
    road: '#1b1b26',
    roadLine: '#f5c542',
    accent: '#f5c542',
    isNight: true,
    scenery: 'towers',
  },
  'deserto-xtreme': {
    skyTop: '#e07b39',
    skyBottom: '#ffe0a3',
    ground: '#e3a65f',
    road: '#b97a3f',
    roadLine: '#fff1cf',
    accent: '#ff7a1a',
    isNight: false,
    scenery: 'dunes',
  },
  'eventos-especiais': {
    skyTop: '#05051a',
    skyBottom: '#2a0d4a',
    ground: '#0f0f1f',
    road: '#16162a',
    roadLine: '#b06bff',
    accent: '#b06bff',
    isNight: true,
    scenery: 'neon',
  },
};

/**
 * As seis regiões do mapa, na ordem da aventura.
 *
 * A Ilha Inicial ensina um movimento por fase (pular, atacar, derrapar,
 * rampa); cada região seguinte acrescenta um tipo de obstáculo e um pouco de
 * velocidade. Oito estrelas — pouco mais da metade — abrem a próxima região:
 * dá para seguir sem gabaritar tudo.
 */
export const REGIONS: readonly RegionDefinition[] = [
  {
    id: 'ilha-inicial',
    number: 1,
    name: 'Ilha Inicial',
    tagline: 'Praia, palmeiras e os primeiros pulos.',
    emoji: '🏝️',
    theme: THEMES['ilha-inicial'],
    unlock: { kind: 'open' },
    levels: levelsOf(1, 'ilha-inicial', { startSpeed: 9, maxSpeed: 12 }, [
      { name: 'Primeiros passos', lengthMeters: 380, obstacleKinds: ['cone', 'barrier'], density: 0.2, rampTarget: 1, hint: 'Pule com Espaço, W ou o botão PULAR. Troque de faixa com as setas ou deslizando o dedo.' },
      { name: 'Praia das caixas', lengthMeters: 440, obstacleKinds: ['crate', 'cone', 'barrier'], density: 0.28, rampTarget: 1, hint: 'Caixa no caminho? Quebre com E, F ou o botão ATACAR.' },
      { name: 'Trilha das palmeiras', lengthMeters: 480, obstacleKinds: ['high-bar', 'barrier', 'cone', 'banana'], density: 0.32, rampTarget: 2, hint: 'Barra no alto? Derrape por baixo com S, a seta para baixo ou o botão DERRAPAR.' },
      { name: 'Rampa do farol', lengthMeters: 520, obstacleKinds: ['barrier', 'crate', 'high-bar', 'banana'], density: 0.36, rampTarget: 3, hint: 'Suba nas rampas para voar alto e pegar as moedas do céu.' },
      { name: 'Volta na ilha', lengthMeters: 600, obstacleKinds: ['barrier', 'crate', 'high-bar', 'cone', 'animal'], density: 0.4, rampTarget: 3 },
    ]),
  },
  {
    id: 'zona-urbana',
    number: 2,
    name: 'Zona Urbana',
    tagline: 'Avenidas, trânsito e corrida contra o relógio.',
    emoji: '🏙️',
    theme: THEMES['zona-urbana'],
    unlock: { kind: 'stars', regionId: 'ilha-inicial', stars: 8 },
    levels: levelsOf(2, 'zona-urbana', { startSpeed: 11, maxSpeed: 14 }, [
      { name: 'Avenida do Pedro', lengthMeters: 560, obstacleKinds: ['parked-car', 'barrier', 'cone', 'banana'], density: 0.36, rampTarget: 2 },
      { name: 'Trânsito na orla', lengthMeters: 600, obstacleKinds: ['traffic-car', 'parked-car', 'cone'], density: 0.38, rampTarget: 2 },
      { name: 'Corrida na orla', lengthMeters: 640, obstacleKinds: ['traffic-car', 'barrier', 'high-bar', 'animal'], density: 0.42, rampTarget: 3 },
      { name: 'Viaduto', lengthMeters: 680, obstacleKinds: ['parked-car', 'high-bar', 'crate', 'traffic-car'], density: 0.45, rampTarget: 3 },
      { name: 'Hora do rush', lengthMeters: 720, obstacleKinds: ['traffic-car', 'parked-car', 'barrier', 'crate', 'banana'], density: 0.5, rampTarget: 3 },
    ]),
  },
  {
    id: 'montanha-radical',
    number: 3,
    name: 'Montanha Radical',
    tagline: 'Trilhas, neve e saltos de precisão.',
    emoji: '🏔️',
    theme: THEMES['montanha-radical'],
    unlock: { kind: 'stars', regionId: 'zona-urbana', stars: 8 },
    levels: levelsOf(3, 'montanha-radical', { startSpeed: 12, maxSpeed: 15 }, [
      { name: 'Trilha da serra', lengthMeters: 640, obstacleKinds: ['barrier', 'high-bar', 'crate'], density: 0.42, rampTarget: 4 },
      { name: 'Ponte de pedra', lengthMeters: 680, obstacleKinds: ['high-bar', 'crate', 'cone', 'animal'], density: 0.45, rampTarget: 4 },
      { name: 'Saltos na neve', lengthMeters: 720, obstacleKinds: ['barrier', 'cone', 'high-bar', 'banana'], density: 0.48, rampTarget: 5 },
      { name: 'Cume gelado', lengthMeters: 760, obstacleKinds: ['crate', 'high-bar', 'barrier', 'cone'], density: 0.52, rampTarget: 5 },
      { name: 'Descida radical', lengthMeters: 820, obstacleKinds: ['barrier', 'high-bar', 'crate', 'cone', 'animal'], density: 0.56, rampTarget: 5 },
    ]),
  },
  {
    id: 'cidade-do-luxo',
    number: 4,
    name: 'Cidade do Luxo',
    tagline: 'Neon dourado, carros especiais e prêmios raros.',
    emoji: '🌃',
    theme: THEMES['cidade-do-luxo'],
    unlock: { kind: 'stars', regionId: 'montanha-radical', stars: 8 },
    levels: levelsOf(4, 'cidade-do-luxo', { startSpeed: 13, maxSpeed: 16 }, [
      { name: 'Boulevard dourado', lengthMeters: 720, obstacleKinds: ['parked-car', 'high-bar', 'barrier'], density: 0.48, rampTarget: 3 },
      { name: 'Garagem de luxo', lengthMeters: 760, obstacleKinds: ['parked-car', 'crate', 'traffic-car', 'banana'], density: 0.5, rampTarget: 3 },
      { name: 'Marina', lengthMeters: 800, obstacleKinds: ['traffic-car', 'high-bar', 'cone'], density: 0.53, rampTarget: 4 },
      { name: 'Torres de neon', lengthMeters: 840, obstacleKinds: ['traffic-car', 'parked-car', 'high-bar', 'crate', 'animal'], density: 0.56, rampTarget: 4 },
      { name: 'Grande prêmio', lengthMeters: 900, obstacleKinds: ['traffic-car', 'parked-car', 'barrier', 'high-bar'], density: 0.6, rampTarget: 5 },
    ]),
  },
  {
    id: 'deserto-xtreme',
    number: 5,
    name: 'Deserto Xtreme',
    tagline: 'Dunas, barreiras que varrem a pista e muita resistência.',
    emoji: '🏜️',
    theme: THEMES['deserto-xtreme'],
    unlock: { kind: 'stars', regionId: 'cidade-do-luxo', stars: 8 },
    levels: levelsOf(5, 'deserto-xtreme', { startSpeed: 14, maxSpeed: 17 }, [
      { name: 'Mar de dunas', lengthMeters: 800, obstacleKinds: ['sweeper', 'barrier', 'cone', 'animal'], density: 0.52, rampTarget: 4 },
      { name: 'Tempestade de areia', lengthMeters: 840, obstacleKinds: ['sweeper', 'crate', 'high-bar'], density: 0.55, rampTarget: 4 },
      { name: 'Cânion', lengthMeters: 880, obstacleKinds: ['high-bar', 'sweeper', 'barrier', 'crate', 'banana'], density: 0.58, rampTarget: 5 },
      { name: 'Oásis', lengthMeters: 920, obstacleKinds: ['sweeper', 'traffic-car', 'cone'], density: 0.6, rampTarget: 5 },
      { name: 'Rali xtreme', lengthMeters: 1000, obstacleKinds: ['sweeper', 'traffic-car', 'high-bar', 'crate', 'barrier', 'animal'], density: 0.64, rampTarget: 6 },
    ]),
  },
  {
    id: 'eventos-especiais',
    number: 6,
    name: 'Eventos Especiais',
    tagline: 'Corrida Noturna: só durante a temporada.',
    emoji: '🏆',
    theme: THEMES['eventos-especiais'],
    unlock: { kind: 'event', startsAt: SEASON.startsAt, endsAt: SEASON.endsAt, requiresRegion: 'ilha-inicial' },
    levels: levelsOf(6, 'eventos-especiais', { startSpeed: 12, maxSpeed: 16 }, [
      { name: 'Corrida Noturna I', lengthMeters: 620, obstacleKinds: ['barrier', 'high-bar', 'crate', 'cone', 'banana'], density: 0.45, rampTarget: 3 },
      { name: 'Corrida Noturna II', lengthMeters: 720, obstacleKinds: ['parked-car', 'traffic-car', 'high-bar'], density: 0.5, rampTarget: 4 },
      { name: 'Corrida Noturna III', lengthMeters: 820, obstacleKinds: ['sweeper', 'traffic-car', 'high-bar', 'crate', 'animal'], density: 0.56, rampTarget: 5 },
    ]),
  },
];

export const ALL_LEVELS: readonly LevelDefinition[] = REGIONS.flatMap((region) => region.levels);

const REGIONS_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const LEVELS_BY_ID = new Map(ALL_LEVELS.map((level) => [level.id, level]));

export function regionById(id: RegionId): RegionDefinition {
  const region = REGIONS_BY_ID.get(id);

  if (!region) {
    throw new Error(`Região "${id}" não existe em REGIONS.`);
  }

  return region;
}

export function findLevel(id: string): LevelDefinition | null {
  return LEVELS_BY_ID.get(id) ?? null;
}
