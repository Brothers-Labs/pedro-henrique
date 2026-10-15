/**
 * Campanha do Pedro Aventura: regiões, fases e o progresso em cada fase.
 *
 * Tudo aqui é dado. Acrescentar uma região ou uma fase é acrescentar um
 * registro em `config/regions.config.ts`; o gerador e o motor não mudam.
 */

export type RegionId =
  | 'ilha-inicial'
  | 'zona-urbana'
  | 'montanha-radical'
  | 'cidade-do-luxo'
  | 'deserto-xtreme'
  | 'eventos-especiais';

/** Obstáculos da pista e o jeito de passar por cada um. */
export type ObstacleKind =
  /** Barreira baixa: pular ou trocar de faixa. */
  | 'barrier'
  /** Barra no alto: derrapar por baixo. */
  | 'high-bar'
  /** Caixa: quebrar com o ataque, pular ou trocar de faixa. */
  | 'crate'
  /** Cone pequeno: pular. */
  | 'cone'
  /** Carro parado: trocar de faixa. */
  | 'parked-car'
  /** Carro andando na contramão: trocar de faixa. */
  | 'traffic-car'
  /** Barreira que varre as faixas de um lado a outro: pular ou esperar a abertura. */
  | 'sweeper';

/** Cores e clima de uma região, usados pelo mapa e pela cena da corrida. */
export interface RegionTheme {
  readonly skyTop: string;
  readonly skyBottom: string;
  readonly ground: string;
  readonly road: string;
  readonly roadLine: string;
  readonly accent: string;
  readonly isNight: boolean;
  /** Enfeite da beira da pista. */
  readonly scenery: 'palms' | 'buildings' | 'rocks' | 'towers' | 'dunes' | 'neon';
}

/**
 * Como uma região abre.
 *
 * - `open`: aberta desde o começo.
 * - `stars`: pede estrelas conquistadas em outra região.
 * - `event`: só existe dentro de uma janela de datas e pede uma região vencida.
 */
export type RegionUnlock =
  | { readonly kind: 'open' }
  | { readonly kind: 'stars'; readonly regionId: RegionId; readonly stars: number }
  | {
      readonly kind: 'event';
      readonly startsAt: string;
      readonly endsAt: string;
      readonly requiresRegion: RegionId;
    };

export interface LevelDefinition {
  /** No formato `região-número`, como `1-3`. É também a semente da pista. */
  readonly id: string;
  readonly regionId: RegionId;
  readonly number: number;
  readonly name: string;
  readonly lengthMeters: number;
  /** Velocidade inicial e final, em metros por segundo. */
  readonly startSpeed: number;
  readonly maxSpeed: number;
  readonly obstacleKinds: readonly [ObstacleKind, ...ObstacleKind[]];
  /** De 0 (calmo) a 1 (cheio): quanto obstáculo cabe na pista. */
  readonly density: number;
  readonly coinTarget: number;
  readonly rampTarget: number;
  readonly targetTimeSeconds: number;
  /** Dica mostrada antes de começar, para as fases de tutorial. */
  readonly hint?: string;
}

export interface RegionDefinition {
  readonly id: RegionId;
  readonly number: number;
  readonly name: string;
  readonly tagline: string;
  readonly emoji: string;
  readonly theme: RegionTheme;
  readonly unlock: RegionUnlock;
  readonly levels: readonly LevelDefinition[];
}

/** Progresso salvo de uma fase. */
export interface PlayerLevelProgress {
  readonly bestStars: number;
  readonly bestTimeMs: number | null;
  readonly bestScore: number;
  readonly wins: number;
  readonly attempts: number;
}

/** Situação de uma região para a tela. */
export type RegionStatus = 'unlocked' | 'locked' | 'event-closed';
