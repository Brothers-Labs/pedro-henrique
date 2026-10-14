/**
 * O quanto o Pedro Flash pega leve com o Pedro.
 *
 * Correr a quarenta metros por segundo é emocionante, mas o que mais pesa
 * para uma criança é perder o que juntou e cair no buraco. Cada nível
 * ajusta a velocidade, o tamanho do castigo e a força dos adversários.
 */
export interface FlashTuning {
  /** Fração da velocidade máxima do tênis que o Pedro usa. */
  readonly playerPace: number;

  /** Fração da velocidade máxima que os corredores adversários usam. */
  readonly rivalPace: number;

  /** Vantagem, em metros, a partir da qual o adversário tira o pé. */
  readonly rivalLeadLimit: number;

  /** Ritmo do adversário que passou do `rivalLeadLimit`, em fração do ritmo normal. */
  readonly rivalLeadPace: number;

  /**
   * Energia do raio que cada adversário recarrega por segundo.
   *
   * Eles não juntam raios na pista; sem recarga, nunca usariam o modo
   * relâmpago, e a corrida difícil ficaria fácil.
   */
  readonly rivalEnergyPerSecond: number;

  /** Se o Pedro pula sozinho na beira dos buracos. */
  readonly autoJumpGaps: boolean;

  /** Fração dos raios que o Pedro perde ao se machucar; sempre perde pelo menos um. */
  readonly raioLossFraction: number;

  /** Multiplica a velocidade dos robôs que se mexem (besouro e tatu). */
  readonly enemySpeed: number;

  /** Multiplica quantos golpes cada chefão aguenta. */
  readonly bossHitsFactor: number;

  /** Multiplica o tempo entre os ataques do chefão: maior é mais calmo. */
  readonly bossAttackInterval: number;

  /** Quanto tempo o chefão fica cansado, ao alcance de um golpe. */
  readonly bossTiredSeconds: number;
}
