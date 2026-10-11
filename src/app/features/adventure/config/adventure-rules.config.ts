/**
 * Regras numéricas da Aventura, num lugar só.
 *
 * Nenhum outro arquivo escreve "70%" ou "+20 pontos": ajustar a generosidade
 * da jornada é mudar este arquivo e mais nada.
 */
export const ADVENTURE_RULES = {
  /** Sobe a cada mudança incompatível do formato guardado. */
  schemaVersion: 1,

  /**
   * Estrelas de uma fase.
   *
   * Terminar já vale a primeira: ninguém precisa acertar tudo para seguir em
   * frente. As outras duas recompensam o capricho.
   */
  stars: {
    max: 3,
    secondStarRatio: 0.7,
    thirdStarRatio: 0.9,
  },

  /**
   * Bônus pagos uma vez só.
   *
   * Rejogar uma fase continua rendendo os pontos de cada resposta, como em
   * qualquer jogo, mas estes bônus não se repetem: só uma estrela nova paga
   * de novo, e só a diferença.
   */
  rewards: {
    firstCompletion: { points: 20, petXp: 10 },
    perNewStar: { points: 10, petXp: 10 },
    checkpoint: { points: 30, petXp: 20 },
    guardian: { points: 100, petXp: 60 },
  },
} as const;
