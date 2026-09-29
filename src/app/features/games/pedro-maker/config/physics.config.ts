/**
 * Números da física do Pedro Maker.
 *
 * Vivem fora do motor porque o validador de fases usa os mesmos valores para
 * garantir que todo pulo pedido por uma fase é um pulo possível.
 */

/** Lado de uma célula da grade, em pixels do mundo. */
export const TILE_SIZE = 48;

/** Resolução lógica do jogo: 16:9, escalada para caber em qualquer tela. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

/** Altura padrão das fases, em células: exatamente uma tela. */
export const DEFAULT_LEVEL_HEIGHT = VIEW_HEIGHT / TILE_SIZE;

export const GRAVITY = 1900;

export const PLAYER_PHYSICS = {
  /** Caixa de colisão menor que o desenho: encostar de raspão não machuca. */
  bodyWidth: 26,
  bodyHeight: 50,
  walkSpeed: 270,
  runSpeed: 380,
  turboMultiplier: 1.35,
  groundAcceleration: 2400,
  groundDeceleration: 2800,
  iceDeceleration: 420,
  airAcceleration: 1700,
  jumpVelocity: 820,
  /** Pulo 40% mais alto: a altura cresce com o quadrado da velocidade. */
  superJumpMultiplier: Math.sqrt(1.4),
  /** Soltar o botão cedo corta o pulo, e é assim que se faz pulinho curto. */
  jumpCutMultiplier: 0.45,
  springVelocity: 1250,
  stompBounceVelocity: 560,
  maxFallSpeed: 980,
  /** Tolerâncias que perdoam o pulo apertado um instante antes ou depois. */
  coyoteTimeMs: 110,
  jumpBufferMs: 140,
  /** Margem de cima do inimigo que ainda conta como pisão. */
  stompTolerance: 18,
} as const;

/**
 * Alcance usado pelo validador.
 *
 * É mais curto que o pulo de verdade: a fase aprovada aqui sobra folga para
 * uma criança de sete anos, que não pula no último pixel da plataforma.
 */
export const VALIDATION_PHYSICS = {
  jumpVelocity: PLAYER_PHYSICS.jumpVelocity * 0.94,
  springVelocity: PLAYER_PHYSICS.springVelocity * 0.94,
  horizontalSpeed: PLAYER_PHYSICS.walkSpeed * 0.92,
  halfBodyWidth: PLAYER_PHYSICS.bodyWidth / 2,
  bodyHeight: PLAYER_PHYSICS.bodyHeight,
  stepSeconds: 1 / 60,
  maxSteps: 240,
} as const;

export const POWER_UP_DURATION_MS = {
  'super-jump': 20000,
  turbo: 12000,
  magnet: 15000,
  wings: 20000,
  /** O escudo dura até proteger de um toque. */
  shield: 0,
} as const;

/** Raio de atração do ímã, em pixels. */
export const MAGNET_RADIUS = 190;

/** Moedas que um bloco surpresa de moedas solta. */
export const SURPRISE_COIN_COUNT = 5;
