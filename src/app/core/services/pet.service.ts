import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import {
  PET_ACCESSORIES,
  PET_ACHIEVEMENTS,
  PET_CONFIG,
  PET_TYPE_IDS,
  PET_XP,
  petType,
} from '../data/pet.data';
import { GameEventBus } from '../events/game-event-bus';
import type { GameEvent } from '../models/game-event.model';
import type {
  Pet,
  PetAccessoryId,
  PetAchievementId,
  PetCelebration,
  PetCollection,
  PetEvent,
  PetInteractionId,
  PetOutcome,
  PetTypeId,
  PetXpGrant,
  PetXpSource,
} from '../models/pet.model';
import {
  achievementsProgressOf,
  addXp,
  applyInteraction,
  createPet,
  dayKey,
  equipAccessory,
  evolutionPreview,
  levelPercentage,
  PET_SCHEMA_VERSION,
  renamePet,
  stageFor,
  withActivity,
  xpForLevel,
  xpToNextLevel,
} from '../pet/pet-progress';

const STORAGE_KEY = `pedro-henrique:pet:v${PET_SCHEMA_VERSION}`;

/** Ids do catálogo, para descartar o que um save antigo trouxer a mais. */
const KNOWN_ACHIEVEMENTS = new Set<string>(
  PET_ACHIEVEMENTS.map((achievement) => achievement.id),
);

const KNOWN_ACCESSORIES = new Set<string>(PET_ACCESSORIES.map((accessory) => accessory.id));

/**
 * Estado do mascote.
 *
 * Guarda a coleção inteira, ainda que hoje só um companheiro seja adotado: a
 * porta para desbloquear outros no futuro já está aberta, sem migração.
 *
 * Não calcula nada: toda regra vem de `core/pet/pet-progress`. Aqui ficam
 * apenas o estado, a persistência no aparelho e a tradução dos eventos dos
 * jogos em XP — de modo que nenhum jogo precise conhecer o mascote.
 */
@Injectable({ providedIn: 'root' })
export class PetService {
  private readonly state = signal<PetCollection>(loadCollection());

  /**
   * Fila de comemorações ainda não mostradas.
   *
   * É fila, e não valor solto, porque um único desafio pode subir o nível e
   * fechar uma conquista ao mesmo tempo — e dois avisos sobrepostos não se
   * leem. A tela consome um de cada vez.
   */
  private readonly celebrations = signal<readonly PetCelebration[]>([]);

  private readonly lastGain = signal<PetXpGrant | null>(null);

  readonly collection = this.state.asReadonly();

  /** Mascote ativo, ou `null` enquanto a criança ainda não escolheu. */
  readonly pet = computed<Pet | null>(() => {
    const { activeType, pets } = this.state();

    return activeType ? (pets[activeType] ?? null) : null;
  });

  readonly hasPet = computed(() => this.pet() !== null);

  /** Ficha do tipo ativo, para nome, cor e personalidade. */
  readonly type = computed(() => {
    const pet = this.pet();

    return pet ? petType(pet.type) : null;
  });

  readonly stage = computed(() => {
    const pet = this.pet();

    return pet ? stageFor(pet.level) : null;
  });

  readonly levelPercentage = computed(() => {
    const pet = this.pet();

    return pet ? levelPercentage(pet) : 0;
  });

  readonly xpRemaining = computed(() => {
    const pet = this.pet();

    return pet ? xpToNextLevel(pet) : 0;
  });

  readonly xpForCurrentLevel = computed(() => {
    const pet = this.pet();

    return pet ? xpForLevel(pet.level) : 0;
  });

  readonly evolution = computed(() => {
    const pet = this.pet();

    return pet ? evolutionPreview(pet) : null;
  });

  readonly achievements = computed(() => {
    const pet = this.pet();

    return pet ? achievementsProgressOf(pet) : [];
  });

  readonly timeline = computed<readonly PetEvent[]>(() => this.pet()?.timeline ?? []);

  readonly pendingCelebration = computed<PetCelebration | null>(() => this.celebrations()[0] ?? null);

  /** Último XP concedido, para quem quiser anunciá-lo na tela. */
  readonly lastXpGain = this.lastGain.asReadonly();

  constructor() {
    const subscription = inject(GameEventBus).events.subscribe((event) => this.react(event));

    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  /** Adota o primeiro companheiro. Escolher de novo não apaga o anterior. */
  choose(type: PetTypeId, name: string): void {
    const existing = this.state().pets[type];

    this.state.update((collection) => ({
      ...collection,
      activeType: type,
      pets: {
        ...collection.pets,
        [type]: existing ? renamePet(existing, name) : createPet(type, name, new Date()),
      },
    }));

    this.persist();
  }

  rename(name: string): void {
    this.updatePet((pet) => renamePet(pet, name));
  }

  /** Brinca com o mascote. Só mexe em felicidade, energia e conquistas. */
  interact(id: PetInteractionId): void {
    this.applyOutcome((pet) => applyInteraction(pet, id, new Date()));
  }

  equip(id: PetAccessoryId | null): void {
    this.updatePet((pet) => equipAccessory(pet, id));
  }

  /**
   * Concede XP ao mascote.
   *
   * Porta única de entrada de XP: quem quiser recompensar a criança chama
   * daqui, e nunca escreve nível ou barra de progresso por conta própria.
   */
  addXp(amount: number, source: PetXpSource): void {
    this.grant([{ amount, source }]);
  }

  dismissCelebration(): void {
    this.celebrations.update((queue) => queue.slice(1));
  }

  /** Recomeça a aventura do zero. Usado só por quem cuida do site. */
  resetAll(): void {
    this.state.set(createCollection());
    this.celebrations.set([]);
    this.lastGain.set(null);
    this.persist();
  }

  /**
   * Traduz um evento dos jogos em XP.
   *
   * Todas as parcelas de um mesmo evento entram numa chamada só, para que o
   * nível suba no máximo uma vez por desafio — é o que evita três avisos
   * seguidos quando o desafio vale o acerto, o bônus de dez e a meta do dia.
   */
  private react(event: GameEvent): void {
    if (!this.hasPet()) {
      return;
    }

    switch (event.type) {
      case 'CHALLENGE_COMPLETED':
        this.registerActivity(event.wasCorrect, event.streak);
        return;
      case 'LEVEL_COMPLETED':
        this.grant([{ source: 'nivel-de-jogo', amount: PET_XP['nivel-de-jogo'] }]);
        return;
      case 'ACHIEVEMENT_UNLOCKED':
        this.grant([{ source: 'conquista', amount: PET_XP.conquista }]);
        return;
    }
  }

  private registerActivity(wasCorrect: boolean, streak: number): void {
    const day = dayKey(new Date());
    const before = this.pet();

    if (!before) {
      return;
    }

    const isFirstOfDay = !before.counters.activeDays.includes(day);
    const counted = withActivity(before, { streak, day });

    const grants: PetXpGrant[] = [{ source: 'atividade', amount: PET_XP.atividade }];

    if (wasCorrect) {
      grants.push({ source: 'acerto', amount: PET_XP.acerto });
    }

    if (counted.counters.activities % PET_CONFIG.activitiesPerBonus === 0) {
      grants.push({ source: 'dez-atividades', amount: PET_XP['dez-atividades'] });
    }

    if (isFirstOfDay) {
      grants.push({ source: 'meta-diaria', amount: PET_XP['meta-diaria'] });
    }

    this.writePet(counted);
    this.grant(grants);
  }

  private grant(grants: readonly PetXpGrant[]): void {
    this.applyOutcome((pet) => addXp(pet, grants, new Date()));
  }

  /** Aplica um resultado ao mascote ativo e enfileira o que ele comemorou. */
  private applyOutcome(operation: (pet: Pet) => PetOutcome): void {
    const current = this.pet();

    if (!current) {
      return;
    }

    const outcome = operation(current);

    this.writePet(outcome.pet);

    if (outcome.grants.length > 0) {
      // A origem anunciada é a parcela que mais pesou; o valor é o total, que
      // é o número que a criança vê subir na barra.
      const main = outcome.grants.reduce((best, grant) =>
        grant.amount > best.amount ? grant : best,
      );

      this.lastGain.set({ source: main.source, amount: outcome.gainedXp });
    }

    if (outcome.celebrations.length > 0) {
      this.celebrations.update((queue) => [...queue, ...outcome.celebrations]);
    }
  }

  private updatePet(operation: (pet: Pet) => Pet): void {
    const current = this.pet();

    if (current) {
      this.writePet(operation(current));
    }
  }

  private writePet(pet: Pet): void {
    this.state.update((collection) => ({
      ...collection,
      pets: { ...collection.pets, [pet.type]: pet },
    }));

    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch {
      // Navegador em modo privado: a aventura vale na sessão atual.
    }
  }
}

function createCollection(): PetCollection {
  return { version: PET_SCHEMA_VERSION, activeType: null, pets: {} };
}

function loadCollection(): PetCollection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? (reconcile(JSON.parse(raw) as unknown) ?? createCollection()) : createCollection();
  } catch {
    // Dado corrompido ou storage bloqueado: a aventura recomeça, sem quebrar.
    return createCollection();
  }
}

/**
 * Aceita o que foi guardado e descarta só o que não faz sentido.
 *
 * Um campo estranho não pode derrubar o mascote inteiro: o que não for
 * reconhecido volta ao padrão e o resto da aventura continua de pé.
 */
function reconcile(value: unknown): PetCollection | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Partial<PetCollection>;
  const storedPets = (candidate.pets ?? {}) as Partial<Record<PetTypeId, unknown>>;

  const pets: Partial<Record<PetTypeId, Pet>> = {};

  for (const id of PET_TYPE_IDS) {
    const pet = sanitizePet(id, storedPets[id]);

    if (pet) {
      pets[id] = pet;
    }
  }

  const activeType =
    typeof candidate.activeType === 'string' && isPetType(candidate.activeType)
      ? candidate.activeType
      : null;

  return {
    version: PET_SCHEMA_VERSION,
    activeType: activeType && pets[activeType] ? activeType : null,
    pets,
  };
}

function sanitizePet(type: PetTypeId, value: unknown): Pet | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const stored = value as Partial<Pet>;
  const fallback = createPet(type, typeof stored.name === 'string' ? stored.name : '', new Date());

  const unlocked = filterIds(stored.unlockedAccessories, KNOWN_ACCESSORIES) as PetAccessoryId[];
  const equipped =
    typeof stored.equippedAccessory === 'string' &&
    unlocked.includes(stored.equippedAccessory as PetAccessoryId)
      ? (stored.equippedAccessory as PetAccessoryId)
      : null;

  const counters = (stored.counters ?? {}) as Partial<Pet['counters']>;

  return {
    ...fallback,
    level: count(stored.level, 1, 1),
    xp: count(stored.xp, 0),
    totalXp: count(stored.totalXp, 0),
    happiness: mood(stored.happiness, PET_CONFIG.initialHappiness),
    energy: mood(stored.energy, PET_CONFIG.initialEnergy),
    equippedAccessory: equipped,
    unlockedAccessories: unlocked,
    achievements: Array.isArray(stored.achievements)
      ? stored.achievements
          .filter(
            (entry): entry is { id: PetAchievementId; completedAt: string } =>
              typeof entry === 'object' &&
              entry !== null &&
              KNOWN_ACHIEVEMENTS.has(String((entry as { id?: unknown }).id)),
          )
          .map((entry) => ({ id: entry.id, completedAt: String(entry.completedAt) }))
      : [],
    counters: {
      activities: count(counters.activities, 0),
      bestStreak: count(counters.bestStreak, 0),
      interactions: count(counters.interactions, 0),
      evolutions: count(counters.evolutions, 0),
      activeDays: Array.isArray(counters.activeDays)
        ? counters.activeDays
            .filter((day): day is string => typeof day === 'string')
            .slice(0, PET_CONFIG.maxActiveDays)
        : [],
    },
    timeline: Array.isArray(stored.timeline)
      ? stored.timeline
          .filter((event): event is PetEvent => isTimelineEvent(event))
          .slice(0, PET_CONFIG.maxTimelineEvents)
      : fallback.timeline,
    createdAt: typeof stored.createdAt === 'string' ? stored.createdAt : fallback.createdAt,
    updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : fallback.updatedAt,
  };
}

function isTimelineEvent(value: unknown): value is PetEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const event = value as Partial<PetEvent>;

  return (
    typeof event.id === 'string' &&
    typeof event.emoji === 'string' &&
    typeof event.description === 'string' &&
    typeof event.createdAt === 'string'
  );
}

function filterIds(value: unknown, known: ReadonlySet<string>): readonly string[] {
  return Array.isArray(value) ? value.filter((id): id is string => known.has(String(id))) : [];
}

function isPetType(value: string): value is PetTypeId {
  return (PET_TYPE_IDS as readonly string[]).includes(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function count(value: unknown, fallback: number, minimum = 0): number {
  return isCount(value) ? Math.max(minimum, Math.trunc(value)) : fallback;
}

/**
 * Felicidade e energia vindas do save.
 *
 * Qualquer número é aparado para dentro de 0 a 100 — inclusive o negativo.
 * Só o que não é número volta ao padrão, porque aí não há o que aparar.
 */
function mood(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(PET_CONFIG.maxMood, Math.max(PET_CONFIG.minMood, Math.trunc(value)));
}
