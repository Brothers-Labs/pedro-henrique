/**
 * Um mundo salvo do PedroCraft.
 *
 * É o mesmo JSON guardado no IndexedDB do aparelho e, no futuro, enviado ao
 * servidor (`docs/pedro-craft-api.md`). Guarda só o que a semente não
 * consegue refazer: os blocos que mudaram, o que está plantado, guardado e
 * vivo, e o herói. Tudo é referido por id de texto, nunca pelos números
 * internos dos blocos (RN05).
 */

/** Versão deste formato. Cada versão nova ganha uma migração em `world/world-save.ts`. */
export const WORLD_SAVE_VERSION = 1;

export interface SavedStack {
  readonly item: string;
  readonly count: number;
  /** Usos que restam; `null` para o que não gasta. */
  readonly durability: number | null;
}

export type SavedSlot = SavedStack | null;

/** Um bloco que mudou: posição no mundo e o bloco de agora (`null` é ar). */
export type SavedBlock = readonly [x: number, y: number, z: number, block: string | null];

/** Os blocos que mudaram dentro de uma coluna de chunk (`x`, `z` em chunks, não em blocos). */
export interface SavedChunk {
  readonly x: number;
  readonly z: number;
  readonly blocks: readonly SavedBlock[];
}

export interface SavedPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}

export interface SavedHero extends SavedPoint {
  readonly pitch: number;
  readonly health: number;
  readonly selectedSlot: number;
  /** Onde volta depois de desmaiar: a cama usada por último, ou o começo do mundo. */
  readonly respawn: SavedPoint;
}

export interface SavedCell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SavedPlant extends SavedCell {
  readonly crop: string;
  readonly stage: number;
  readonly elapsedMs: number;
}

/** Um baú: o que tem em cada espaço. */
export interface SavedContainer extends SavedCell {
  readonly slots: readonly SavedSlot[];
}

export interface SavedFurnace extends SavedContainer {
  readonly burnLeftMs: number;
  readonly burnTotalMs: number;
  readonly progressMs: number;
}

export interface SavedCooldown {
  readonly item: string;
  readonly leftMs: number;
}

/** Um animal. Os inimigos não vão para o save: ao abrir o mundo, eles já "voltaram para casa". */
export interface SavedCreature {
  readonly creature: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly health: number;
  readonly layLeftMs: number | null;
  readonly cooldowns: readonly SavedCooldown[];
}

/** Missões: as cumpridas, pelo id, e quanto já foi feito da missão da vez. */
export interface SavedGoals {
  readonly completed: readonly string[];
  readonly amount: number;
}

/** O que mudou no mundo desde que a semente o gerou. */
export interface WorldState {
  readonly hero: SavedHero;
  readonly inventory: readonly SavedSlot[];
  /** Milissegundos desde o começo da manhã. */
  readonly clockMs: number;
  readonly goals: SavedGoals;
  readonly chunks: readonly SavedChunk[];
  readonly plants: readonly SavedPlant[];
  readonly containers: readonly SavedContainer[];
  readonly furnaces: readonly SavedFurnace[];
  readonly creatures: readonly SavedCreature[];
}

/** O que identifica um mundo, antes de existir qualquer coisa salva nele. */
export interface WorldIdentity {
  readonly id: string;
  readonly name: string;
  readonly seed: number;
  readonly createdAt: string;
}

export interface WorldSave extends WorldIdentity {
  readonly version: number;
  readonly updatedAt: string;
  /** `null` num mundo recém-criado, que ainda não foi jogado: ele nasce inteiro da semente. */
  readonly state: WorldState | null;
}
