import type { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { CreatureDefinition, SpawnPeriod, Temperament } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import type { BlockProperties } from '../block-properties';

/** Lugares sorteados para cada grupo antes de desistir até a próxima vez. */
const SPAWN_TRIES = 6;

/** O quanto os bichos de um mesmo grupo nascem afastados entre si. */
const GROUP_SPREAD = 2;

/** Altura, para cima e para baixo, onde uma tocha ainda protege o lugar. */
const LIGHT_SEARCH_HEIGHT = 4;

export interface SpawnRequest {
  readonly period: SpawnPeriod;
  readonly allowsHostiles: boolean;
  readonly heroX: number;
  readonly heroZ: number;
  /** Quantos bichos de cada temperamento ainda cabem no mundo. */
  roomFor(temperament: Temperament): number;
}

export interface SpawnGroup {
  readonly definition: CreatureDefinition;
  /** Onde cada membro fica em pé: centro da célula, na altura dos pés. */
  readonly positions: readonly { readonly x: number; readonly y: number; readonly z: number }[];
}

/**
 * Quem nasce e onde.
 *
 * Sorteia, entre os bichos da hora do dia que ainda cabem, um tipo pelo peso
 * do JSON, e procura um chão dele longe do herói. Inimigos nunca nascem perto
 * de uma tocha nem no Modo Paz.
 */
export class CreatureSpawner {
  private readonly spawnable: readonly CreatureDefinition[];

  constructor(
    private readonly world: VoxelWorld,
    private readonly catalog: CraftCatalog,
    private readonly properties: BlockProperties,
    private readonly random: SeededRandom,
  ) {
    this.spawnable = catalog.creatures.filter((creature) => creature.spawn !== null);
  }

  /** Um grupo para nascer agora; `null` quando ninguém cabe ou nenhum lugar serviu. */
  pick(request: SpawnRequest): SpawnGroup | null {
    const candidates = this.spawnable
      .filter((definition) => definition.spawn?.period === request.period && request.roomFor(definition.temperament) > 0)
      .filter((definition) => definition.temperament === 'passive' || request.allowsHostiles)
      .map((definition) => [definition, definition.spawn?.weight ?? 0] as const);

    if (candidates.length === 0) {
      return null;
    }

    const definition = this.random.weighted(candidates);
    const spawn = definition.spawn;

    if (!spawn) {
      return null;
    }

    const settings = this.catalog.world.creatures;
    const ground = new Set(spawn.on.map((id) => this.catalog.blockNumber(id)));
    const isHostile = definition.temperament === 'hostile';
    const standingAt = (x: number, z: number): number | null => {
      const y = this.standingY(x, z, ground);

      return y !== null && (!isHostile || !this.isNearLight(x, y, z)) ? y : null;
    };

    for (let attempt = 0; attempt < SPAWN_TRIES; attempt += 1) {
      const angle = this.random.next() * Math.PI * 2;
      const distance = settings.minSpawnDistance + this.random.next() * (settings.maxSpawnDistance - settings.minSpawnDistance);
      const x = Math.floor(request.heroX + Math.cos(angle) * distance);
      const z = Math.floor(request.heroZ + Math.sin(angle) * distance);

      if (standingAt(x, z) === null) {
        continue;
      }

      const size = Math.min(request.roomFor(definition.temperament), this.random.integer(spawn.groupMin, spawn.groupMax));
      const positions: { x: number; y: number; z: number }[] = [];

      for (let member = 0; member < size; member += 1) {
        const memberX = member === 0 ? x : x + this.random.integer(-GROUP_SPREAD, GROUP_SPREAD);
        const memberZ = member === 0 ? z : z + this.random.integer(-GROUP_SPREAD, GROUP_SPREAD);
        const y = standingAt(memberX, memberZ);

        if (y !== null) {
          positions.push({ x: memberX + 0.5, y, z: memberZ + 0.5 });
        }
      }

      return { definition, positions };
    }

    return null;
  }

  /**
   * Um lugar para um visitante especial: em qualquer chão firme, longe do
   * herói como os outros inimigos e longe das tochas. `null` se não achou.
   */
  placeNear(heroX: number, heroZ: number): { readonly x: number; readonly y: number; readonly z: number } | null {
    const settings = this.catalog.world.creatures;

    for (let attempt = 0; attempt < SPAWN_TRIES * 2; attempt += 1) {
      const angle = this.random.next() * Math.PI * 2;
      const distance = settings.minSpawnDistance + this.random.next() * GROUP_SPREAD * 4;
      const x = Math.floor(heroX + Math.cos(angle) * distance);
      const z = Math.floor(heroZ + Math.sin(angle) * distance);
      const y = this.standingY(x, z, null);

      if (y !== null && !this.isNearLight(x, y, z)) {
        return { x: x + 0.5, y, z: z + 0.5 };
      }
    }

    return null;
  }

  /** Há uma tocha (ou outra luz) perto? Ali inimigo nenhum nasce. */
  private isNearLight(x: number, y: number, z: number): boolean {
    const radius = this.catalog.world.creatures.torchSafeRadius;
    const { world, properties } = this;

    for (let cellY = y - LIGHT_SEARCH_HEIGHT; cellY <= y + LIGHT_SEARCH_HEIGHT; cellY += 1) {
      for (let cellZ = z - radius; cellZ <= z + radius; cellZ += 1) {
        for (let cellX = x - radius; cellX <= x + radius; cellX += 1) {
          if (properties.light[world.get(cellX, cellY, cellZ)] > 0) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Altura onde um bicho fica em pé na coluna: o chão mais alto tem que ser
   * de um dos blocos permitidos (`null` aceita qualquer chão firme), com dois
   * blocos livres em cima. Capim e flor não contam como chão.
   */
  private standingY(x: number, z: number, ground: ReadonlySet<number> | null): number | null {
    const { world, properties } = this;

    if (x < 0 || z < 0 || x >= world.width || z >= world.depth) {
      return null;
    }

    for (let y = world.height - 1; y > 0; y -= 1) {
      const block = world.get(x, y, z);

      if (block === AIR || (properties.collisionHeight[block] === 0 && properties.isLiquid[block] === 0)) {
        continue;
      }

      const isClear = [1, 2].every((above) => {
        const cell = world.get(x, y + above, z);

        return properties.collisionHeight[cell] === 0 && properties.isLiquid[cell] === 0;
      });

      const isGround = ground ? ground.has(block) : properties.collisionHeight[block] > 0;

      return isGround && isClear ? y + 1 : null;
    }

    return null;
  }
}
