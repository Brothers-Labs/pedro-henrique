import { normalizeText } from '../../../../core/utils/format';
import { type JsonObjectReader, JsonReader } from '../content/json-reader';
import type { CraftCatalog } from '../content/craft-catalog';
import { CHEST_SIZE, HOTBAR_SIZE, INVENTORY_SIZE } from '../engine/simulation/inventory';
import {
  type SavedBlock,
  type SavedChunk,
  type SavedContainer,
  type SavedCreature,
  type SavedFurnace,
  type SavedHero,
  type SavedPlant,
  type SavedPoint,
  type SavedSlot,
  GAME_MODES,
  WORLD_SAVE_VERSION,
  type WorldSave,
  type WorldState,
} from '../models/world-save.model';

/** Nome de mundo: curto o bastante para caber no cartão da lista. */
export const WORLD_NAME_MAX_LENGTH = 32;

const FURNACE_SLOTS = 3;

/**
 * Migração de uma versão para a seguinte. A versão 1 é a primeira: quando o
 * formato mudar, a migração `1` leva um save da versão 1 para a 2, e assim por
 * diante — um save antigo sobe degrau por degrau até a versão atual.
 */
type Migration = (save: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>;

const MIGRATIONS: Readonly<Partial<Record<number, Migration>>> = {};

/**
 * Lê um mundo salvo vindo de fora (IndexedDB, servidor).
 *
 * Primeiro sobe a versão, depois confere campo a campo. Um save que não tem
 * conserto lança `ContentError` com o caminho do problema: quem chama avisa a
 * criança e oferece outro mundo, sem derrubar a tela (CA04).
 */
export function parseWorldSave(value: unknown): WorldSave {
  return readSave(JsonReader.root('world-save', migrateWorldSave(value)).object());
}

export function migrateWorldSave(value: unknown): unknown {
  const root = JsonReader.root('world-save', value).object();
  const version = root.field('version').number({ integer: true, min: 1 });

  if (version > WORLD_SAVE_VERSION) {
    root.fail(`versão ${version} foi salva por um jogo mais novo (este entende até a ${WORLD_SAVE_VERSION})`);
  }

  let current = value as Readonly<Record<string, unknown>>;

  for (let from = version; from < WORLD_SAVE_VERSION; from += 1) {
    const migration = MIGRATIONS[from];

    if (!migration) {
      return root.fail(`não há migração da versão ${from}`);
    }

    current = { ...migration(current), version: from + 1 };
  }

  return current;
}

/**
 * Tira do save o que o conteúdo de hoje não conhece mais: um bloco, item,
 * bicho ou plantação que saiu dos JSON, uma pilha maior que o máximo, uma
 * posição fora do mundo. O resto do mundo continua inteiro.
 */
export function cleanWorldSave(save: WorldSave, catalog: CraftCatalog): WorldSave {
  return save.state ? { ...save, state: cleanState(save.state, catalog) } : save;
}

function cleanState(state: WorldState, catalog: CraftCatalog): WorldState {
  const { width, depth, height } = catalog.world;
  const isInside = (x: number, y: number, z: number): boolean =>
    x >= 0 && z >= 0 && y >= 0 && x < width && z < depth && y < height;
  const cleanSlot = (slot: SavedSlot): SavedSlot => {
    if (!slot || !catalog.hasItem(slot.item)) {
      return null;
    }

    const item = catalog.item(slot.item);
    const durability = item.durability === null ? null : Math.min(item.durability, Math.max(1, slot.durability ?? item.durability));

    return { item: slot.item, count: Math.min(item.maxStack, slot.count), durability };
  };
  const cleanSlots = (slots: readonly SavedSlot[], size: number): SavedSlot[] =>
    Array.from({ length: size }, (_, index) => cleanSlot(slots[index] ?? null));

  return {
    ...state,
    hero: {
      ...state.hero,
      health: Math.min(catalog.world.hero.maxHealth, Math.max(1, state.hero.health)),
      selectedSlot: Math.min(HOTBAR_SIZE - 1, state.hero.selectedSlot),
    },
    inventory: cleanSlots(state.inventory, INVENTORY_SIZE),
    chunks: state.chunks
      .map((chunk) => ({
        ...chunk,
        blocks: chunk.blocks.filter(
          ([x, y, z, block]) => isInside(x, y, z) && (block === null || catalog.findBlockNumber(block) !== null),
        ),
      }))
      .filter((chunk) => chunk.blocks.length > 0),
    plants: state.plants.filter((plant) => isInside(plant.x, plant.y, plant.z) && catalog.hasCrop(plant.crop)),
    containers: state.containers
      .filter((container) => isInside(container.x, container.y, container.z))
      .map((container) => ({ ...container, slots: cleanSlots(container.slots, CHEST_SIZE) })),
    furnaces: state.furnaces
      .filter((furnace) => isInside(furnace.x, furnace.y, furnace.z))
      .map((furnace) => ({ ...furnace, slots: cleanSlots(furnace.slots, FURNACE_SLOTS) })),
    creatures: state.creatures.filter(
      (creature) => catalog.hasCreature(creature.creature) && isInside(creature.x, Math.max(0, creature.y), creature.z),
    ),
  };
}

/** Nome digitado pela criança: sem espaços sobrando e com tamanho de cartão; vazio vira o sugerido. */
export function normalizeWorldName(name: string, fallback: string): string {
  return normalizeText(name).slice(0, WORLD_NAME_MAX_LENGTH).trim() || fallback;
}

/* Leitura campo a campo ---------------------------------------------------------------- */

function readSave(root: JsonObjectReader): WorldSave {
  const state = root.optionalField('state');

  return {
    version: root.field('version').number({ integer: true, min: 1 }),
    id: root.field('id').string(),
    name: root.field('name').string(),
    seed: root.field('seed').number({ integer: true }),
    // Mundos de antes dos modos são de aventura, que é o jogo que eles sempre foram.
    mode: root.optionalField('mode')?.oneOf(GAME_MODES) ?? 'adventure',
    createdAt: readDate(root, 'createdAt'),
    updatedAt: readDate(root, 'updatedAt'),
    state: state ? readState(state.object()) : null,
  };
}

function readState(root: JsonObjectReader): WorldState {
  const goals = root.field('goals').object();

  return {
    hero: readHero(root.field('hero').object()),
    inventory: root.field('inventory').array().map(readSlot),
    clockMs: root.field('clockMs').number({ min: 0 }),
    day: root.optionalField('day')?.number({ integer: true, min: 1 }) ?? 1,
    goals: {
      completed: goals.field('completed').array().map((id) => id.id()),
      amount: goals.field('amount').number({ integer: true, min: 0 }),
    },
    chunks: root.field('chunks').array().map((chunk) => readChunk(chunk.object())),
    plants: root.field('plants').array().map((plant) => readPlant(plant.object())),
    containers: root.field('containers').array().map((container) => readContainer(container.object())),
    furnaces: root.field('furnaces').array().map((furnace) => readFurnace(furnace.object())),
    creatures: root.field('creatures').array().map((creature) => readCreature(creature.object())),
  };
}

function readDate(object: JsonObjectReader, name: string): string {
  const value = object.field(name).string();

  if (Number.isNaN(Date.parse(value))) {
    object.fail(`"${name}" não é uma data`);
  }

  return value;
}

function readPoint(point: JsonObjectReader): SavedPoint {
  return {
    x: point.field('x').number(),
    y: point.field('y').number(),
    z: point.field('z').number(),
    yaw: point.field('yaw').number(),
  };
}

function readHero(hero: JsonObjectReader): SavedHero {
  return {
    ...readPoint(hero),
    pitch: hero.field('pitch').number({ min: -Math.PI, max: Math.PI }),
    health: hero.field('health').number({ integer: true, min: 0 }),
    energy: hero.optionalField('energy')?.number({ integer: true, min: 0 }),
    selectedSlot: hero.field('selectedSlot').number({ integer: true, min: 0 }),
    respawn: readPoint(hero.field('respawn').object()),
  };
}

function readSlot(slot: JsonReader): SavedSlot {
  if (slot.isNull) {
    return null;
  }

  const stack = slot.object();

  return {
    item: stack.field('item').id(),
    count: stack.field('count').number({ integer: true, min: 1 }),
    durability: stack.optionalField('durability')?.number({ integer: true, min: 0 }) ?? null,
  };
}

function readCell(cell: JsonObjectReader): { readonly x: number; readonly y: number; readonly z: number } {
  return {
    x: cell.field('x').number({ integer: true }),
    y: cell.field('y').number({ integer: true }),
    z: cell.field('z').number({ integer: true }),
  };
}

function readChunk(chunk: JsonObjectReader): SavedChunk {
  return {
    x: chunk.field('x').number({ integer: true }),
    z: chunk.field('z').number({ integer: true }),
    blocks: chunk.field('blocks').array().map((entry): SavedBlock => {
      const [x, y, z, block] = entry.array({ minLength: 4 });

      return [
        x.number({ integer: true }),
        y.number({ integer: true }),
        z.number({ integer: true }),
        block.isNull ? null : block.id(),
      ];
    }),
  };
}

function readPlant(plant: JsonObjectReader): SavedPlant {
  return {
    ...readCell(plant),
    crop: plant.field('crop').id(),
    stage: plant.field('stage').number({ integer: true, min: 0 }),
    elapsedMs: plant.field('elapsedMs').number({ min: 0 }),
  };
}

function readContainer(container: JsonObjectReader): SavedContainer {
  return { ...readCell(container), slots: container.field('slots').array().map(readSlot) };
}

function readFurnace(furnace: JsonObjectReader): SavedFurnace {
  return {
    ...readContainer(furnace),
    burnLeftMs: furnace.field('burnLeftMs').number({ min: 0 }),
    burnTotalMs: furnace.field('burnTotalMs').number({ min: 0 }),
    progressMs: furnace.field('progressMs').number({ min: 0 }),
  };
}

function readCreature(creature: JsonObjectReader): SavedCreature {
  return {
    creature: creature.field('creature').id(),
    x: creature.field('x').number(),
    y: creature.field('y').number(),
    z: creature.field('z').number(),
    yaw: creature.field('yaw').number(),
    health: creature.field('health').number({ integer: true, min: 1 }),
    layLeftMs: creature.optionalField('layLeftMs')?.number({ min: 0 }) ?? null,
    growLeftMs: creature.optionalField('growLeftMs')?.number({ min: 0 }) ?? 0,
    breedRestMs: creature.optionalField('breedRestMs')?.number({ min: 0 }) ?? 0,
    tame: creature.optionalField('tame')?.boolean() ?? false,
    cooldowns: creature
      .field('cooldowns')
      .array()
      .map((entry) => {
        const cooldown = entry.object();

        return { item: cooldown.field('item').id(), leftMs: cooldown.field('leftMs').number({ min: 0 }) };
      }),
  };
}
