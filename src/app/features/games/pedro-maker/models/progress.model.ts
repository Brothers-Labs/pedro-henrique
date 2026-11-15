/**
 * Modelos do progresso do Pedro Maker.
 *
 * Tudo aqui só cresce: fase concluída não volta a ficar bloqueada, estrela
 * conquistada não é retirada e moeda ganha só sai quando o próprio Pedro
 * escolhe gastar no personagem.
 */

/** Melhor resultado já obtido em uma fase. */
export interface LevelRecord {
  readonly completed: boolean;
  readonly stars: number;
  /** Um por cristal da fase: verdadeiro se já foi encontrado em alguma partida. */
  readonly crystals: readonly boolean[];
  /** Menor tempo em milissegundos; `null` enquanto a fase não foi concluída. */
  readonly bestTimeMs: number | null;
  readonly bestCoins: number;
  readonly timesCompleted: number;
}

export type MakerAchievementId =
  | 'primeira-aventura'
  | 'cacador-de-tesouros'
  | 'explorador'
  | 'super-aventureiro'
  | 'cacador-de-chefoes'
  | 'velocista'
  | 'arquiteto'
  | 'segredo-revelado';

/** Contador que uma conquista observa. Evita um `if` por conquista. */
export type MakerAchievementMeasure =
  | 'levelsCompleted'
  | 'coinsCollected'
  | 'crystalsFound'
  | 'stars'
  | 'bossesDefeated'
  | 'fastCompletions'
  | 'customLevelsSaved'
  | 'secretsFound';

export interface MakerAchievement {
  readonly id: MakerAchievementId;
  readonly title: string;
  readonly description: string;
  readonly emoji: string;
  readonly measure: MakerAchievementMeasure;
  readonly goal: number;
}

export interface MakerAchievementProgress {
  readonly achievement: MakerAchievement;
  readonly current: number;
  readonly isUnlocked: boolean;
}

export interface MakerStats {
  readonly coinsCollected: number;
  readonly enemiesDefeated: number;
  readonly bossesDefeated: number;
  readonly fastCompletions: number;
  readonly customLevelsSaved: number;
}

/** Herói que a criança controla nas fases e no kart. */
export type HeroId =
  | 'pedro'
  | 'gui'
  | 'mario'
  | 'luigi'
  | 'wario'
  | 'giuseppe'
  | 'zeca'
  | 'tina'
  | 'bruno'
  | 'ana'
  | 'caio'
  | 'nina'
  | 'otto'
  | 'vava'
  | 'rafa'
  | 'duda'
  | 'estrela'
  | 'jade'
  | 'coral'
  | 'peach'
  | 'daisy';

/** Visual do Pedro no jogo. Cada campo é o id de uma opção do catálogo. */
export interface CharacterLook {
  readonly cap: string;
  readonly shirt: string;
  readonly backpack: string;
}

export interface DailyMissionState {
  /** Dia (`yyyy-MM-dd`) a que o contador se refere. */
  readonly day: string;
  readonly levelsCompleted: number;
  readonly rewardClaimed: boolean;
}

/** Estado completo guardado no aparelho. */
export interface MakerProgress {
  readonly version: number;
  readonly levels: Readonly<Record<string, LevelRecord>>;
  readonly secretsFound: readonly string[];
  readonly coins: number;
  readonly totalXp: number;
  readonly achievements: readonly MakerAchievementId[];
  readonly stats: MakerStats;
  readonly hero: HeroId;
  readonly look: CharacterLook;
  /** Opções de visual já compradas com moedas. */
  readonly ownedLookOptions: readonly string[];
  readonly mission: DailyMissionState;
  /** Última fase jogada, para o botão "Continuar". */
  readonly lastLevelId: string | null;
}

/** O que aconteceu dentro de uma partida, relatado pelo motor. */
export interface LevelRunResult {
  readonly timeMs: number;
  readonly coinsCollected: number;
  readonly coinsTotal: number;
  /** Um por cristal da fase, na ordem em que aparecem nela. */
  readonly crystalsFound: readonly boolean[];
  readonly enemiesDefeated: number;
  readonly bossDefeated: boolean;
}

/** Recompensa já calculada, pronta para a tela de vitória. */
export interface LevelReward {
  readonly stars: number;
  readonly isNewRecord: boolean;
  readonly xpGained: number;
  readonly coinsGained: number;
  readonly levelBefore: number;
  readonly levelAfter: number;
  readonly unlockedAchievements: readonly MakerAchievement[];
  readonly missionCompleted: boolean;
  readonly worldCompleted: boolean;
}

/** Nível do aventureiro, derivado do XP total. */
export interface AdventurerLevel {
  readonly level: number;
  readonly xpIntoLevel: number;
  readonly xpForLevel: number;
  readonly percentage: number;
}
