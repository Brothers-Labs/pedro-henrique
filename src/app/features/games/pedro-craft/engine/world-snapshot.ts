import { AIR } from '../content/craft-catalog';
import {
  type SavedBlock,
  type SavedChunk,
  type SavedContainer,
  type SavedCreature,
  type SavedFurnace,
  type SavedHero,
  type SavedPartner,
  type SavedPlant,
  type SavedSlot,
  WORLD_SAVE_VERSION,
  type WorldIdentity,
  type WorldSave,
  type WorldState,
} from '../models/world-save.model';
import type { CraftSimulation } from './simulation/craft-simulation';
import type { HeroMotion } from './simulation/hero-motion';
import { completedGoalIds } from './simulation/goal-tracker';
import { CHEST_SIZE, type SlotContent } from './simulation/inventory';

/**
 * Fotografa a simulação num `WorldSave`.
 *
 * Só o que a semente não refaz: os blocos que mudaram (menos a água
 * corrente, que nasce de novo das nascentes), o que está plantado, guardado
 * e vivo, e o herói. Os inimigos ficam de fora: ao abrir o mundo de novo, eles
 * já "voltaram para casa".
 */
/**
 * `keptPartner`: o Jogador 2 de uma partida em dupla anterior. Jogando
 * sozinho, ele continua guardado como estava, para a próxima vez em dupla.
 * `keptThird` faz o mesmo pelo Jogador 3 de uma partida em trio anterior.
 */
export function captureWorld(
  simulation: CraftSimulation,
  identity: WorldIdentity,
  updatedAt: string,
  keptPartner?: SavedPartner,
  keptThird?: SavedPartner,
): WorldSave {
  const { id, name, seed, mode, createdAt } = identity;
  const state = captureState(simulation);
  const partner = capturePartner(simulation, 1) ?? keptPartner;
  const third = capturePartner(simulation, 2) ?? keptThird;

  return {
    version: WORLD_SAVE_VERSION,
    id,
    name,
    seed,
    mode,
    createdAt,
    updatedAt,
    // Sem Jogador 2 ou 3, o campo nem aparece: o save fica igual ao de quem sempre jogou sozinho.
    state: { ...state, ...(partner ? { partner } : {}), ...(third ? { third } : {}) },
  };
}

/** O herói e a mochila do jogador `index` (1 ou 2); `undefined` quando ele não está nesta partida. */
function capturePartner(simulation: CraftSimulation, index: number): SavedPartner | undefined {
  return simulation.players[index]
    ? simulation.asPlayer(index, () => ({ hero: captureHero(simulation), inventory: simulation.inventory.slots.map(copySlot) }))
    : undefined;
}

/**
 * Devolve à simulação recém-criada o que o save guardou.
 *
 * A mochila e as missões já entram pelas opções da simulação. Os blocos vêm
 * primeiro, pela troca normal do mundo: a água acorda e escorre das
 * nascentes, e as plantas só são lembradas onde o bloco delas está mesmo.
 */
export function restoreWorld(simulation: CraftSimulation, state: WorldState): void {
  const { world, catalog, hero, farm, screens, creatures } = simulation;

  for (const chunk of state.chunks) {
    for (const [x, y, z, block] of chunk.blocks) {
      world.set(x, y, z, block === null ? AIR : catalog.blockNumber(block));
    }
  }

  restoreHero(simulation, hero, state.hero);

  // O Jogador 2 e o 3 voltam para onde estavam, cada um se estiver nesta partida.
  ([state.partner, state.third] as const).forEach((saved, offset) => {
    const index = offset + 1;

    if (saved && simulation.players[index]) {
      simulation.asPlayer(index, () => restoreHero(simulation, simulation.hero, saved.hero));
    }
  });

  simulation.setCalendarDay(state.day ?? 1);
  simulation.clock.setTime(state.clockMs);

  for (const plant of state.plants) {
    const crop = catalog.crop(plant.crop);

    if (world.get(plant.x, plant.y, plant.z) === catalog.blockNumber(crop.block)) {
      farm.plants.set(world.indexOf(plant.x, plant.y, plant.z), {
        crop,
        stage: Math.min(plant.stage, crop.stages - 1),
        elapsedMs: plant.elapsedMs,
      });
    }
  }

  for (const container of state.containers) {
    screens.containers.set(world.indexOf(container.x, container.y, container.z), Array.from({ length: CHEST_SIZE }, (_, index) => copySlot(container.slots[index] ?? null)));
  }

  for (const furnace of state.furnaces) {
    screens.furnaces.set(world.indexOf(furnace.x, furnace.y, furnace.z), {
      slots: furnace.slots.map(copySlot),
      burnLeftMs: furnace.burnLeftMs,
      burnTotalMs: furnace.burnTotalMs,
      progressMs: furnace.progressMs,
    });
  }

  for (const saved of state.creatures) {
    const creature = creatures.spawn(catalog.creature(saved.creature), saved.x, saved.y, saved.z);

    creature.yaw = saved.yaw;
    creature.health = Math.min(saved.health, creature.definition.health);
    creature.layLeftMs = creature.definition.lays ? (saved.layLeftMs ?? creature.definition.lays.everyMs) : null;
    saved.cooldowns.forEach((cooldown) => creature.setCooldown(cooldown.item, cooldown.leftMs));
    creature.growLeftMs = Math.min(saved.growLeftMs ?? 0, creature.definition.babyGrowMs);
    creature.breedRestMs = saved.breedRestMs ?? 0;
    creature.isTame = saved.tame ?? false;
  }
}

function copySlot(slot: SavedSlot | SlotContent): SlotContent {
  return slot ? { item: slot.item, count: slot.count, durability: slot.durability } : null;
}

/** Posição, olhar, vida, energia, barra e cama do jogador da vez. */
function restoreHero(simulation: CraftSimulation, hero: HeroMotion, saved: SavedHero): void {
  hero.teleport(saved.x, saved.y, saved.z);
  hero.yaw = saved.yaw;
  hero.pitch = saved.pitch;
  simulation.selectedSlot = saved.selectedSlot;
  simulation.respawnPoint = saved.respawn;
  simulation.health.set(saved.health);

  if (saved.energy !== undefined) {
    simulation.energy?.set(saved.energy);
  }
}

function captureHero(simulation: CraftSimulation): SavedHero {
  const { hero, health } = simulation;
  const body = hero.body;
  const respawn = simulation.respawnPoint;

  return {
    x: body.x,
    y: body.y,
    z: body.z,
    yaw: hero.yaw,
    pitch: hero.pitch,
    health: health.value,
    energy: simulation.energy?.value,
    selectedSlot: simulation.selectedSlot,
    respawn: { x: respawn.x, y: respawn.y, z: respawn.z, yaw: respawn.yaw },
  };
}

function captureState(simulation: CraftSimulation): WorldState {
  const { clock, catalog } = simulation;

  return {
    hero: captureHero(simulation),
    inventory: simulation.inventory.slots.map(copySlot),
    clockMs: clock.time,
    day: simulation.calendar.day,
    goals: {
      completed: completedGoalIds(catalog.goals, simulation.goals.progress),
      amount: simulation.goals.progress.amount,
    },
    chunks: captureChunks(simulation),
    plants: capturePlants(simulation),
    containers: captureContainers(simulation),
    furnaces: captureFurnaces(simulation),
    creatures: captureCreatures(simulation),
  };
}

/** Os blocos que mudaram, agrupados pela coluna de chunk, como o ADR combina com o servidor. */
function captureChunks(simulation: CraftSimulation): readonly SavedChunk[] {
  const { world, catalog } = simulation;
  const chunkSize = catalog.world.chunkSize;
  const flowing = catalog.blockNumber(catalog.world.blocks.flowingWater);
  const chunks = new Map<string, { readonly x: number; readonly z: number; readonly blocks: SavedBlock[] }>();

  for (const cell of simulation.changes.changed) {
    const { x, y, z } = world.positionOf(cell);
    const block = world.get(x, y, z);

    if (block === flowing) {
      continue;
    }

    const chunkX = Math.floor(x / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    const key = `${chunkX},${chunkZ}`;
    const chunk = chunks.get(key) ?? { x: chunkX, z: chunkZ, blocks: [] };

    chunk.blocks.push([x, y, z, block === AIR ? null : (catalog.blockAt(block)?.id ?? null)]);
    chunks.set(key, chunk);
  }

  return [...chunks.values()];
}

function capturePlants(simulation: CraftSimulation): readonly SavedPlant[] {
  return [...simulation.farm.plants].map(([cell, plant]) => ({
    ...simulation.world.positionOf(cell),
    crop: plant.crop.id,
    stage: plant.stage,
    elapsedMs: plant.elapsedMs,
  }));
}

function captureContainers(simulation: CraftSimulation): readonly SavedContainer[] {
  return [...simulation.screens.containers].map(([cell, slots]) => ({
    ...simulation.world.positionOf(cell),
    slots: slots.map(copySlot),
  }));
}

function captureFurnaces(simulation: CraftSimulation): readonly SavedFurnace[] {
  return [...simulation.screens.furnaces].map(([cell, furnace]) => ({
    ...simulation.world.positionOf(cell),
    slots: furnace.slots.map(copySlot),
    burnLeftMs: furnace.burnLeftMs,
    burnTotalMs: furnace.burnTotalMs,
    progressMs: furnace.progressMs,
  }));
}

function captureCreatures(simulation: CraftSimulation): readonly SavedCreature[] {
  return simulation.creatures.list
    .filter((creature) => !creature.isHostile)
    .map((creature) => ({
      creature: creature.definition.id,
      x: creature.body.x,
      y: creature.body.y,
      z: creature.body.z,
      yaw: creature.yaw,
      health: creature.health,
      layLeftMs: creature.layLeftMs,
      cooldowns: creature.cooldownList,
      growLeftMs: creature.growLeftMs,
      breedRestMs: creature.breedRestMs,
      tame: creature.isTame,
    }));
}
