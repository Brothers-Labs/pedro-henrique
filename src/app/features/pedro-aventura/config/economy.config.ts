/**
 * Quanto cada coisa feita numa fase rende.
 *
 * Perder ainda rende um pouco de XP de temporada: tentar já é jogar, e a
 * criança nunca sai de uma partida de mãos vazias.
 */
export const RUN_REWARDS = {
  victoryXp: 120,
  xpPerStar: 40,
  xpPerCrown: 20,
  xpPerRamp: 5,
  defeatXp: 30,
  /** Diamantes da primeira vitória em cada fase. */
  firstWinDiamonds: 10,
  /** Bônus da primeira vez com três estrelas. */
  firstThreeStarsDiamonds: 15,
} as const;

/**
 * Quanto vale cada coisa pega na pista.
 *
 * Moeda e barra de ouro viram moedas na carteira; o diamante vira diamante,
 * a moeda rara que libera os passes VIP e Luxo.
 */
export const PICKUP_VALUES = {
  coin: { currency: 'coins', amount: 1 },
  goldBar: { currency: 'coins', amount: 10 },
  diamond: { currency: 'diamonds', amount: 1 },
} as const;

/** Pontuação mostrada no fim da fase. */
export const SCORE_RULES = {
  perCoin: 10,
  perGoldBar: 100,
  perDiamond: 300,
  perCrown: 250,
  perRamp: 50,
  /** Por segundo poupado em relação ao tempo-alvo. */
  perSecondUnderTarget: 20,
  flawlessBonus: 500,
} as const;

/** Lançamentos mantidos no histórico curto da carteira. */
export const WALLET_HISTORY_LIMIT = 50;

/** Ids de lançamento lembrados para recusar repetições. */
export const APPLIED_IDS_LIMIT = 500;
