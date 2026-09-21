import { computed, inject, Injectable, signal } from '@angular/core';

import { ACHIEVEMENTS, GAME_IDS, gameDefinition } from '../data/game-progress.data';
import { GameEventBus } from '../events/game-event-bus';
import {
  applyChallenge,
  createGameProgress,
  createPlayerProgress,
  levelPercentage,
  nextGoalFor,
  PROGRESS_SCHEMA_VERSION,
  summarize,
} from '../games/progression';
import type {
  Achievement,
  AchievementId,
  ChallengeOutcome,
  GameId,
  GameProgress,
  PlayerProgress,
} from '../models/game-progress.model';

const STORAGE_KEY = `pedro-henrique:games-progress:v${PROGRESS_SCHEMA_VERSION}`;

/** Chave do jogo de inglês anterior à jornada unificada, usada na migração. */
const LEGACY_ENGLISH_KEY = 'pedro-henrique:english-progress';

/**
 * Estado único da jornada de jogos.
 *
 * Nenhum jogo guarda pontuação própria: todos chamam `registerChallenge` e
 * recebem de volta o que aconteceu. É o que garante que o nível geral, as
 * conquistas e o painel da página falem sempre do mesmo número.
 *
 * O progresso vive só no aparelho de quem joga. Não há conta, servidor nem
 * comparação com outras crianças — a única comparação é com o próprio ontem.
 *
 * Cada desafio registrado também é anunciado no `GameEventBus`. O serviço não
 * sabe quem escuta — hoje é o mascote, amanhã pode ser outra coisa — e é isso
 * que permite recompensar a criança fora dos jogos sem tocar em nenhum deles.
 */
@Injectable({ providedIn: 'root' })
export class GameProgressService {
  private readonly state = signal<PlayerProgress>(loadProgress());
  private readonly events = inject(GameEventBus);

  /**
   * Fila de conquistas ainda não comemoradas.
   *
   * É uma fila, e não um valor solto, porque duas conquistas podem cair no
   * mesmo desafio — e dois avisos ao mesmo tempo na tela não se leem.
   */
  private readonly pending = signal<readonly Achievement[]>([]);

  readonly player = this.state.asReadonly();
  readonly summary = computed(() => summarize(this.state()));
  readonly nextGoal = computed(() => nextGoalFor(this.state()));
  readonly unlockedAchievements = computed(() => this.state().unlockedAchievements);
  readonly pendingAchievement = computed<Achievement | null>(() => this.pending()[0] ?? null);

  /** Progresso de um jogo. Sempre existe: um jogo novo começa no nível 1. */
  progressOf(gameId: GameId): GameProgress {
    return this.state().games[gameId];
  }

  /** Percentual do nível atual, para a barra de progresso. */
  levelPercentageOf(gameId: GameId): number {
    return levelPercentage(this.progressOf(gameId), gameDefinition(gameId));
  }

  /**
   * Registra um desafio concluído.
   *
   * Uma chamada equivale a um desafio: a tela é responsável por não chamar duas
   * vezes para a mesma pergunta, e todas elas travam a resposta depois do
   * primeiro toque.
   */
  registerChallenge(gameId: GameId, wasCorrect: boolean): ChallengeOutcome {
    const { player, outcome } = applyChallenge(this.state(), gameId, wasCorrect);

    this.state.set(player);
    this.persist();

    if (outcome.unlockedAchievements.length > 0) {
      this.pending.update((queue) => [...queue, ...outcome.unlockedAchievements]);
    }

    this.announce(outcome);

    return outcome;
  }

  /** Publica o que aconteceu, já com o estado novo gravado no aparelho. */
  private announce(outcome: ChallengeOutcome): void {
    this.events.emit({
      type: 'CHALLENGE_COMPLETED',
      gameId: outcome.gameId,
      wasCorrect: outcome.wasCorrect,
      streak: outcome.streak,
    });

    if (outcome.didLevelUp) {
      this.events.emit({
        type: 'LEVEL_COMPLETED',
        gameId: outcome.gameId,
        level: outcome.level,
        wasPerfect: outcome.wasPerfectLevel,
      });
    }

    for (const achievement of outcome.unlockedAchievements) {
      this.events.emit({ type: 'ACHIEVEMENT_UNLOCKED', achievementId: achievement.id });
    }
  }

  /** Marca a conquista do topo da fila como já comemorada. */
  dismissAchievement(): void {
    this.pending.update((queue) => queue.slice(1));
  }

  /** Zera um jogo mantendo o restante da jornada intacto. */
  resetGame(gameId: GameId): void {
    this.state.update((player) => ({
      ...player,
      games: { ...player.games, [gameId]: createGameProgress(gameId) },
    }));

    this.persist();
  }

  resetAll(): void {
    this.state.set(createPlayerProgress());
    this.pending.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch {
      // Navegador em modo privado: a jornada continua valendo na sessão atual.
    }
  }
}

function loadProgress(): PlayerProgress {
  const stored = readStored();

  return stored ?? migrateLegacyProgress();
}

function readStored(): PlayerProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? reconcile(JSON.parse(raw) as unknown) : null;
  } catch {
    // Dado corrompido ou storage bloqueado: a jornada recomeça, sem quebrar.
    return null;
  }
}

/**
 * Aceita o que foi guardado e completa o que faltar.
 *
 * Um jogo novo no catálogo entra com progresso zerado em vez de derrubar tudo
 * o que já estava salvo.
 */
function reconcile(value: unknown): PlayerProgress | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Partial<PlayerProgress>;
  const storedGames = (candidate.games ?? {}) as Partial<Record<GameId, unknown>>;

  const games = Object.fromEntries(
    GAME_IDS.map((id) => [id, sanitizeGame(id, storedGames[id])]),
  ) as Readonly<Record<GameId, GameProgress>>;

  return {
    version: PROGRESS_SCHEMA_VERSION,
    games,
    unlockedAchievements: Array.isArray(candidate.unlockedAchievements)
      ? candidate.unlockedAchievements.filter(isKnownAchievement)
      : [],
  };
}

function sanitizeGame(gameId: GameId, value: unknown): GameProgress {
  const fallback = createGameProgress(gameId);

  if (typeof value !== 'object' || value === null) {
    return fallback;
  }

  const stored = value as Partial<GameProgress>;

  return {
    ...fallback,
    level: count(stored.level, fallback.level, 1),
    completedInLevel: count(stored.completedInLevel, 0),
    correctInLevel: count(stored.correctInLevel, 0),
    score: count(stored.score, 0),
    correctAnswers: count(stored.correctAnswers, 0),
    wrongAnswers: count(stored.wrongAnswers, 0),
    totalPlayed: count(stored.totalPlayed, 0),
    currentStreak: count(stored.currentStreak, 0),
    bestStreak: count(stored.bestStreak, 0),
    perfectLevels: count(stored.perfectLevels, 0),
    bestLevelScore: count(stored.bestLevelScore, 0),
    starsByLevel: Array.isArray(stored.starsByLevel)
      ? stored.starsByLevel.filter((stars): stars is number => isCount(stars))
      : [],
  };
}

/**
 * Traz o XP do jogo de inglês antigo para dentro da jornada nova.
 *
 * O formato anterior guardava XP, melhor sequência e as fases já dominadas.
 * Nada disso se perde: o XP vira pontuação e as fases dominadas viram níveis.
 * A chave antiga é preservada, para que um retrocesso ainda a encontre.
 */
function migrateLegacyProgress(): PlayerProgress {
  const base = createPlayerProgress();

  try {
    const raw = localStorage.getItem(LEGACY_ENGLISH_KEY);
    if (!raw) {
      return base;
    }

    const legacy = JSON.parse(raw) as { totalXp?: unknown; bestStreak?: unknown; masteredIds?: unknown };
    const totalXp = count(legacy.totalXp, 0);
    const mastered = Array.isArray(legacy.masteredIds) ? legacy.masteredIds.length : 0;

    if (totalXp === 0 && mastered === 0) {
      return base;
    }

    const perLevel = gameDefinition('ingles').challengesPerLevel;

    return {
      ...base,
      games: {
        ...base.games,
        ingles: {
          ...base.games.ingles,
          level: Math.floor(mastered / perLevel) + 1,
          completedInLevel: mastered % perLevel,
          score: totalXp,
          correctAnswers: mastered,
          totalPlayed: mastered,
          bestStreak: count(legacy.bestStreak, 0),
          bestLevelScore: Math.min(perLevel, mastered),
        },
      },
    };
  } catch {
    return base;
  }
}

/** Uma conquista removida do catálogo some do save em vez de quebrar a leitura. */
function isKnownAchievement(value: unknown): value is AchievementId {
  return ACHIEVEMENTS.some((achievement) => achievement.id === value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function count(value: unknown, fallback: number, minimum = 0): number {
  return isCount(value) ? Math.max(minimum, Math.trunc(value)) : fallback;
}
