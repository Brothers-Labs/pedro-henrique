import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { cosmeticById } from '../config/cosmetics.config';
import { MISSIONS } from '../config/missions.config';
import { REGIONS } from '../config/regions.config';
import { SEASON } from '../config/season.config';
import type { AventuraSettings, AventuraState, RunResult } from '../models/aventura-state.model';
import type { LevelDefinition, PlayerLevelProgress, RegionDefinition, RegionStatus } from '../models/campaign.model';
import type { Cosmetic, CosmeticSlot, MissionStatus, PassId, PremiumPassId, RewardStatus } from '../models/economy.model';
import {
  applyPurchasedPasses,
  applyRunResult,
  buyCosmetic,
  buyLevels,
  buyPass,
  claimAllSeasonRewards,
  claimMission,
  claimSeasonReward,
  createInitialState,
  equip,
  levelsPrice,
  restartSeason,
  type RunSummary,
  seasonProgressOf,
  updateSettings,
} from '../rules/aventura-game';
import { timeUntil } from '../rules/calendar';
import {
  isLevelUnlocked,
  maxRegionStars,
  regionStars,
  regionStatus,
  suggestedLevel,
  unlockHint,
} from '../rules/campaign';
import { missionStatus } from '../rules/missions';
import {
  canRestartSeason,
  claimableRewards,
  levelInfo,
  passPrice,
  passPriceInCents,
  rewardStatus,
  seasonPhase,
} from '../rules/season-pass';
import { AVENTURA_REPOSITORY } from './aventura-repository';

/** O relógio das telas anda de minuto em minuto: é a menor unidade das contagens regressivas. */
const CLOCK_TICK_MS = 60_000;

export interface LevelView {
  readonly level: LevelDefinition;
  readonly isUnlocked: boolean;
  readonly progress: PlayerLevelProgress | null;
}

export interface RegionView {
  readonly region: RegionDefinition;
  readonly status: RegionStatus;
  readonly stars: number;
  readonly maxStars: number;
  readonly hint: string;
  readonly levels: readonly LevelView[];
}

/**
 * Estado do Pedro Aventura para as telas.
 *
 * Um signal com o jogo inteiro, gravado no aparelho a cada mudança. Toda regra
 * vem de `rules/`; aqui ficam só o relógio, a gravação e o "comando → novo
 * estado". Nenhum serviço do resto do site é lido ou alterado: o jogo é
 * separado de propósito.
 */
@Injectable({ providedIn: 'root' })
export class AventuraStore {
  private readonly repository = inject(AVENTURA_REPOSITORY);
  private readonly state = signal<AventuraState>(this.repository.load(new Date()));
  private readonly clock = signal(new Date());
  private readonly persistent = signal(true);

  readonly snapshot = this.state.asReadonly();
  readonly now = this.clock.asReadonly();
  /** Falso quando o aparelho recusou a última gravação: a tela avisa que o progresso vale só nesta sessão. */
  readonly isPersistent = this.persistent.asReadonly();

  readonly season = SEASON;
  readonly seasonPhase = computed(() => seasonPhase(SEASON, this.clock()));
  readonly seasonTimeLeft = computed(() => timeUntil(SEASON.endsAt, this.clock()));
  readonly seasonProgress = computed(() => seasonProgressOf(this.state()));
  readonly seasonLevel = computed(() => levelInfo(this.seasonProgress().xp, SEASON.tiers.length));
  readonly canRestartSeason = computed(() => canRestartSeason(this.seasonProgress(), SEASON, this.clock()));
  readonly claimableRewardCount = computed(() => claimableRewards(this.seasonProgress(), SEASON).length);

  readonly coins = computed(() => this.state().wallet.coins);
  readonly diamonds = computed(() => this.state().wallet.diamonds);
  readonly settings = computed(() => this.state().settings);
  readonly inventory = computed(() => this.state().inventory);

  readonly equipped = computed<Readonly<Record<CosmeticSlot, Cosmetic>>>(() => {
    const { equipped } = this.state().inventory;

    return { outfit: cosmeticById(equipped.outfit), dog: cosmeticById(equipped.dog), vehicle: cosmeticById(equipped.vehicle) };
  });

  readonly missions = computed<readonly MissionStatus[]>(() =>
    MISSIONS.map((mission) => missionStatus(this.state().missions, mission, SEASON, this.clock())),
  );

  readonly claimableMissionCount = computed(() => this.missions().filter((entry) => entry.state === 'completed').length);

  readonly regions = computed<readonly RegionView[]>(() => {
    const { levels } = this.state();
    const now = this.clock();

    return REGIONS.map((region) => ({
      region,
      status: regionStatus(region, levels, now),
      stars: regionStars(levels, region),
      maxStars: maxRegionStars(region),
      hint: unlockHint(region),
      levels: region.levels.map((level) => ({
        level,
        isUnlocked: isLevelUnlocked(level, levels, now),
        progress: levels[level.id] ?? null,
      })),
    }));
  });

  readonly suggestedLevel = computed(() => suggestedLevel(this.state().levels, this.clock()));

  constructor() {
    const destroyRef = inject(DestroyRef);

    destroyRef.onDestroy(this.repository.watch((state) => this.state.set(state)));

    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.clock.set(new Date()), CLOCK_TICK_MS);

      destroyRef.onDestroy(() => clearInterval(timer));
    }
  }

  isLevelUnlocked(level: LevelDefinition): boolean {
    return isLevelUnlocked(level, this.state().levels, this.clock());
  }

  levelProgress(levelId: string): PlayerLevelProgress | null {
    return this.state().levels[levelId] ?? null;
  }

  rewardStatus(level: number, pass: PassId): RewardStatus {
    return rewardStatus(this.seasonProgress(), SEASON, level, pass);
  }

  hasPass(pass: PremiumPassId): boolean {
    return this.seasonProgress().passes.includes(pass);
  }

  passPrice(pass: PremiumPassId): number {
    return passPrice(this.seasonProgress(), pass);
  }

  passPriceInCents(pass: PremiumPassId): number {
    return passPriceInCents(this.seasonProgress(), pass);
  }

  levelsPrice(levels: number): number {
    return levelsPrice(this.state(), levels);
  }

  owns(cosmeticId: string): boolean {
    return this.state().inventory.owned.includes(cosmeticId);
  }

  /** Aplica o resultado de uma partida. Devolve `null` quando ele já foi aplicado ou não confere com a pista. */
  submitRun(result: RunResult): RunSummary | null {
    const outcome = applyRunResult(this.state(), result, this.tick());

    if (!outcome) {
      return null;
    }

    this.commit(outcome.state);

    return outcome.summary;
  }

  claimMission(missionId: string): boolean {
    return this.attempt((state, now) => claimMission(state, missionId, now));
  }

  claimReward(level: number, pass: PassId): boolean {
    return this.attempt((state, now) => claimSeasonReward(state, level, pass, now));
  }

  claimAllRewards(): boolean {
    return this.attempt((state, now) => {
      const after = claimAllSeasonRewards(state, now);

      return after === state ? null : after;
    });
  }

  buyPass(pass: PremiumPassId): boolean {
    return this.attempt((state, now) => buyPass(state, pass, now));
  }

  buyLevels(levels: number): boolean {
    return this.attempt((state, now) => buyLevels(state, levels, now));
  }

  restartSeason(): boolean {
    return this.attempt((state, now) => restartSeason(state, now));
  }

  applyPurchasedPasses(purchased: readonly PremiumPassId[]): boolean {
    return this.attempt((state) => applyPurchasedPasses(state, purchased));
  }

  buyCosmetic(cosmeticId: string): boolean {
    return this.attempt((state, now) => buyCosmetic(state, cosmeticId, now));
  }

  equip(cosmeticId: string): boolean {
    return this.attempt((state) => equip(state, cosmeticId));
  }

  updateSettings(changes: Partial<AventuraSettings>): void {
    this.commit(updateSettings(this.state(), changes));
  }

  /** Apaga todo o progresso do Pedro Aventura neste aparelho. A tela confirma antes. */
  resetProgress(): void {
    this.commit(createInitialState(this.tick()));
  }

  private attempt(operation: (state: AventuraState, now: Date) => AventuraState | null): boolean {
    const after = operation(this.state(), this.tick());

    if (!after) {
      return false;
    }

    this.commit(after);

    return true;
  }

  private tick(): Date {
    const now = new Date();

    this.clock.set(now);

    return now;
  }

  private commit(state: AventuraState): void {
    this.state.set(state);
    this.persistent.set(this.repository.save(state));
  }
}
