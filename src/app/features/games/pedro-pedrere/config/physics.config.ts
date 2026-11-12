/**
 * Números da física do Pedro Pedrerê, em blocos e segundos.
 *
 * Um bloco é a unidade de tudo: a altura do pulo, a velocidade e o tamanho do
 * Pedro. Assim, ajustar a sensação do jogo é mudar este arquivo, e só ele.
 */
export const PHYSICS = {
  /** Passo fixo da simulação: o jogo se comporta igual em qualquer tela. */
  stepSeconds: 1 / 60,

  gravity: 38,
  maxFallSpeed: 20,

  heroWidth: 0.7,
  heroHeight: 0.9,
  runSpeed: 7,
  groundAcceleration: 60,
  airAcceleration: 36,

  /** Pulo de quase três blocos: passa por cima de um degrau de dois com folga. */
  jumpSpeed: 15,
  /** Soltar o botão no meio da subida encurta o pulo. */
  jumpCutFactor: 0.5,
  /** Ainda dá para pular um instante depois de sair da beirada. */
  coyoteSeconds: 0.1,
  /** Apertar pular um pouco antes de pousar também vale. */
  jumpBufferSeconds: 0.12,

  trampolineSpeed: 22,
  stompBounceSpeed: 11,
  invulnerableSeconds: 1.5,
  heroHearts: 3,

  pebbleWidth: 0.8,
  pebbleHeight: 0.7,
  pebbleSpeed: 2,
} as const;
