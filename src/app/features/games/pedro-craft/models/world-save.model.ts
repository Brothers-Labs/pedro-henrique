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

/**
 * Como o mundo se joga, escolhido ao criar:
 * - `creative`: sem perder vida e sem inimigos, blocos infinitos, voo;
 * - `adventure`: modo Normal, o jogo de sempre;
 * - `infinite`: melhores ferramentas e suprimentos renovados nos baús;
 * - `survival`: com a energia, que pede comida mas nunca tira vida.
 */
export const GAME_MODES = ['creative', 'adventure', 'survival', 'infinite'] as const;

export type GameMode = (typeof GAME_MODES)[number];

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
  /** Energia, só no modo Sobrevivência gentil. */
  readonly energy?: number;
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
  /** Filhote: o tempo que falta para crescer. Ausente (ou 0) num adulto. */
  readonly growLeftMs?: number;
  /** Descanso depois de ter um filhote. */
  readonly breedRestMs?: number;
  /** Chamada pela mochila do Criativo: passeia mansa, mesmo sendo um bicho bravo. Ausente (ou `false`) no resto. */
  readonly tame?: boolean;
}

/** Missões: as cumpridas, pelo id, e quanto já foi feito da missão da vez. */
/** O Jogador 2: guardado quando o mundo foi jogado em dupla, e mantido nas vezes em que se joga sozinho. */
export interface SavedPartner {
  readonly hero: SavedHero;
  readonly inventory: readonly SavedSlot[];
}

export interface SavedGoals {
  readonly completed: readonly string[];
  readonly amount: number;
}

/** O que mudou no mundo desde que a semente o gerou. */
export interface WorldState {
  readonly hero: SavedHero;
  readonly inventory: readonly SavedSlot[];
  /** O Jogador 2, se o mundo já foi jogado em dupla. */
  readonly partner?: SavedPartner;
  /** Milissegundos desde o começo da manhã. */
  readonly clockMs: number;
  /** Dia do calendário, a partir de 1. Ausente nos saves de antes das estações: vale o dia 1. */
  readonly day?: number;
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
  readonly mode: GameMode;
  readonly createdAt: string;
}

export interface WorldSave extends WorldIdentity {
  readonly version: number;
  readonly updatedAt: string;
  /** `null` num mundo recém-criado, que ainda não foi jogado: ele nasce inteiro da semente. */
  readonly state: WorldState | null;
}
