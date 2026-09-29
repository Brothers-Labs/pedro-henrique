import { computed, inject, Injectable, signal } from '@angular/core';

import { dayKey } from '../../../../core/pet/pet-progress';
import { GameProgressService } from '../../../../core/services/game-progress.service';
import { LOOK_OPTIONS, type LookOption } from '../config/character.config';
import { MAKER_ACHIEVEMENTS } from '../config/rules.config';
import { CAMPAIGN_LEVELS } from '../levels/campaign';
import type { CampaignLevel } from '../models/campaign.model';
import type {
  LevelRecord,
  LevelReward,
  LevelRunResult,
  MakerAchievement,
  MakerAchievementId,
  MakerProgress,
} from '../models/progress.model';
import {
  achievementsProgressOf,
  adventurerLevelFor,
  applyCustomLevelSaved,
  applyLevelResult,
  applySecretFound,
  createMakerProgress,
  equipLook,
  isLevelUnlocked,
  levelsCompleted,
  MAKER_PROGRESS_VERSION,
  missionForToday,
  totalCrystals,
  totalStars,
  type RunContext,
} from '../progress/maker-progression';

const STORAGE_KEY = `pedro-henrique:pedro-maker:v${MAKER_PROGRESS_VERSION}`;

const KNOWN_ACHIEVEMENTS = new Set<string>(MAKER_ACHIEVEMENTS.map((achievement) => achievement.id));
const KNOWN_LEVELS = new Set<string>(CAMPAIGN_LEVELS.map((level) => level.id));
const KNOWN_LOOK_OPTIONS = new Set<string>(LOOK_OPTIONS.map((option) => option.id));

/** Tempo que o aviso "Progresso salvo" fica visível. */
const SAVED_NOTICE_MS = 2200;

/**
 * Estado do Pedro Maker: fases, estrelas, moedas, XP, conquistas e visual.
 *
 * Toda regra vem de `progress/maker-progression`; aqui ficam só o estado, a
 * gravação automática no aparelho e a ponte com a jornada de jogos do site —
 * cada fase vencida conta como um desafio vencido lá, e é por esse caminho
 * que o mascote do site ganha XP e comemora junto.
 */
@Injectable({ providedIn: 'root' })
export class MakerProgressService {
  private readonly siteProgress = inject(GameProgressService);
  private readonly state = signal<MakerProgress>(loadProgress());
  private readonly savedNotice = signal(false);
  private savedNoticeTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Conquistas liberadas fora da tela de vitória, esperando o aviso na tela. */
  private readonly pendingAchievements = signal<readonly MakerAchievement[]>([]);

  readonly progress = this.state.asReadonly();
  readonly adventurer = computed(() => adventurerLevelFor(this.state().totalXp));
  readonly coins = computed(() => this.state().coins);
  readonly stars = computed(() => totalStars(this.state()));
  readonly crystals = computed(() => totalCrystals(this.state()));
  readonly levelsCompleted = computed(() => levelsCompleted(this.state()));
  readonly achievements = computed(() => achievementsProgressOf(this.state()));
  readonly look = computed(() => this.state().look);
  readonly mission = computed(() => missionForToday(this.state(), today()));
  readonly pendingAchievement = computed<MakerAchievement | null>(() => this.pendingAchievements()[0] ?? null);

  /** Verdadeiro por alguns instantes depois de cada gravação. */
  readonly isSavedNoticeVisible = this.savedNotice.asReadonly();

  /** Fase sugerida pelo botão "Continuar": a primeira aberta e ainda não vencida. */
  readonly nextLevel = computed<CampaignLevel>(() => {
    const progress = this.state();
    const pending = CAMPAIGN_LEVELS.find(
      (level) => level.kind !== 'secret' && isLevelUnlocked(progress, level) && !progress.levels[level.id]?.completed,
    );

    return pending ?? CAMPAIGN_LEVELS[0];
  });

  isUnlocked(level: CampaignLevel): boolean {
    return isLevelUnlocked(this.state(), level);
  }

  recordOf(levelId: string): LevelRecord | null {
    return this.state().levels[levelId] ?? null;
  }

  /**
   * Registra uma fase vencida.
   *
   * Grava no aparelho antes de devolver a recompensa: se a aba fechar no meio
   * da comemoração, nada do que foi conquistado se perde.
   */
  completeLevel(context: RunContext, result: LevelRunResult): LevelReward {
    const { progress, reward } = applyLevelResult(this.state(), context, result, today());

    this.commit(progress);
    this.siteProgress.registerChallenge('pedro-maker', true);

    return reward;
  }

  /** Porta secreta encontrada. Devolve verdadeiro só na primeira vez. */
  registerSecret(secretLevelId: string): boolean {
    const before = this.state();
    const { progress, unlockedAchievements } = applySecretFound(before, secretLevelId);

    if (progress === before) {
      return false;
    }

    this.commit(progress);
    this.queueAchievements(unlockedAchievements);

    return true;
  }

  registerCustomLevelSaved(): void {
    const { progress, unlockedAchievements } = applyCustomLevelSaved(this.state());

    this.commit(progress);
    this.queueAchievements(unlockedAchievements);
  }

  /** Compra (quando preciso) e veste uma opção. Devolve falso se não foi possível. */
  equip(option: LookOption): boolean {
    const before = this.state();
    const after = equipLook(before, option);

    if (after === before) {
      return false;
    }

    this.commit(after);

    return true;
  }

  resetAll(): void {
    this.commit(createMakerProgress(today()));
  }

  dismissAchievement(): void {
    this.pendingAchievements.update((queue) => queue.slice(1));
  }

  private queueAchievements(achievements: readonly MakerAchievement[]): void {
    if (achievements.length > 0) {
      this.pendingAchievements.update((queue) => [...queue, ...achievements]);
    }
  }

  private commit(progress: MakerProgress): void {
    this.state.set(progress);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      this.flashSavedNotice();
    } catch (error) {
      // Modo privado ou armazenamento cheio: o jogo segue valendo na sessão.
      console.warn('Pedro Maker: não foi possível gravar o progresso neste aparelho.', error);
    }
  }

  private flashSavedNotice(): void {
    if (this.savedNoticeTimeout !== null) {
      clearTimeout(this.savedNoticeTimeout);
    }

    this.savedNotice.set(true);
    this.savedNoticeTimeout = setTimeout(() => {
      this.savedNotice.set(false);
      this.savedNoticeTimeout = null;
    }, SAVED_NOTICE_MS);
  }
}

function today(): string {
  return dayKey(new Date());
}

function loadProgress(): MakerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? reconcile(JSON.parse(raw) as unknown) : createMakerProgress(today());
  } catch (error) {
    // Save corrompido ou armazenamento bloqueado: a aventura recomeça, sem quebrar.
    console.warn('Pedro Maker: o progresso salvo não pôde ser lido e foi recomeçado.', error);

    return createMakerProgress(today());
  }
}

/**
 * Aceita o que foi guardado e descarta só o que não faz sentido.
 *
 * Um campo estranho volta ao padrão; o resto do progresso continua de pé.
 */
export function reconcile(value: unknown): MakerProgress {
  const fallback = createMakerProgress(today());

  if (typeof value !== 'object' || value === null) {
    return fallback;
  }

  const stored = value as Partial<MakerProgress>;
  const stats = (stored.stats ?? {}) as Partial<MakerProgress['stats']>;
  const look = (stored.look ?? {}) as Partial<MakerProgress['look']>;
  const mission = (stored.mission ?? {}) as Partial<MakerProgress['mission']>;

  return {
    ...fallback,
    levels: sanitizeLevels(stored.levels),
    secretsFound: stringList(stored.secretsFound).filter((id) => KNOWN_LEVELS.has(id)),
    coins: count(stored.coins),
    totalXp: count(stored.totalXp),
    achievements: stringList(stored.achievements).filter((id): id is MakerAchievementId =>
      KNOWN_ACHIEVEMENTS.has(id),
    ),
    stats: {
      coinsCollected: count(stats.coinsCollected),
      enemiesDefeated: count(stats.enemiesDefeated),
      bossesDefeated: count(stats.bossesDefeated),
      fastCompletions: count(stats.fastCompletions),
      customLevelsSaved: count(stats.customLevelsSaved),
    },
    look: {
      cap: knownLook(look.cap, fallback.look.cap),
      shirt: knownLook(look.shirt, fallback.look.shirt),
      backpack: knownLook(look.backpack, fallback.look.backpack),
    },
    ownedLookOptions: stringList(stored.ownedLookOptions).filter((id) => KNOWN_LOOK_OPTIONS.has(id)),
    mission: {
      day: typeof mission.day === 'string' ? mission.day : fallback.mission.day,
      levelsCompleted: count(mission.levelsCompleted),
      rewardClaimed: mission.rewardClaimed === true,
    },
    lastLevelId:
      typeof stored.lastLevelId === 'string' && KNOWN_LEVELS.has(stored.lastLevelId) ? stored.lastLevelId : null,
  };
}

function sanitizeLevels(value: unknown): Readonly<Record<string, LevelRecord>> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([id]) => KNOWN_LEVELS.has(id))
    .map(([id, record]) => [id, sanitizeRecord(record)] as const)
    .filter((entry): entry is readonly [string, LevelRecord] => entry[1] !== null);

  return Object.fromEntries(entries);
}

function sanitizeRecord(value: unknown): LevelRecord | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Partial<LevelRecord>;

  return {
    completed: record.completed === true,
    stars: Math.min(3, count(record.stars)),
    crystals: Array.isArray(record.crystals) ? record.crystals.map((found) => found === true) : [],
    bestTimeMs: typeof record.bestTimeMs === 'number' && record.bestTimeMs > 0 ? record.bestTimeMs : null,
    bestCoins: count(record.bestCoins),
    timesCompleted: count(record.timesCompleted),
  };
}

function knownLook(value: unknown, fallback: string): string {
  return typeof value === 'string' && KNOWN_LOOK_OPTIONS.has(value) ? value : fallback;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}
