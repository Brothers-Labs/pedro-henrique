/**
 * O quanto a corrida pega leve com o Pedro.
 *
 * Dificuldade não é só a velocidade dos adversários: para uma criança, o que
 * mais pesa é errar a curva, sair na grama e bater no muro. Cada nível ajusta
 * as duas coisas — quão bons são os outros e quanto o jogo perdoa o erro.
 */
export interface RaceTuning {
  /** Fração da velocidade máxima que os adversários usam. */
  readonly rivalPace: number;

  /**
   * De 0 a 1: com o volante solto, o kart do Pedro acompanha a curva sozinho
   * nessa intensidade. Apertar para um lado sempre vale por inteiro.
   */
  readonly steeringAssist: number;

  /** Fração da velocidade máxima que o kart do Pedro mantém na grama. */
  readonly grassSpeedFactor: number;

  /** Fração da velocidade que o kart do Pedro mantém ao bater no muro. */
  readonly wallSpeedKeep: number;

  /** Se os adversários largam cascas para trás. */
  readonly rivalsDropPeels: boolean;

  /** Vantagem, em metros de corrida, a partir da qual o adversário tira o pé. */
  readonly rivalLeadLimit: number;

  /** Ritmo do adversário que passou do `rivalLeadLimit`, em fração do ritmo normal. */
  readonly rivalLeadPace: number;
}
