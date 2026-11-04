import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { AIR, type CraftCatalog } from '../content/craft-catalog';
import type { OreVein, WorldDefinition } from '../models/content.model';
import { type BlockWriter, placeStructure, placeTree, structureSize } from './structures';
import { ValueNoise } from './value-noise';
import { VoxelWorld } from './voxel-world';

export interface ColumnPoint {
  readonly x: number;
  readonly z: number;
}

/** Ponto de nascimento do herói: em pé, olhando numa direção. */
export interface SpawnPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}

/** Onde cada região caiu, para quem precisa saber depois (testes, mapa, criaturas). */
export interface WorldLayout {
  readonly farm: ColumnPoint;
  readonly lake: ColumnPoint;
  readonly forest: ColumnPoint;
  readonly quarry: ColumnPoint;
  readonly house: { readonly x: number; readonly y: number; readonly z: number };
  readonly spawn: SpawnPoint;
}

export interface GeneratedWorld {
  readonly world: VoxelWorld;
  readonly layout: WorldLayout;
}

/** Distância do centro até as três regiões, em fração do lado menor do mundo. */
const REGION_DISTANCE = 0.3;

/** Chance de árvore solta fora do bosque. */
const STRAY_TREE_CHANCE = 0.004;

/** Fora da pedreira, uma fração das pedras subterrâneas também guarda minério. */
const UNDERGROUND_ORE_FACTOR = 0.15;

/** Mistura a semente do mundo com a posição do minério raro na lista: cada um tem a sua sequência. */
const RARE_ORE_SALT = 0x9e3779b9;

/** O herói olha para o sul (+z) ao nascer: de costas para a casa, de frente para a fazenda. */
const SPAWN_YAW = Math.PI;

interface BlockNumbers {
  readonly surface: number;
  readonly soil: number;
  readonly stone: number;
  readonly sand: number;
  readonly gravel: number;
  readonly water: number;
  readonly bedrock: number;
  readonly log: number;
  readonly leaves: number;
  readonly farmland: number;
  readonly decorations: readonly [number, ...number[]];
  readonly ores: readonly OreNumbers[];
  readonly rareOres: readonly OreNumbers[];
}

interface OreNumbers {
  readonly block: number;
  readonly chance: number;
  readonly maxY: number;
}

/**
 * Gera a fazenda inteira a partir de uma semente.
 *
 * Mesma semente, mesmo mundo, bloco a bloco: é isso que deixa o save guardar
 * só as diferenças. Toda decisão aleatória sai do mesmo `SeededRandom`, numa
 * ordem fixa — mudar a ordem dos passos muda todos os mundos, então só se
 * mexe aqui junto com uma migração de save.
 */
export function generateWorld(catalog: CraftCatalog, seed: number): GeneratedWorld {
  const definition = catalog.world;
  const random = new SeededRandom(seed);
  const noise = new ValueNoise(seed ^ 0x5bd1e995);
  const world = new VoxelWorld(definition.width, definition.depth, definition.height);
  const blocks = blockNumbers(catalog);
  const regions = placeRegions(definition, random);
  const river = carveRiver(definition, regions.lake, random);
  const heights = shapeTerrain(definition, regions, river, noise);
  const writer: BlockWriter = { get: (x, y, z) => world.get(x, y, z), put: (x, y, z, block) => world.fill(x, y, z, block) };

  fillColumns(world, definition, blocks, regions, heights, river, random);
  scatterRareOres(world, definition, blocks, regions, heights, seed);

  const house = buildHouse(world, writer, catalog, definition, regions.farm, heights);

  buildFarmPlot(world, definition, blocks, regions.farm, house);
  plantTrees(world, writer, catalog, definition, blocks, regions, house, random);
  scatterDecorations(world, definition, blocks, random);

  const door = { x: house.x + 3, z: house.z + structureSize(definition.house).depth - 1 };

  return {
    world,
    layout: {
      ...regions,
      house,
      spawn: { x: door.x + 0.5, y: house.y + 1, z: door.z + 2.5, yaw: SPAWN_YAW },
    },
  };
}

function blockNumbers(catalog: CraftCatalog): BlockNumbers {
  const names = catalog.world.blocks;
  const [firstDecoration, ...otherDecorations] = names.decorations.map((id) => catalog.blockNumber(id));

  return {
    surface: catalog.blockNumber(names.surface),
    soil: catalog.blockNumber(names.soil),
    stone: catalog.blockNumber(names.stone),
    sand: catalog.blockNumber(names.sand),
    gravel: catalog.blockNumber(names.gravel),
    water: catalog.blockNumber(names.water),
    bedrock: catalog.blockNumber(names.bedrock),
    log: catalog.blockNumber(names.log),
    leaves: catalog.blockNumber(names.leaves),
    farmland: catalog.blockNumber(names.farmland),
    decorations: firstDecoration === undefined ? [AIR] : [firstDecoration, ...otherDecorations],
    ores: oreNumbers(catalog, catalog.world.quarry.ores),
    rareOres: oreNumbers(catalog, catalog.world.quarry.rareOres),
  };
}

function oreNumbers(catalog: CraftCatalog, veins: readonly OreVein[]): readonly OreNumbers[] {
  return veins.map((ore) => ({ block: catalog.blockNumber(ore.block), chance: ore.chance, maxY: ore.maxY }));
}

interface Regions {
  readonly farm: ColumnPoint;
  readonly lake: ColumnPoint;
  readonly forest: ColumnPoint;
  readonly quarry: ColumnPoint;
}

/**
 * A fazenda fica no centro; lago, bosque e pedreira, em volta, a 120° um do outro.
 *
 * O giro inicial é sorteado: cada semente põe o lago num lado diferente, mas
 * as três regiões nunca se sobrepõem nem encostam na borda.
 */
function placeRegions(definition: WorldDefinition, random: SeededRandom): Regions {
  const center = { x: Math.floor(definition.width / 2), z: Math.floor(definition.depth / 2) };
  const distance = Math.min(definition.width, definition.depth) * REGION_DISTANCE;
  const start = random.next() * Math.PI * 2;
  const around = (turn: number, radius: number): ColumnPoint => {
    const angle = start + turn * ((Math.PI * 2) / 3) + (random.next() - 0.5) * 0.6;
    const margin = definition.terrain.edgeWidth + radius + 2;

    return {
      x: clamp(Math.round(center.x + Math.cos(angle) * distance), margin, definition.width - 1 - margin),
      z: clamp(Math.round(center.z + Math.sin(angle) * distance), margin, definition.depth - 1 - margin),
    };
  };

  return {
    farm: center,
    lake: around(0, definition.lake.radius),
    forest: around(1, 4),
    quarry: around(2, definition.quarry.radius),
  };
}

/** Riacho do lago até a borda mais próxima, serpenteando. Devolve as colunas de água. */
function carveRiver(definition: WorldDefinition, lake: ColumnPoint, random: SeededRandom): Uint8Array {
  const mask = new Uint8Array(definition.width * definition.depth);
  const towardEdge = nearestEdgeDirection(definition, lake);
  const sideways = { x: -towardEdge.z, z: towardEdge.x };
  const phase = random.next() * Math.PI * 2;
  const halfWidth = definition.river.width / 2;

  for (let step = 0; step < Math.max(definition.width, definition.depth); step += 0.5) {
    const sway = Math.sin(step * 0.15 + phase) * definition.river.meander * Math.min(1, step / 10);
    const x = lake.x + towardEdge.x * step + sideways.x * sway;
    const z = lake.z + towardEdge.z * step + sideways.z * sway;

    if (x < 0 || z < 0 || x >= definition.width || z >= definition.depth) {
      break;
    }

    for (let dz = -Math.ceil(halfWidth); dz <= Math.ceil(halfWidth); dz += 1) {
      for (let dx = -Math.ceil(halfWidth); dx <= Math.ceil(halfWidth); dx += 1) {
        const cellX = Math.round(x) + dx;
        const cellZ = Math.round(z) + dz;

        if (Math.hypot(dx, dz) <= halfWidth + 0.25 && cellX >= 0 && cellZ >= 0 && cellX < definition.width && cellZ < definition.depth) {
          mask[cellZ * definition.width + cellX] = 1;
        }
      }
    }
  }

  return mask;
}

function nearestEdgeDirection(definition: WorldDefinition, point: ColumnPoint): ColumnPoint {
  const options: readonly (readonly [number, ColumnPoint])[] = [
    [point.x, { x: -1, z: 0 }],
    [definition.width - 1 - point.x, { x: 1, z: 0 }],
    [point.z, { x: 0, z: -1 }],
    [definition.depth - 1 - point.z, { x: 0, z: 1 }],
  ];

  return options.reduce((best, option) => (option[0] < best[0] ? option : best))[1];
}

/** Altura do chão de cada coluna, já com fazenda plana, lago, riacho, pedreira e mar na borda. */
function shapeTerrain(definition: WorldDefinition, regions: Regions, river: Uint8Array, noise: ValueNoise): Int16Array {
  const { width, depth, seaLevel, terrain } = definition;
  const heights = new Int16Array(width * depth);

  for (let z = 0; z < depth; z += 1) {
    for (let x = 0; x < width; x += 1) {
      let height = terrain.baseHeight + noise.fractal(x / terrain.hillScale, z / terrain.hillScale) * terrain.hillAmplitude;

      const farmBlend = smoothstep(definition.farm.radius + 6, definition.farm.radius, distance(x, z, regions.farm));
      height = lerp(height, terrain.baseHeight, farmBlend);

      height += smoothstep(definition.quarry.radius, definition.quarry.radius * 0.3, distance(x, z, regions.quarry)) * definition.quarry.height;

      const lakeDistance = distance(x, z, regions.lake);
      const lakeRadius = definition.lake.radius;

      if (lakeDistance < lakeRadius + 3) {
        const bowl = lakeDistance < lakeRadius ? definition.lake.depth * (1 - (lakeDistance / lakeRadius) ** 2) : 0;
        height = lerp(height, seaLevel - Math.max(1, bowl), smoothstep(lakeRadius + 3, lakeRadius - 1, lakeDistance));
      }

      if (river[z * width + x] === 1) {
        height = Math.min(height, seaLevel - 1.5);
      } else if (isNextToRiver(river, width, depth, x, z)) {
        height = Math.min(height, seaLevel + 0.4);
      }

      const fromEdge = Math.min(x, z, width - 1 - x, depth - 1 - z);

      if (fromEdge < terrain.edgeWidth) {
        height = lerp(height, seaLevel - 4, smoothstep(0, 1, 1 - fromEdge / terrain.edgeWidth));
      }

      heights[z * width + x] = clamp(Math.round(height), 2, definition.height - 12);
    }
  }

  return heights;
}

function isNextToRiver(river: Uint8Array, width: number, depth: number, x: number, z: number): boolean {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const nz = z + dz;

    if (nx >= 0 && nz >= 0 && nx < width && nz < depth && river[nz * width + nx] === 1) {
      return true;
    }
  }

  return false;
}

function fillColumns(
  world: VoxelWorld,
  definition: WorldDefinition,
  blocks: BlockNumbers,
  regions: Regions,
  heights: Int16Array,
  river: Uint8Array,
  random: SeededRandom,
): void {
  const { width, depth, seaLevel } = definition;

  for (let z = 0; z < depth; z += 1) {
    for (let x = 0; x < width; x += 1) {
      const height = heights[z * width + x];
      const quarryDistance = distance(x, z, regions.quarry);
      const isQuarry = quarryDistance < definition.quarry.radius * 0.8;
      const isUnderwater = height < seaLevel;
      const isShore =
        height <= seaLevel + 1 &&
        (distance(x, z, regions.lake) < definition.lake.radius + 2.5 ||
          isNextToRiver(river, width, depth, x, z) ||
          Math.min(x, z, width - 1 - x, depth - 1 - z) < definition.terrain.edgeWidth + 1);

      world.fill(x, 0, z, blocks.bedrock);

      for (let y = 1; y <= height; y += 1) {
        const depthBelowTop = height - y;
        let block = blocks.stone;

        if (!isQuarry && depthBelowTop <= 3) {
          if (isUnderwater) {
            block = depthBelowTop === 0 && height < seaLevel - 2 ? blocks.gravel : depthBelowTop <= 1 ? blocks.sand : blocks.soil;
          } else if (isShore) {
            block = depthBelowTop <= 1 ? blocks.sand : blocks.soil;
          } else {
            block = depthBelowTop === 0 ? blocks.surface : blocks.soil;
          }
        }

        if (block === blocks.stone) {
          block = pickOre(blocks, y, quarryDistance < definition.quarry.radius + 2, random) ?? block;
        }

        world.fill(x, y, z, block);
      }

      for (let y = height + 1; y <= seaLevel; y += 1) {
        world.fill(x, y, z, blocks.water);
      }
    }
  }
}

/**
 * Espalha os minérios raros pela pedra que sobrou. Cada um usa um sorteio só
 * dele, fora da sequência principal: o resto do mundo sai idêntico ao de antes.
 */
function scatterRareOres(
  world: VoxelWorld,
  definition: WorldDefinition,
  blocks: BlockNumbers,
  regions: Regions,
  heights: Int16Array,
  seed: number,
): void {
  const { width, depth } = definition;

  blocks.rareOres.forEach((ore, index) => {
    const random = new SeededRandom(seed ^ Math.imul(RARE_ORE_SALT, index + 1));

    for (let z = 0; z < depth; z += 1) {
      for (let x = 0; x < width; x += 1) {
        const chance = ore.chance * (distance(x, z, regions.quarry) < definition.quarry.radius + 2 ? 1 : UNDERGROUND_ORE_FACTOR);
        const top = Math.min(heights[z * width + x], ore.maxY);

        for (let y = 1; y <= top; y += 1) {
          if (world.get(x, y, z) === blocks.stone && random.chance(chance)) {
            world.fill(x, y, z, ore.block);
          }
        }
      }
    }
  });
}

function pickOre(blocks: BlockNumbers, y: number, isQuarry: boolean, random: SeededRandom): number | null {
  const factor = isQuarry ? 1 : UNDERGROUND_ORE_FACTOR;

  for (const ore of blocks.ores) {
    if (y <= ore.maxY && random.chance(ore.chance * factor)) {
      return ore.block;
    }
  }

  return null;
}

interface HousePlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Casa no norte da fazenda, sobre uma base de terra no nível do chão mais alto do terreno. */
function buildHouse(
  world: VoxelWorld,
  writer: BlockWriter,
  catalog: CraftCatalog,
  definition: WorldDefinition,
  farm: ColumnPoint,
  heights: Int16Array,
): HousePlacement {
  const size = structureSize(definition.house);
  const originX = farm.x - Math.floor(size.width / 2);
  const originZ = farm.z - definition.farm.radius + 1;
  let ground = 0;

  for (let z = originZ; z < originZ + size.depth; z += 1) {
    for (let x = originX; x < originX + size.width; x += 1) {
      ground = Math.max(ground, heights[z * definition.width + x]);
    }
  }

  const soil = catalog.blockNumber(definition.blocks.soil);

  for (let z = originZ - 1; z <= originZ + size.depth + 2; z += 1) {
    for (let x = originX - 1; x <= originX + size.width; x += 1) {
      for (let y = 1; y < ground; y += 1) {
        if (world.get(x, y, z) === AIR || world.get(x, y, z) === catalog.blockNumber(definition.blocks.water)) {
          world.fill(x, y, z, soil);
        }
      }

      for (let y = ground + 1; y < ground + size.height + 2; y += 1) {
        world.fill(x, y, z, AIR);
      }
    }
  }

  placeStructure(writer, catalog, definition.house, originX, ground, originZ);

  return { x: originX, y: ground, z: originZ };
}

/** Horta pronta ao sul da casa: um rego de água no meio e terra arada dos dois lados. */
function buildFarmPlot(world: VoxelWorld, definition: WorldDefinition, blocks: BlockNumbers, farm: ColumnPoint, house: HousePlacement): void {
  const rowZ = Math.min(farm.z + 2, farm.z + definition.farm.radius - 3);
  const halfLength = Math.min(3, definition.farm.radius - 2);

  for (let x = farm.x - halfLength; x <= farm.x + halfLength; x += 1) {
    world.fill(x, house.y, rowZ, blocks.water);
    world.fill(x, house.y + 1, rowZ, AIR);

    for (const side of [rowZ - 1, rowZ + 1]) {
      world.fill(x, house.y, side, blocks.farmland);
      world.fill(x, house.y + 1, side, AIR);
    }
  }
}

function plantTrees(
  world: VoxelWorld,
  writer: BlockWriter,
  catalog: CraftCatalog,
  definition: WorldDefinition,
  blocks: BlockNumbers,
  regions: Regions,
  house: HousePlacement,
  random: SeededRandom,
): void {
  const keepClear = definition.farm.radius + 3;

  for (let z = 2; z < definition.depth - 2; z += 1) {
    for (let x = 2; x < definition.width - 2; x += 1) {
      const forestDistance = distance(x, z, regions.forest);
      const chance =
        forestDistance < definition.forest.radius
          ? definition.forest.treeChance * (1 - (forestDistance / definition.forest.radius) * 0.5)
          : STRAY_TREE_CHANCE;

      if (!random.chance(chance) || distance(x, z, regions.farm) < keepClear || distance(x, z, house) < keepClear) {
        continue;
      }

      const ground = world.topY(x, z);

      if (world.get(x, ground, z) !== blocks.surface || hasLogNearby(world, blocks.log, x, ground + 1, z)) {
        continue;
      }

      const height = random.integer(definition.tree.minHeight, definition.tree.maxHeight);

      placeTree(writer, catalog, x, ground + 1, z, { log: blocks.log, leaves: blocks.leaves, height }, random);
    }
  }
}

function hasLogNearby(world: VoxelWorld, log: number, x: number, y: number, z: number): boolean {
  for (let dz = -2; dz <= 2; dz += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (world.get(x + dx, y, z + dz) === log) {
        return true;
      }
    }
  }

  return false;
}

function scatterDecorations(world: VoxelWorld, definition: WorldDefinition, blocks: BlockNumbers, random: SeededRandom): void {
  for (let z = 0; z < definition.depth; z += 1) {
    for (let x = 0; x < definition.width; x += 1) {
      const ground = world.topY(x, z);

      if (world.get(x, ground, z) === blocks.surface && random.chance(definition.decorationChance)) {
        world.fill(x, ground + 1, z, random.pick(blocks.decorations));
      }
    }
  }
}

function distance(x: number, z: number, point: ColumnPoint): number {
  return Math.hypot(x - point.x, z - point.z);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
