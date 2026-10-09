import { curiosityById } from '../config/adventure-curiosities.config';
import { ADVENTURE_RULES } from '../config/adventure-rules.config';
import type {
  AdventureLevel,
  AdventureProgress,
  AdventureWorld,
  LevelCompletion,
  LevelRecord,
  LevelRunResult,
  LevelStatus,
  LevelView,
  WorldStatus,
  WorldView,
} from '../models/adventure.model';

/**
 * Regras da Aventura, sem Angular e sem tela.
 *
 * Tudo o que a jornada decide — fase liberada, estrelas, prêmio devido — nasce
 * aqui, a partir do catálogo de mundos e do progresso guardado. As telas só
 * desenham o que estas funções devolvem.
 */

export function createAdventureProgress(): AdventureProgress {
  return {
    version: ADVENTURE_RULES.schemaVersion,
    levels: {},
    claimedRewards: [],
    curiosities: [],
  };
}

/** Terminar vale uma estrela; capricho vale as outras duas. */
export function starsFor(correct: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const { secondStarRatio, thirdStarRatio } = ADVENTURE_RULES.stars;
  const ratio = Math.max(0, correct) / total;

  return 1 + (ratio >= secondStarRatio ? 1 : 0) + (ratio >= thirdStarRatio ? 1 : 0);
}

export function isWorldCompleted(progress: AdventureProgress, world: AdventureWorld): boolean {
  return world.levels.length > 0 && world.levels.every((level) => level.id in progress.levels);
}

export function isWorldUnlocked(
  progress: AdventureProgress,
  world: AdventureWorld,
  worlds: readonly AdventureWorld[],
): boolean {
  const condition = world.unlock;

  if (condition.kind === 'start') {
    return true;
  }

  const required = worlds.find((candidate) => candidate.id === condition.worldId);

  return required !== undefined && isWorldCompleted(progress, required);
}

/**
 * Lê o mapa inteiro de uma vez.
 *
 * O mundo atual é o primeiro em andamento; se nenhum estiver, é o último já
 * concluído. É nele que o mascote fica, e só nele existe fase `current`.
 */
export function buildWorldViews(
  progress: AdventureProgress,
  worlds: readonly AdventureWorld[],
): readonly WorldView[] {
  const statuses = worlds.map((world) => worldStatusOf(progress, world, worlds));
  const currentIndex = currentWorldIndex(statuses);

  return worlds.map((world, index) =>
    buildWorldView(progress, world, statuses[index], index === currentIndex),
  );
}

/** Mundo em que o mascote está; `null` só se nenhum mundo tiver fases. */
export function currentWorldOf(views: readonly WorldView[]): WorldView | null {
  const index = currentWorldIndex(views.map((view) => view.status));

  return index >= 0 ? views[index] : null;
}

export function levelViewOf(views: readonly WorldView[], worldId: string, levelId: string): LevelView | null {
  const world = views.find((view) => view.world.id === worldId);

  return world?.levels.find((view) => view.level.id === levelId) ?? null;
}

export function isPlayable(status: LevelStatus): boolean {
  return status !== 'locked';
}

/**
 * Registra uma partida terminada e calcula os prêmios devidos.
 *
 * Idempotente por construção: cada prêmio único tem um id em
 * `claimedRewards`, e as estrelas pagam só a diferença para o melhor
 * resultado anterior. Aplicar a mesma partida duas vezes — duplo clique,
 * página recarregada — não paga nada da segunda vez além da tentativa.
 */
export function settleLevel(
  progress: AdventureProgress,
  worlds: readonly AdventureWorld[],
  worldId: string,
  levelId: string,
  result: LevelRunResult,
  now: Date,
): LevelCompletion {
  const world = worlds.find((candidate) => candidate.id === worldId);
  const level = world?.levels.find((candidate) => candidate.id === levelId);

  if (!world || !level) {
    throw new Error(`Fase "${levelId}" não existe no mundo "${worldId}".`);
  }

  const total = Math.max(0, Math.trunc(result.total));
  const correct = Math.min(total, Math.max(0, Math.trunc(result.correct)));
  const stars = starsFor(correct, total);
  const moment = now.toISOString();

  const previous = progress.levels[level.id] ?? null;
  const previousBestStars = previous?.bestStars ?? 0;
  const record: LevelRecord = {
    attempts: (previous?.attempts ?? 0) + 1,
    bestScore: Math.max(previous?.bestScore ?? 0, correct),
    bestStars: Math.max(previousBestStars, stars),
    completedAt: previous?.completedAt ?? moment,
  };

  const wasWorldCompleted = isWorldCompleted(progress, world);
  const unlockedBefore = new Set(worlds.filter((candidate) => isWorldUnlocked(progress, candidate, worlds)));

  const claims = new Set(progress.claimedRewards);
  const claim = (id: string): boolean => {
    if (claims.has(id)) {
      return false;
    }

    claims.add(id);
    return true;
  };

  const { rewards } = ADVENTURE_RULES;
  const newStars = Math.max(0, stars - previousBestStars);
  let bonusPoints = newStars * rewards.perNewStar.points;
  let bonusPetXp = newStars * rewards.perNewStar.petXp;

  const isFirstCompletion = claim(`first:${level.id}`);

  if (isFirstCompletion) {
    bonusPoints += rewards.firstCompletion.points;
    bonusPetXp += rewards.firstCompletion.petXp;
  }

  const reachedCheckpoint = level.isCheckpoint === true && claim(`checkpoint:${level.id}`);

  if (reachedCheckpoint) {
    bonusPoints += rewards.checkpoint.points;
    bonusPetXp += rewards.checkpoint.petXp;
  }

  const openedChest = level.chest && claim(`chest:${level.id}`) ? level.chest : null;

  if (openedChest) {
    bonusPoints += openedChest.bonusPoints;
    bonusPetXp += openedChest.bonusPetXp;
  }

  if (level.guardian && claim(`guardian:${level.id}`)) {
    bonusPoints += rewards.guardian.points;
    bonusPetXp += rewards.guardian.petXp;
  }

  const unlockedCuriosity = openedChest?.curiosityId ? curiosityById(openedChest.curiosityId) : null;
  const curiosities =
    unlockedCuriosity && !progress.curiosities.some((entry) => entry.id === unlockedCuriosity.id)
      ? [...progress.curiosities, { id: unlockedCuriosity.id, unlockedAt: moment }]
      : progress.curiosities;

  const settled: AdventureProgress = {
    ...progress,
    levels: { ...progress.levels, [level.id]: record },
    claimedRewards: [...claims],
    curiosities,
  };

  const completedWorld = !wasWorldCompleted && isWorldCompleted(settled, world) ? world : null;
  const unlockedWorld =
    worlds.find((candidate) => !unlockedBefore.has(candidate) && isWorldUnlocked(settled, candidate, worlds)) ?? null;

  return {
    progress: settled,
    stars,
    previousBestStars,
    isFirstCompletion,
    bonusPoints,
    bonusPetXp,
    reachedCheckpoint,
    openedChest,
    unlockedCuriosity,
    completedWorld,
    unlockedWorld,
  };
}

/** Próxima fase da trilha, para o botão "Próxima fase"; `null` no fim do mundo. */
export function nextLevelOf(world: AdventureWorld, levelId: string): AdventureLevel | null {
  const index = world.levels.findIndex((level) => level.id === levelId);

  return index >= 0 ? (world.levels[index + 1] ?? null) : null;
}

function worldStatusOf(
  progress: AdventureProgress,
  world: AdventureWorld,
  worlds: readonly AdventureWorld[],
): WorldStatus {
  if (!isWorldUnlocked(progress, world, worlds)) {
    return 'locked';
  }

  if (world.levels.length === 0) {
    return 'coming-soon';
  }

  return isWorldCompleted(progress, world) ? 'completed' : 'in-progress';
}

function currentWorldIndex(statuses: readonly WorldStatus[]): number {
  const inProgress = statuses.indexOf('in-progress');

  return inProgress >= 0 ? inProgress : statuses.lastIndexOf('completed');
}

function buildWorldView(
  progress: AdventureProgress,
  world: AdventureWorld,
  status: WorldStatus,
  isCurrentWorld: boolean,
): WorldView {
  const isOpen = status === 'in-progress' || status === 'completed';
  const frontier = world.levels.findIndex((level) => !(level.id in progress.levels));

  const levels = world.levels.map((level, index): LevelView => {
    const record = progress.levels[level.id] ?? null;

    return { level, order: index + 1, record, status: levelStatusOf(record, index, frontier, isOpen, isCurrentWorld) };
  });

  const companionIndex = frontier >= 0 ? frontier : levels.length - 1;

  return {
    world,
    status,
    levels,
    completedLevels: levels.filter((view) => view.record !== null).length,
    stars: levels.reduce((total, view) => total + (view.record?.bestStars ?? 0), 0),
    maxStars: levels.length * ADVENTURE_RULES.stars.max,
    companionLevel: levels[companionIndex] ?? null,
  };
}

function levelStatusOf(
  record: LevelRecord | null,
  index: number,
  frontier: number,
  isWorldOpen: boolean,
  isCurrentWorld: boolean,
): LevelStatus {
  if (record) {
    return record.bestStars >= ADVENTURE_RULES.stars.max ? 'perfect' : 'completed';
  }

  if (!isWorldOpen || index !== frontier) {
    return 'locked';
  }

  return isCurrentWorld ? 'current' : 'available';
}
