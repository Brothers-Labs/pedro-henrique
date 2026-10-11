import {
  PET_ACCESSORIES,
  PET_ACHIEVEMENTS,
  PET_CONFIG,
  PET_EVOLUTION_STAGES,
  petAccessory,
  petInteraction,
  petType,
} from '../data/pet.data';
import type {
  Pet,
  PetAccessory,
  PetAccessoryId,
  PetAccessoryState,
  PetAchievement,
  PetAchievementMeasure,
  PetAchievementProgress,
  PetCelebration,
  PetEvent,
  PetEventType,
  PetEvolutionPreview,
  PetInteractionId,
  PetOutcome,
  PetStage,
  PetTypeId,
  PetXpGrant,
} from '../models/pet.model';
import { createId, normalizeText } from '../utils/format';

/**
 * Regras do mascote, sem Angular e sem tela.
 *
 * Todo XP, nível, evolução, desbloqueio e conquista nasce aqui. Os componentes
 * só chamam uma função e desenham o que voltar — é o que impede a página do
 * mascote, o cartão dos jogos e a saudação da home de discordarem entre si.
 *
 * Nada nunca é subtraído: errar não tira XP, ficar dias fora não tira nível e
 * não existe estado do qual não se possa sair.
 */

/** Sobe a cada mudança incompatível do formato guardado. */
export const PET_SCHEMA_VERSION = 1;

/** XP que separa um nível do seguinte. */
export function xpForLevel(level: number): number {
  const required = PET_CONFIG.baseLevelXp + (Math.max(1, level) - 1) * PET_CONFIG.levelXpStep;

  return Math.min(PET_CONFIG.maxLevelXp, required);
}

/** Estágio correspondente ao nível. Não existe estágio guardado em lugar nenhum. */
export function stageFor(level: number): PetStage {
  const reached = PET_EVOLUTION_STAGES.filter((stage) => level >= stage.minLevel);

  return reached[reached.length - 1] ?? PET_EVOLUTION_STAGES[0];
}

/** Próximo estágio, ou `null` quando o mascote já é lendário. */
export function nextStageFor(level: number): PetStage | null {
  return PET_EVOLUTION_STAGES.find((stage) => stage.minLevel > level) ?? null;
}

/** Nome limpo e dentro do limite. Devolve vazio quando não sobra nada. */
export function sanitizePetName(value: string): string {
  return normalizeText(value).slice(0, PET_CONFIG.maxNameLength);
}

/** Dia local em formato ISO curto, chave dos dias ativos. */
export function dayKey(moment: Date): string {
  const month = String(moment.getMonth() + 1).padStart(2, '0');
  const day = String(moment.getDate()).padStart(2, '0');

  return `${moment.getFullYear()}-${month}-${day}`;
}

/** Mascote recém-adotado: nível 1, bem-humorado e com a primeira memória. */
export function createPet(type: PetTypeId, name: string, now: Date): Pet {
  const definition = petType(type);
  const petName = sanitizePetName(name) || definition.label;
  const moment = now.toISOString();

  return {
    type,
    name: petName,
    level: 1,
    xp: 0,
    totalXp: 0,
    happiness: PET_CONFIG.initialHappiness,
    energy: PET_CONFIG.initialEnergy,
    equippedAccessory: null,
    unlockedAccessories: accessoriesUpTo(1),
    achievements: [],
    counters: { activities: 0, bestStreak: 0, interactions: 0, evolutions: 0, activeDays: [] },
    timeline: [
      createEvent('adocao', definition.emoji, `Você conheceu ${petName}`, moment),
    ],
    createdAt: moment,
    updatedAt: moment,
  };
}

/**
 * Concede XP e resolve tudo o que ele desencadeia.
 *
 * As parcelas chegam juntas e somam uma vez só: um desafio que vale o desafio,
 * o acerto e o bônus de dez sobe no máximo um nível, não três.
 *
 * Um valor negativo ou quebrado nunca chega ao estado: ele é aparado antes de
 * qualquer conta, porque XP que desce transformaria o companheiro em castigo.
 *
 * Havendo evolução, ela substitui a comemoração de nível, para que nunca
 * existam dois avisos disputando a tela.
 */
export function addXp(pet: Pet, grants: readonly PetXpGrant[], now: Date): PetOutcome {
  const applied = grants
    .map((grant) => ({ ...grant, amount: Math.max(0, Math.trunc(grant.amount)) }))
    .filter((grant) => grant.amount > 0);

  const gained = applied.reduce((total, grant) => total + grant.amount, 0);
  const moment = now.toISOString();

  let level = pet.level;
  let xp = pet.xp + gained;

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
  }

  const previousStage = stageFor(pet.level);
  const currentStage = stageFor(level);
  const didEvolve = currentStage.id !== previousStage.id;
  const unlocked = newlyUnlockedAccessories(pet, level);

  const events: PetEvent[] = [];
  const celebrations: PetCelebration[] = [];
  const highlight = unlocked[unlocked.length - 1] ?? null;

  if (level > pet.level) {
    if (didEvolve) {
      events.push(
        createEvent(
          'evolucao',
          currentStage.emoji,
          `${pet.name} evoluiu para ${currentStage.label}!`,
          moment,
        ),
      );
      celebrations.push({
        kind: 'evolucao',
        from: previousStage,
        to: currentStage,
        level,
        accessory: highlight,
      });
    } else {
      celebrations.push({ kind: 'nivel', level, accessory: highlight });
    }

    // Só os níveis redondos viram memória: um registro por nível encheria a
    // linha do tempo de linhas iguais e esconderia os momentos que importam.
    if (!didEvolve && level % 5 === 0) {
      events.push(createEvent('nivel', '⭐', `${pet.name} chegou ao nível ${level}`, moment));
    }
  }

  for (const accessory of unlocked) {
    events.push(
      createEvent('acessorio', accessory.emoji, `${accessory.label} desbloqueado`, moment),
    );
  }

  const grown: Pet = {
    ...pet,
    level,
    xp,
    totalXp: pet.totalXp + gained,
    counters: {
      ...pet.counters,
      evolutions: pet.counters.evolutions + (didEvolve ? 1 : 0),
    },
    unlockedAccessories: [
      ...pet.unlockedAccessories,
      ...unlocked.map((accessory) => accessory.id),
    ],
    timeline: appendEvents(pet.timeline, events),
    updatedAt: moment,
  };

  const settled = settleAchievements(grown, now);

  return {
    pet: settled.pet,
    gainedXp: gained,
    grants: applied,
    celebrations: [...celebrations, ...settled.celebrations],
  };
}

/**
 * Registra uma atividade concluída nos jogos.
 *
 * Atualiza só os contadores; o XP entra depois, por `addXp`, para que exista
 * um único lugar capaz de subir nível. Quem erra também conta a atividade:
 * terminar o desafio já é o esforço que o mascote reconhece.
 */
export function withActivity(
  pet: Pet,
  params: { readonly streak: number; readonly day: string },
): Pet {
  const streak = Math.max(0, Math.trunc(params.streak));
  const activeDays = pet.counters.activeDays.includes(params.day)
    ? pet.counters.activeDays
    : [params.day, ...pet.counters.activeDays].slice(0, PET_CONFIG.maxActiveDays);

  return {
    ...pet,
    counters: {
      ...pet.counters,
      activities: pet.counters.activities + 1,
      bestStreak: Math.max(pet.counters.bestStreak, streak),
      activeDays,
    },
  };
}

/**
 * Brincadeira com o mascote.
 *
 * Felicidade e energia ficam presas entre 0 e 100, e nenhuma brincadeira dá
 * XP: o XP vem de aprender, não de clicar. O que se ganha aqui é companhia.
 */
export function applyInteraction(pet: Pet, id: PetInteractionId, now: Date): PetOutcome {
  const interaction = petInteraction(id);

  const played: Pet = {
    ...pet,
    happiness: clampMood(pet.happiness + interaction.happiness),
    energy: clampMood(pet.energy + interaction.energy),
    counters: { ...pet.counters, interactions: pet.counters.interactions + 1 },
    updatedAt: now.toISOString(),
  };

  const settled = settleAchievements(played, now);

  return { pet: settled.pet, gainedXp: 0, grants: [], celebrations: settled.celebrations };
}

/** Veste um acessório já desbloqueado; `null` tira o que estiver vestido. */
export function equipAccessory(pet: Pet, id: PetAccessoryId | null): Pet {
  if (id === null) {
    return { ...pet, equippedAccessory: null };
  }

  // Confere que o id existe no catálogo antes de guardá-lo no save.
  petAccessory(id);

  if (!pet.unlockedAccessories.includes(id)) {
    return pet;
  }

  return { ...pet, equippedAccessory: id };
}

/**
 * Entrega um acessório de prêmio, conquistado fora do mascote.
 *
 * Idempotente: entregar de novo o que já está na coleção não muda nada — é o
 * que permite à Aventura reconferir os prêmios sem medo de duplicar memória.
 */
export function grantRewardAccessory(pet: Pet, id: PetAccessoryId, now: Date): Pet {
  const accessory = petAccessory(id);

  if (accessory.unlock.kind !== 'reward' || pet.unlockedAccessories.includes(id)) {
    return pet;
  }

  const moment = now.toISOString();

  return {
    ...pet,
    unlockedAccessories: [...pet.unlockedAccessories, id],
    timeline: appendEvents(pet.timeline, [
      createEvent('acessorio', accessory.emoji, `${accessory.label} ganha de presente`, moment),
    ]),
    updatedAt: moment,
  };
}

/** Renomeia o mascote. Um nome vazio mantém o anterior. */
export function renamePet(pet: Pet, name: string): Pet {
  const clean = sanitizePetName(name);

  return clean ? { ...pet, name: clean } : pet;
}

/** Quanto falta, de 0 a 100, para o próximo nível. */
export function levelPercentage(pet: Pet): number {
  return Math.min(100, Math.round((pet.xp / xpForLevel(pet.level)) * 100));
}

export function xpToNextLevel(pet: Pet): number {
  return Math.max(0, xpForLevel(pet.level) - pet.xp);
}

/** Prévia da próxima evolução; `null` quando o mascote já é lendário. */
export function evolutionPreview(pet: Pet): PetEvolutionPreview | null {
  const next = nextStageFor(pet.level);

  if (!next) {
    return null;
  }

  const current = stageFor(pet.level);
  const span = next.minLevel - current.minLevel;
  const walked = pet.level - current.minLevel;

  return {
    current,
    next,
    level: pet.level,
    levelsRemaining: next.minLevel - pet.level,
    percentage: span <= 0 ? 0 : Math.round((walked / span) * 100),
  };
}

export function accessoryStateOf(pet: Pet, id: PetAccessoryId): PetAccessoryState {
  if (pet.equippedAccessory === id) {
    return 'equipado';
  }

  return pet.unlockedAccessories.includes(id) ? 'disponivel' : 'bloqueado';
}

export function achievementProgressOf(
  pet: Pet,
  achievement: PetAchievement,
): PetAchievementProgress {
  const record = pet.achievements.find((entry) => entry.id === achievement.id);
  const current = Math.min(achievement.goal, measure(pet, achievement.measure));

  return {
    achievement,
    current,
    goal: achievement.goal,
    percentage: Math.round((current / achievement.goal) * 100),
    isCompleted: record !== undefined,
    completedAt: record?.completedAt ?? null,
  };
}

/** Todas as conquistas com o progresso atual, na ordem do catálogo. */
export function achievementsProgressOf(pet: Pet): readonly PetAchievementProgress[] {
  return PET_ACHIEVEMENTS.map((achievement) => achievementProgressOf(pet, achievement));
}

/**
 * Conquistas recém-satisfeitas.
 *
 * Roda depois de qualquer mudança de estado e nunca concede a mesma duas
 * vezes: uma conquista já registrada sai da checagem para sempre.
 */
function settleAchievements(
  pet: Pet,
  now: Date,
): { readonly pet: Pet; readonly celebrations: readonly PetCelebration[] } {
  const moment = now.toISOString();
  const already = new Set(pet.achievements.map((entry) => entry.id));

  const unlocked = PET_ACHIEVEMENTS.filter(
    (achievement) =>
      !already.has(achievement.id) && measure(pet, achievement.measure) >= achievement.goal,
  );

  if (unlocked.length === 0) {
    return { pet, celebrations: [] };
  }

  const events = unlocked.map((achievement) =>
    createEvent('conquista', achievement.emoji, `Conquista: ${achievement.title}`, moment),
  );

  return {
    pet: {
      ...pet,
      achievements: [
        ...pet.achievements,
        ...unlocked.map((achievement) => ({ id: achievement.id, completedAt: moment })),
      ],
      timeline: appendEvents(pet.timeline, events),
    },
    celebrations: unlocked.map((achievement) => ({ kind: 'conquista', achievement }) as const),
  };
}

function measure(pet: Pet, measured: PetAchievementMeasure): number {
  switch (measured) {
    case 'level':
      return pet.level;
    case 'bestStreak':
      return pet.counters.bestStreak;
    case 'activities':
      return pet.counters.activities;
    case 'activeDays':
      return pet.counters.activeDays.length;
    case 'interactions':
      return pet.counters.interactions;
    case 'evolutions':
      return pet.counters.evolutions;
    case 'isLegendary':
      return stageFor(pet.level).id === 'lendario' ? 1 : 0;
  }
}

function accessoriesUpTo(level: number): readonly PetAccessoryId[] {
  return PET_ACCESSORIES.filter((accessory) => isUnlockedByLevel(accessory, level)).map(
    (accessory) => accessory.id,
  );
}

function newlyUnlockedAccessories(pet: Pet, level: number): readonly PetAccessory[] {
  return PET_ACCESSORIES.filter(
    (accessory) =>
      isUnlockedByLevel(accessory, level) && !pet.unlockedAccessories.includes(accessory.id),
  );
}

/** Acessórios de prêmio nunca chegam pelo nível, por mais alto que ele seja. */
function isUnlockedByLevel(accessory: PetAccessory, level: number): boolean {
  return accessory.unlock.kind === 'level' && accessory.unlock.level <= level;
}

function createEvent(
  type: PetEventType,
  emoji: string,
  description: string,
  createdAt: string,
): PetEvent {
  return { id: createId('pet-evento'), type, emoji, description, createdAt };
}

/** Linha do tempo do mais novo para o mais antigo, com tamanho limitado. */
function appendEvents(timeline: readonly PetEvent[], events: readonly PetEvent[]): readonly PetEvent[] {
  if (events.length === 0) {
    return timeline;
  }

  return [...events.slice().reverse(), ...timeline].slice(0, PET_CONFIG.maxTimelineEvents);
}

function clampMood(value: number): number {
  return Math.min(PET_CONFIG.maxMood, Math.max(PET_CONFIG.minMood, Math.round(value)));
}
