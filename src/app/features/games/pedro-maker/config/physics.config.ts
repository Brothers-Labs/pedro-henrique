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
  /** Quique do bloco musical: alto segurando o pulo, um saltinho se soltar. */
  noteBlockVelocity: 1050,
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
  star: 10000,
  'giga-mushroom': 10000,
  'turbo-mushroom': 10000,
  'magnet-mushroom': 15000,
  'tall-mushroom': 12000,
  /** Curtinho de propósito: com os comandos trocados, oito segundos já são um desafio. */
  'reverse-mushroom': 8000,
  'mini-mushroom': 12000,
  /** Moedas de multiplicação: tempo de pegar uma boa fileira de moedas. */
  'coin-x2': 15000,
  'coin-x4': 15000,
  'coin-x1000': 15000,
  'coin-x9999': 15000,
  /** Escudo, cogumelos e flores duram até proteger de um toque. */
  shield: 0,
  mushroom: 0,
  'fire-flower': 0,
  'ice-flower': 0,
  'cat-mushroom': 0,
  'leaf-mushroom': 0,
  'raccoon-leaf': 0,
  /** O cogumelo de vida age na hora: enche os corações. */
  'one-up': 0,
  /** O troca-personagem também age na hora: o herói vira outro. */
  'swap-mushroom': 0,
  /** O Cogumelo Pedrerê também: o herói vira o Pedro do Pedro Pedrerê na hora. */
  'pedrere-mushroom': 0,
} as const;

/**
 * Nadar: dentro da água a gravidade quase some, a queda é lenta e cada
 * apertada de pulo é uma braçada. Na superfície, a braçada vira um salto para
 * fora — é assim que se sai do mar.
 */
export const SWIM_PHYSICS = {
  gravityScale: 0.22,
  maxSinkSpeed: 150,
  strokeVelocity: 380,
  /** Fração do pulo normal ao sair da água pela superfície. */
  leapMultiplier: 0.9,
  speedMultiplier: 0.6,
} as const;

/**
 * Cogumelo Gato: no ar, empurrando uma parede, o herói sobe por ela por um
 * tempinho, que só recarrega no chão — assim não dá para escalar para sempre.
 * Pular grudado na parede lança o herói para o lado de lá.
 */
export const CAT_SUIT_PHYSICS = {
  climbSpeed: 260,
  climbMs: 1400,
  /** Fração do pulo normal no pulo de parede. */
  wallJumpMultiplier: 0.9,
  wallJumpPush: 340,
} as const;

/** Cogumelo Folha: segurando o pulo enquanto cai, o herói plana devagar. */
export const LEAF_SUIT_PHYSICS = {
  glideFallSpeed: 110,
} as const;

/**
 * Folha do Guaxinim: segurando o pulo no ar, o herói sobe voando a uma
 * velocidade fixa — ao contrário da folha, que só freia a queda. O fôlego do
 * voo só recarrega no chão. O botão de ação gira o rabo, que derruba inimigos e
 * quebra tijolos ao alcance.
 */
export const RACCOON_SUIT_PHYSICS = {
  flySpeed: 300,
  flightMs: 900,
  tailSpinMs: 320,
  /** Espera entre um giro e outro: segurar o botão não vira um liquidificador. */
  tailSpinCooldownMs: 450,
  /** Quanto o rabo alcança além da caixa do herói, para cada lado. */
  tailReach: 40,
} as const;

/** Nos últimos segundos do Giga e dos cogumelos com tempo o herói pisca, avisando que o efeito vai acabar. */
export const POWER_UP_WARNING_MS = 2500;

/**
 * Giga Cogumelo: por alguns segundos a caixa de colisão dobra de tamanho, o
 * herói não se machuca, derruba inimigos e quebra tijolos só de encostar.
 * Antes de acabar, ele pisca para avisar.
 */
export const GIGA_PHYSICS = {
  bodyScale: 2,
  /** Folga além da caixa que ainda conta como esbarrão num tijolo. */
  brickReach: 2,
} as const;

/**
 * Cogumelo Turbo: mais rápido que o Turbo dos power-ups e com arrancada forte,
 * para a criança sentir a diferença logo no primeiro passo. O rastro de
 * faíscas mostra que o efeito está ligado.
 */
export const TURBO_MUSHROOM_PHYSICS = {
  speedMultiplier: 1.6,
  accelerationMultiplier: 1.6,
  trailIntervalMs: 70,
  /** Abaixo desta velocidade o herói está quase parado e não deixa rastro. */
  trailMinSpeed: 120,
} as const;

/**
 * Cogumelo Alto: o herói fica comprido e magrelo, com a cabeça lá em cima — mas
 * o músculo é fraco, e ele pula mais baixo e anda mais devagar. A caixa de
 * colisão só cresce para cima e continua abaixo de dois blocos (96 pixels),
 * então passa em todo lugar em que o herói normal passa.
 */
export const TALL_MUSHROOM_PHYSICS = {
  heightScale: 1.8,
  /** Músculo fraco: o pulo tem esta fração da velocidade normal. */
  jumpMultiplier: 0.85,
  speedMultiplier: 0.85,
} as const;

/**
 * Cogumelo de Encolher: o herói fica do tamanho de meio bloco e, levinho, pula
 * um pouco mais alto. A caixa de colisão encolhe por igual com os pés no mesmo
 * lugar e passa nos buraquinhos de um bloco só, onde o herói normal não cabe.
 * Quando o efeito acaba dentro de um buraquinho, ele continua pequeno até ter
 * espaço para crescer de novo.
 */
export const MINI_MUSHROOM_PHYSICS = {
  bodyScale: 0.5,
  /** Levinho: o pulo tem esta fração da velocidade normal. */
  jumpMultiplier: 1.1,
} as const;

/** Bolas de fogo da Flor de Fogo: quicam pelo chão e somem ao bater numa parede. */
export const FIREBALL_PHYSICS = {
  size: 18,
  speed: 560,
  bounceVelocity: 420,
  maxFallSpeed: 700,
  lifeMs: 1800,
  /** Bolas no ar ao mesmo tempo: segurar o botão não vira uma metralhadora. */
  maxAlive: 2,
} as const;

/** Bolas de gelo da Flor de Gelo: mais lentas e rasteiras que as de fogo. */
export const ICEBALL_PHYSICS = {
  speed: 430,
  bounceVelocity: 300,
} as const;

/** Quanto tempo um inimigo atingido pelo gelo fica congelado antes de derreter. */
export const FROZEN_ENEMY_MS = 5000;

/**
 * Escorregador: a rampa desce `height` blocos em `length` blocos de largura.
 * A velocidade cresce do embalo inicial até o máximo; a altura cabe num pulo.
 */
export const SLIDE_PHYSICS = {
  length: 3,
  height: 3,
  startSpeed: 320,
  acceleration: 1100,
  maxSpeed: 820,
} as const;

/** Tamanho do Pedro com o Super Cogumelo, só no desenho: a colisão não muda. */
export const BIG_PEDRO_SCALE = 1.35;

/** Tamanho do Pedro gigante no desenho: o dobro do grande, como a caixa de colisão. */
export const GIGA_PEDRO_SCALE = BIG_PEDRO_SCALE * GIGA_PHYSICS.bodyScale;

/** No desenho, o Pedro do Cogumelo Alto estica na altura e afina nos lados. */
export const TALL_PEDRO_STRETCH = TALL_MUSHROOM_PHYSICS.heightScale;
export const TALL_PEDRO_THINNING = 0.8;

/** No desenho, o Pedro do Cogumelo de Encolher fica do tamanho da caixa de colisão encolhida. */
export const MINI_PEDRO_SCALE = MINI_MUSHROOM_PHYSICS.bodyScale;

/** Raio de atração do ímã, em pixels. */
export const MAGNET_RADIUS = 190;

/** O Cogumelo Ímã puxa de mais longe que o ímã antigo: quase meia tela. */
export const MAGNET_MUSHROOM_RADIUS = 320;

/** Moedas que um bloco surpresa de moedas solta. */
export const SURPRISE_COIN_COUNT = 5;

/** Cabeçadas que o bloco de moedas aguenta, uma moeda por cabeçada. */
export const MULTI_COIN_BLOCK_COUNT = 8;

/** Quanto valem as moedas gigantes. */
export const BIG_COIN_VALUE = 10;
export const HUGE_COIN_VALUE = 50;
