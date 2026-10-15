import { COSMETICS, DEFAULT_EQUIPPED, isCosmeticId, STARTER_COSMETICS } from '../config/cosmetics.config';
import { APPLIED_IDS_LIMIT, WALLET_HISTORY_LIMIT } from '../config/economy.config';
import { MISSIONS } from '../config/missions.config';
import { ALL_LEVELS, REGIONS } from '../config/regions.config';
import { SEASON } from '../config/season.config';
import type { AventuraSettings, AventuraState } from '../models/aventura-state.model';
import type { PlayerLevelProgress } from '../models/campaign.model';
import type {
  CosmeticSlot,
  Inventory,
  MissionProgress,
  PremiumPassId,
  SeasonProgress,
  Wallet,
  WalletTransaction,
} from '../models/economy.model';
import { APPLIED_ATTEMPTS_LIMIT, AVENTURA_SCHEMA_VERSION, createInitialState, DEFAULT_SETTINGS } from './aventura-game';
import { rewardKey, PASS_ORDER } from './season-pass';

const LEVEL_IDS = new Set(ALL_LEVELS.map((level) => level.id));
const REGION_IDS = new Set<string>(REGIONS.map((region) => region.id));
const MISSION_IDS = new Set(MISSIONS.map((mission) => mission.id));
const PREMIUM_PASSES = new Set<string>(['vip', 'luxo']);
const QUALITY_VALUES = new Set(['auto', 'alta', 'media', 'baixa']);
const TOUCH_VALUES = new Set(['auto', 'sempre', 'nunca']);
const SLOTS: readonly CosmeticSlot[] = ['outfit', 'dog', 'vehicle'];
/** Ids de temporada: letras, números e hífen. Nada de `__proto__` nem de chave inventada sem fim. */
const SEASON_ID_PATTERN = /^[a-z0-9-]{1,40}$/;
const MAX_STORED_SEASONS = 20;

/**
 * Aceita o que foi guardado e descarta só o que não faz sentido.
 *
 * Um campo estranho (de uma versão antiga, de um dado corrompido, de alguém
 * mexendo no aparelho) nunca derruba o jogo: volta ao padrão, e o resto do
 * progresso continua de pé.
 */
export function sanitizeState(value: unknown, now: Date): AventuraState {
  const initial = createInitialState(now);

  if (!isRecord(value)) {
    return initial;
  }

  return {
    version: AVENTURA_SCHEMA_VERSION,
    createdAt: typeof value['createdAt'] === 'string' ? value['createdAt'] : initial.createdAt,
    wallet: sanitizeWallet(value['wallet']),
    levels: sanitizeLevels(value['levels']),
    unlockedRegions: unique([...initial.unlockedRegions, ...stringList(value['unlockedRegions']).filter((id) => REGION_IDS.has(id))]),
    seasons: sanitizeSeasons(value['seasons']),
    missions: sanitizeMissions(value['missions']),
    inventory: sanitizeInventory(value['inventory']),
    settings: sanitizeSettings(value['settings']),
    appliedAttempts: unique(stringList(value['appliedAttempts'])).slice(0, APPLIED_ATTEMPTS_LIMIT),
  };
}

function sanitizeWallet(value: unknown): Wallet {
  const stored = isRecord(value) ? value : {};
  const transactions = Array.isArray(stored['transactions'])
    ? stored['transactions'].filter(isTransaction).slice(0, WALLET_HISTORY_LIMIT)
    : [];

  return {
    coins: count(stored['coins']),
    diamonds: count(stored['diamonds']),
    transactions,
    appliedIds: unique(stringList(stored['appliedIds'])).slice(0, APPLIED_IDS_LIMIT),
  };
}

function isTransaction(value: unknown): value is WalletTransaction {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    (value['currency'] === 'coins' || value['currency'] === 'diamonds') &&
    typeof value['amount'] === 'number' &&
    Number.isInteger(value['amount']) &&
    typeof value['reason'] === 'string' &&
    typeof value['at'] === 'string'
  );
}

function sanitizeLevels(value: unknown): Record<string, PlayerLevelProgress> {
  const stored = isRecord(value) ? value : {};
  const levels: Record<string, PlayerLevelProgress> = {};

  for (const [id, entry] of Object.entries(stored)) {
    if (!LEVEL_IDS.has(id) || !isRecord(entry)) {
      continue;
    }

    const bestTime = entry['bestTimeMs'];

    levels[id] = {
      bestStars: Math.min(3, count(entry['bestStars'])),
      bestTimeMs: typeof bestTime === 'number' && Number.isFinite(bestTime) && bestTime > 0 ? Math.round(bestTime) : null,
      bestScore: count(entry['bestScore']),
      wins: count(entry['wins']),
      attempts: count(entry['attempts']),
    };
  }

  return levels;
}

function sanitizeSeasons(value: unknown): Record<string, SeasonProgress> {
  const stored = isRecord(value) ? value : {};
  const seasons: Record<string, SeasonProgress> = {};
  const validRewards = new Set(SEASON.tiers.flatMap((tier) => PASS_ORDER.map((pass) => rewardKey(tier.level, pass))));

  for (const [id, entry] of Object.entries(stored).slice(0, MAX_STORED_SEASONS)) {
    if (!SEASON_ID_PATTERN.test(id) || !isRecord(entry)) {
      continue;
    }

    // Temporadas antigas ficam no histórico como estão; só a atual tem os prêmios conferidos.
    const isCurrent = id === SEASON.id;

    seasons[id] = {
      seasonId: id,
      xp: count(entry['xp']),
      passes: unique(stringList(entry['passes']).filter((pass): pass is PremiumPassId => PREMIUM_PASSES.has(pass))),
      claimedRewards: unique(stringList(entry['claimedRewards']).filter((key) => !isCurrent || validRewards.has(key))),
    };
  }

  return seasons;
}

function sanitizeMissions(value: unknown): Record<string, MissionProgress> {
  const stored = isRecord(value) ? value : {};
  const missions: Record<string, MissionProgress> = {};

  for (const [id, entry] of Object.entries(stored)) {
    if (!MISSION_IDS.has(id) || !isRecord(entry) || typeof entry['period'] !== 'string') {
      continue;
    }

    missions[id] = { period: entry['period'], value: count(entry['value']), isClaimed: entry['isClaimed'] === true };
  }

  return missions;
}

function sanitizeInventory(value: unknown): Inventory {
  const stored = isRecord(value) ? value : {};
  const owned = unique([...STARTER_COSMETICS, ...stringList(stored['owned']).filter(isCosmeticId)]);
  const storedEquipped = isRecord(stored['equipped']) ? stored['equipped'] : {};
  const equipped = { ...DEFAULT_EQUIPPED };

  for (const slot of SLOTS) {
    const id = storedEquipped[slot];
    const cosmetic = typeof id === 'string' ? COSMETICS.find((candidate) => candidate.id === id) : undefined;

    if (cosmetic && cosmetic.slot === slot && owned.includes(cosmetic.id)) {
      equipped[slot] = cosmetic.id;
    }
  }

  return { owned, equipped };
}

function sanitizeSettings(value: unknown): AventuraSettings {
  const stored = isRecord(value) ? value : {};
  const quality = stored['quality'];
  const touch = stored['touchControls'];

  return {
    quality: typeof quality === 'string' && QUALITY_VALUES.has(quality) ? (quality as AventuraSettings['quality']) : DEFAULT_SETTINGS.quality,
    musicVolume: volume(stored['musicVolume'], DEFAULT_SETTINGS.musicVolume),
    effectsVolume: volume(stored['effectsVolume'], DEFAULT_SETTINGS.effectsVolume),
    touchControls: typeof touch === 'string' && TOUCH_VALUES.has(touch) ? (touch as AventuraSettings['touchControls']) : DEFAULT_SETTINGS.touchControls,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function volume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function unique<T>(list: readonly T[]): T[] {
  return [...new Set(list)];
}
