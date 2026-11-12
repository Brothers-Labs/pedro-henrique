import { premiumPass, SEASON_XP } from '../config/season.config';
import type {
  PassId,
  PremiumPassId,
  Reward,
  RewardStatus,
  SeasonDefinition,
  SeasonLevelInfo,
  SeasonProgress,
} from '../models/economy.model';
import { isWithin } from './calendar';

/** Ordem das faixas da trilha, de cima para baixo. */
export const PASS_ORDER: readonly PassId[] = ['gratuito', 'vip', 'luxo'];

export type SeasonPhase = 'upcoming' | 'active' | 'ended';

export function seasonPhase(season: SeasonDefinition, now: Date): SeasonPhase {
  if (now.getTime() < Date.parse(season.startsAt)) {
    return 'upcoming';
  }

  return isWithin(season.startsAt, season.endsAt, now) ? 'active' : 'ended';
}

export function createSeasonProgress(seasonId: string): SeasonProgress {
  return { seasonId, xp: 0, passes: [], claimedRewards: [], round: 0 };
}

/**
 * Parte do id de carteira que separa as voltas da temporada. A primeira volta
 * não tem marca: os lançamentos salvos antes do "recomeçar" continuam valendo.
 */
export function seasonRoundTag(progress: SeasonProgress): string {
  return progress.round === 0 ? '' : `:volta-${progress.round}`;
}

/**
 * Dá para recomeçar com a temporada valendo e a trilha completa. Antes do
 * último nível não: os prêmios do nível 1 saem sem custo, e recomeçar a
 * qualquer hora viraria uma fonte infinita de diamantes.
 */
export function canRestartSeason(progress: SeasonProgress, season: SeasonDefinition, now: Date): boolean {
  return seasonPhase(season, now) === 'active' && levelInfo(progress.xp, season.tiers.length).isMaxLevel;
}

/**
 * Recomeça a temporada de graça: XP e prêmios resgatados voltam ao início, e
 * os passes VIP e Luxo continuam (foram pagos). Devolve `null` quando não dá
 * para recomeçar.
 */
export function restartSeason(progress: SeasonProgress, season: SeasonDefinition, now: Date): SeasonProgress | null {
  if (!canRestartSeason(progress, season, now)) {
    return null;
  }

  return { ...progress, xp: 0, claimedRewards: [], round: progress.round + 1 };
}

/** XP que um nível pede para virar o seguinte. */
export function xpForLevel(level: number): number {
  return SEASON_XP.base + (level - 1) * SEASON_XP.increment;
}

/** XP total, a partir do zero, para chegar ao nível pedido. */
export function totalXpForLevel(level: number): number {
  let total = 0;

  for (let current = 1; current < level; current += 1) {
    total += xpForLevel(current);
  }

  return total;
}

export function levelInfo(totalXp: number, maxLevel: number): SeasonLevelInfo {
  let level = 1;
  let remaining = totalXp;

  while (level < maxLevel && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }

  const isMaxLevel = level === maxLevel;
  const xpForNextLevel = isMaxLevel ? 0 : xpForLevel(level);

  return {
    level,
    maxLevel,
    isMaxLevel,
    xpInLevel: isMaxLevel ? 0 : remaining,
    xpForNextLevel,
    percentage: isMaxLevel ? 100 : Math.min(100, Math.round((remaining / xpForNextLevel) * 100)),
  };
}

/** XP de temporada só sobe com a temporada valendo. */
export function addSeasonXp(progress: SeasonProgress, season: SeasonDefinition, amount: number, now: Date): SeasonProgress {
  if (amount <= 0 || seasonPhase(season, now) !== 'active') {
    return progress;
  }

  return { ...progress, xp: progress.xp + amount };
}

export function hasPass(progress: SeasonProgress, pass: PassId): boolean {
  return pass === 'gratuito' || progress.passes.includes(pass);
}

export function rewardKey(level: number, pass: PassId): string {
  return `${level}:${pass}`;
}

export function rewardStatus(progress: SeasonProgress, season: SeasonDefinition, level: number, pass: PassId): RewardStatus {
  if (progress.claimedRewards.includes(rewardKey(level, pass))) {
    return 'claimed';
  }

  if (levelInfo(progress.xp, season.tiers.length).level < level) {
    return 'locked-level';
  }

  return hasPass(progress, pass) ? 'claimable' : 'locked-pass';
}

export interface ClaimableReward {
  readonly level: number;
  readonly pass: PassId;
  readonly reward: Reward;
}

export function claimableRewards(progress: SeasonProgress, season: SeasonDefinition): readonly ClaimableReward[] {
  return season.tiers.flatMap((tier) =>
    PASS_ORDER.filter((pass) => rewardStatus(progress, season, tier.level, pass) === 'claimable').map((pass) => ({
      level: tier.level,
      pass,
      reward: tier.rewards[pass],
    })),
  );
}

/** Marca o prêmio como resgatado. Devolve `null` quando ele não pode ser resgatado. */
export function markClaimed(
  progress: SeasonProgress,
  season: SeasonDefinition,
  level: number,
  pass: PassId,
  now: Date,
): SeasonProgress | null {
  if (seasonPhase(season, now) === 'upcoming' || rewardStatus(progress, season, level, pass) !== 'claimable') {
    return null;
  }

  return { ...progress, claimedRewards: [...progress.claimedRewards, rewardKey(level, pass)] };
}

/**
 * Diamantes pedidos por um passe. Quem já tem o VIP paga só a diferença para
 * o Luxo: o passe maior inclui o menor, e ninguém paga duas vezes.
 */
export function passPrice(progress: SeasonProgress, pass: PremiumPassId): number {
  const price = premiumPass(pass).priceInDiamonds;

  return pass === 'luxo' && progress.passes.includes('vip') ? price - premiumPass('vip').priceInDiamonds : price;
}

/** Centavos pedidos por um passe pago no Pix. Como nos diamantes, quem tem o VIP paga só a diferença para o Luxo. */
export function passPriceInCents(progress: SeasonProgress, pass: PremiumPassId): number {
  const price = premiumPass(pass).priceInCents;

  return pass === 'luxo' && progress.passes.includes('vip') ? price - premiumPass('vip').priceInCents : price;
}

/**
 * Junta os passes pagos em reais e já conferidos. Diferente da troca por
 * diamantes, vale mesmo com a temporada encerrada: foi pago, é de quem pagou.
 */
export function withPurchasedPasses(progress: SeasonProgress, purchased: readonly PremiumPassId[]): SeasonProgress {
  const granted = purchased.flatMap((pass): readonly PremiumPassId[] => (pass === 'luxo' ? ['vip', 'luxo'] : ['vip']));
  const passes = [...new Set([...progress.passes, ...granted])];

  return passes.length === progress.passes.length ? progress : { ...progress, passes };
}

/** Libera o passe (o Luxo traz o VIP junto). Devolve `null` quando já o tem ou a temporada não está valendo. */
export function grantPass(progress: SeasonProgress, season: SeasonDefinition, pass: PremiumPassId, now: Date): SeasonProgress | null {
  if (seasonPhase(season, now) !== 'active' || progress.passes.includes(pass)) {
    return null;
  }

  const granted: readonly PremiumPassId[] = pass === 'luxo' ? ['vip', 'luxo'] : ['vip'];

  return { ...progress, passes: [...new Set([...progress.passes, ...granted])] };
}

/** XP que falta para subir `levels` níveis a partir de agora, sem passar do máximo. */
export function xpToBuyLevels(progress: SeasonProgress, season: SeasonDefinition, levels: number): number {
  const info = levelInfo(progress.xp, season.tiers.length);
  const targetLevel = Math.min(season.tiers.length, info.level + levels);

  return Math.max(0, totalXpForLevel(targetLevel) - progress.xp);
}
