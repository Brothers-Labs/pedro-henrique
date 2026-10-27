/**
 * Física do herói do PedroCraft.
 *
 * Não é conteúdo — é o motor: mudar estes números muda a sensação de andar,
 * e não o que existe no mundo. Por isso moram no código, e não nos JSON.
 */

/** Passo fixo da simulação: 60 por segundo, em qualquer tela. */
export const STEP_MS = 1000 / 60;

export const HERO_PHYSICS = {
  /** Metade da largura da caixa de colisão. */
  halfWidth: 0.3,
  height: 1.7,
  /** Altura dos olhos, a partir dos pés. */
  eyeHeight: 1.55,
  walkSpeed: 4.3,
  swimSpeed: 2.2,
  /** Blocos por segundo ao quadrado. */
  gravity: 28,
  /** Dá um pulo de pouco mais de um bloco: sobe degraus, não pula cerca. */
  jumpSpeed: 8.6,
  maxFallSpeed: 40,
  waterGravity: 9,
  maxSinkSpeed: 3,
  swimUpSpeed: 3.4,
  /** Impulso para sair da água pela beirada. */
  climbOutSpeed: 6,
  /** Quanto da velocidade desejada é alcançada por passo no chão e no ar. */
  groundGrip: 0.35,
  airGrip: 0.08,
} as const;

/** Inclinação máxima do olhar: quase reto para cima ou para baixo, nunca de cabeça para baixo. */
export const MAX_PITCH = (Math.PI / 2) * 0.98;
