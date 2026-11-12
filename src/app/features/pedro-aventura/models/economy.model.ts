/**
 * Economia do Pedro Aventura: carteira, cosméticos, temporada e missões.
 *
 * Nada aqui envolve dinheiro de verdade. Moedas e diamantes só se ganham
 * jogando; os passes VIP e Luxo são trocados por diamantes.
 */

/* Carteira ----------------------------------------------------------------------------- */

export type Currency = 'coins' | 'diamonds';

/**
 * Lançamento no livro-caixa.
 *
 * O `id` é a chave de idempotência: o mesmo lançamento aplicado duas vezes
 * (um resultado de partida reenviado, um toque duplo no resgate) só conta uma.
 */
export interface WalletTransaction {
  readonly id: string;
  readonly currency: Currency;
  /** Positivo para crédito, negativo para débito. */
  readonly amount: number;
  readonly reason: string;
  readonly at: string;
}

export interface Wallet {
  readonly coins: number;
  readonly diamonds: number;
  /** Últimos lançamentos, do mais novo para o mais antigo. */
  readonly transactions: readonly WalletTransaction[];
  /** Ids já aplicados, para recusar repetições mesmo depois de sair do histórico curto. */
  readonly appliedIds: readonly string[];
}

/* Cosméticos ---------------------------------------------------------------------------- */

export type CosmeticSlot = 'outfit' | 'dog' | 'vehicle';

export type CosmeticRarity = 'comum' | 'raro' | 'epico' | 'lendario';

/** Formato do veículo no lobby; só os cosméticos de veículo usam. */
export type VehicleShape = 'suv' | 'sport' | 'moto';

/** Cores que os modelos 3D usam para vestir o cosmético. */
export interface CosmeticPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
}

export interface Cosmetic {
  readonly id: string;
  readonly slot: CosmeticSlot;
  readonly name: string;
  readonly emoji: string;
  readonly rarity: CosmeticRarity;
  readonly palette: CosmeticPalette;
  readonly vehicleShape?: VehicleShape;
  /** Preço na loja; `null` quando só sai como prêmio do passe. */
  readonly price: { readonly currency: Currency; readonly amount: number } | null;
}

export interface Inventory {
  readonly owned: readonly string[];
  readonly equipped: Readonly<Record<CosmeticSlot, string>>;
}

/* Temporada ----------------------------------------------------------------------------- */

export type PassId = 'gratuito' | 'vip' | 'luxo';
export type PremiumPassId = Exclude<PassId, 'gratuito'>;

/** O que um baú entrega. Fixo e mostrado antes de abrir: nada de sorteio. */
export interface ChestContents {
  readonly coins: number;
  readonly diamonds: number;
}

export type Reward =
  | { readonly kind: 'coins'; readonly amount: number }
  | { readonly kind: 'diamonds'; readonly amount: number }
  | { readonly kind: 'cosmetic'; readonly cosmeticId: string }
  | { readonly kind: 'chest'; readonly name: string; readonly contents: ChestContents };

export interface SeasonTier {
  readonly level: number;
  readonly rewards: Readonly<Record<PassId, Reward>>;
}

export interface PremiumPass {
  readonly id: PremiumPassId;
  readonly name: string;
  readonly priceInDiamonds: number;
  /**
   * Preço em dinheiro, em centavos de real, pago por Pix por um adulto com a
   * conta conectada. O mesmo passe também sai por diamantes.
   */
  readonly priceInCents: number;
  readonly perks: readonly string[];
}

export interface SeasonDefinition {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  /** Instantes ISO com fuso: começo incluído, fim excluído. */
  readonly startsAt: string;
  readonly endsAt: string;
  readonly tiers: readonly SeasonTier[];
  /** Diamantes por nível comprado na tela do passe. */
  readonly levelPriceInDiamonds: number;
}

/** Progresso salvo de uma temporada. */
export interface SeasonProgress {
  readonly seasonId: string;
  readonly xp: number;
  readonly passes: readonly PremiumPassId[];
  /** Prêmios já resgatados, no formato `nível:faixa`. */
  readonly claimedRewards: readonly string[];
  /**
   * Vezes que a temporada foi recomeçada. Entra nos ids da carteira: o prêmio
   * do nível 3 da segunda volta é outro lançamento, e não uma repetição.
   */
  readonly round: number;
}

export interface SeasonLevelInfo {
  readonly level: number;
  readonly maxLevel: number;
  readonly isMaxLevel: boolean;
  readonly xpInLevel: number;
  readonly xpForNextLevel: number;
  readonly percentage: number;
}

export type RewardStatus = 'claimed' | 'claimable' | 'locked-level' | 'locked-pass';

/* Missões ------------------------------------------------------------------------------- */

export type MissionCategory = 'daily' | 'weekly' | 'season' | 'special';

/**
 * O que uma missão observa. Cada métrica vem de um evento confiável da
 * partida (o resultado calculado pela simulação), nunca de um número digitado.
 */
export type MissionMetric =
  | 'levels-completed'
  | 'coins-collected'
  | 'hearts-collected'
  | 'crowns-collected'
  | 'ramps-jumped'
  | 'flawless-levels'
  | 'under-target-time'
  | 'regions-unlocked'
  | 'event-levels-completed';

export interface MissionDefinition {
  readonly id: string;
  readonly category: MissionCategory;
  readonly title: string;
  readonly emoji: string;
  readonly metric: MissionMetric;
  readonly target: number;
  readonly reward: { readonly xp: number; readonly coins: number; readonly diamonds: number };
}

/** Progresso salvo de uma missão dentro de um período. */
export interface MissionProgress {
  /** Período a que o valor pertence (dia, semana, temporada ou evento). */
  readonly period: string;
  readonly value: number;
  readonly isClaimed: boolean;
}

export type MissionState = 'in-progress' | 'completed' | 'claimed';

export interface MissionStatus {
  readonly mission: MissionDefinition;
  readonly progress: number;
  readonly state: MissionState;
  /** Fim do período, quando ele expira. */
  readonly expiresAt: Date | null;
}
