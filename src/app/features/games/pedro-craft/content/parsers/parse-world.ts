import {
  CONTENT_SCHEMA_VERSION,
  type OreVein,
  type SeasonDefinition,
  type StructureTemplate,
  type WorldBlocks,
  type WorldDefinition,
} from '../../models/content.model';
import { JsonReader, type JsonObjectReader, readSchemaVersion } from '../json-reader';
import { parseAmount } from './parse-recipes';

/** Letra das construções que significa "ar": nunca pode ser usada na legenda. */
export const STRUCTURE_AIR = '.';

/** Teto do mundo: o `Uint8Array` do motor e a malha foram pensados para mundos pequenos. */
const MAX_DIMENSION = 256;
const MAX_HEIGHT = 64;

export function parseWorld(value: unknown): WorldDefinition {
  const root = JsonReader.root('world', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const chunkSize = root.field('chunkSize').number({ integer: true, min: 8, max: 32 });
  const width = root.field('width').number({ integer: true, min: chunkSize, max: MAX_DIMENSION });
  const depth = root.field('depth').number({ integer: true, min: chunkSize, max: MAX_DIMENSION });
  const height = root.field('height').number({ integer: true, min: 16, max: MAX_HEIGHT });
  const seaLevel = root.field('seaLevel').number({ integer: true, min: 2, max: height - 8 });

  if (width % chunkSize !== 0 || depth % chunkSize !== 0) {
    root.fail(`width e depth precisam ser múltiplos de chunkSize (${chunkSize})`);
  }

  const terrain = root.field('terrain').object();
  const lake = root.field('lake').object();
  const river = root.field('river').object();
  const forest = root.field('forest').object();
  const quarry = root.field('quarry').object();
  const tree = root.field('tree').object();
  const clock = root.field('clock').object();
  const calendar = root.field('calendar').object();
  const water = root.field('water').object();
  const creatures = root.field('creatures').object();
  const hero = root.field('hero').object();
  const baseHeight = terrain.field('baseHeight').number({ integer: true, min: seaLevel, max: height - 12 });

  if (tree.field('maxHeight').number() < tree.field('minHeight').number()) {
    tree.fail('maxHeight não pode ser menor que minHeight');
  }

  if (creatures.field('maxSpawnDistance').number() <= creatures.field('minSpawnDistance').number()) {
    creatures.fail('maxSpawnDistance precisa ser maior que minSpawnDistance');
  }

  return {
    width,
    depth,
    height,
    chunkSize,
    seaLevel,
    blocks: parseWorldBlocks(root.field('blocks').object()),
    terrain: {
      baseHeight,
      hillAmplitude: terrain.field('hillAmplitude').number({ min: 0, max: height - baseHeight - 4 }),
      hillScale: terrain.field('hillScale').number({ min: 4, max: 200 }),
      edgeWidth: terrain.field('edgeWidth').number({ integer: true, min: 1, max: 16 }),
    },
    lake: {
      radius: lake.field('radius').number({ integer: true, min: 2, max: 32 }),
      depth: lake.field('depth').number({ integer: true, min: 1, max: 8 }),
    },
    river: {
      width: river.field('width').number({ integer: true, min: 1, max: 6 }),
      meander: river.field('meander').number({ min: 0, max: 20 }),
    },
    forest: {
      radius: forest.field('radius').number({ integer: true, min: 4, max: 48 }),
      treeChance: forest.field('treeChance').number({ min: 0, max: 0.2 }),
    },
    quarry: {
      radius: quarry.field('radius').number({ integer: true, min: 3, max: 32 }),
      height: quarry.field('height').number({ integer: true, min: 1, max: 16 }),
      ores: quarry.field('ores').array().map((ore) => parseOre(ore.object(), height)),
    },
    farm: { radius: root.field('farm').object().field('radius').number({ integer: true, min: 3, max: 24 }) },
    tree: {
      minHeight: tree.field('minHeight').number({ integer: true, min: 3, max: 10 }),
      maxHeight: tree.field('maxHeight').number({ integer: true, min: 3, max: 10 }),
    },
    decorationChance: root.field('decorationChance').number({ min: 0, max: 0.5 }),
    house: parseStructure(root.field('house').object()),
    clock: {
      dayMs: clock.field('dayMs').number({ integer: true, min: 10_000 }),
      nightMs: clock.field('nightMs').number({ integer: true, min: 10_000 }),
    },
    calendar: {
      daysPerSeason: calendar.field('daysPerSeason').number({ integer: true, min: 1, max: 60 }),
      greenhouseBlock: calendar.field('greenhouseBlock').id(),
      fullMoonEvery: calendar.field('fullMoonEvery').number({ integer: true, min: 2, max: 60 }),
      fullMoonVisitor: calendar.optionalField('fullMoonVisitor')?.id() ?? null,
      seasons: calendar.field('seasons').array({ minLength: 1 }).map((season) => parseSeason(season.object())),
    },
    water: {
      maxSpread: water.field('maxSpread').number({ integer: true, min: 1, max: 7 }),
      tickMs: water.field('tickMs').number({ integer: true, min: 50, max: 5000 }),
    },
    creatures: {
      passiveCap: creatures.field('passiveCap').number({ integer: true, min: 0, max: 40 }),
      hostileCap: creatures.field('hostileCap').number({ integer: true, min: 0, max: 40 }),
      spawnIntervalMs: creatures.field('spawnIntervalMs').number({ integer: true, min: 250 }),
      minSpawnDistance: creatures.field('minSpawnDistance').number({ min: 4, max: 64 }),
      maxSpawnDistance: creatures.field('maxSpawnDistance').number({ min: 8, max: 128 }),
      torchSafeRadius: creatures.field('torchSafeRadius').number({ min: 0, max: 32 }),
    },
    hero: {
      maxHealth: hero.field('maxHealth').number({ integer: true, min: 1, max: 20 }),
      regenEveryMs: hero.field('regenEveryMs').number({ integer: true, min: 500 }),
      reach: hero.field('reach').number({ min: 2, max: 8 }),
      invulnerableMs: hero.field('invulnerableMs').number({ integer: true, min: 0, max: 5000 }),
      energy: parseEnergy(hero.field('energy').object()),
      startingInventory: hero.field('startingInventory').array().map((entry) => parseAmount(entry.object())),
    },
  };
}

function parseWorldBlocks(blocks: JsonObjectReader): WorldBlocks {
  return {
    surface: blocks.field('surface').id(),
    soil: blocks.field('soil').id(),
    stone: blocks.field('stone').id(),
    sand: blocks.field('sand').id(),
    gravel: blocks.field('gravel').id(),
    water: blocks.field('water').id(),
    flowingWater: blocks.field('flowingWater').id(),
    bedrock: blocks.field('bedrock').id(),
    log: blocks.field('log').id(),
    leaves: blocks.field('leaves').id(),
    farmland: blocks.field('farmland').id(),
    decorations: blocks.field('decorations').array().map((block) => block.id()),
  };
}

function parseOre(ore: JsonObjectReader, height: number): OreVein {
  return {
    block: ore.field('block').id(),
    chance: ore.field('chance').number({ min: 0, max: 0.5 }),
    maxY: ore.field('maxY').number({ integer: true, min: 1, max: height - 1 }),
  };
}

function parseStructure(structure: JsonObjectReader): StructureTemplate {
  const palette = Object.fromEntries(
    structure
      .field('palette')
      .object()
      .entries()
      .map(([symbol, block]) => [symbol, block.id()] as const),
  );

  for (const symbol of Object.keys(palette)) {
    if (symbol.length !== 1 || symbol === STRUCTURE_AIR) {
      structure.fail(`a legenda "${symbol}" deve ser uma única letra diferente de "${STRUCTURE_AIR}"`);
    }
  }

  const layers = structure
    .field('layers')
    .array({ minLength: 1 })
    .map((layer) => layer.array({ minLength: 1 }).map((row) => row.string()));
  const rowLength = layers[0][0].length;

  for (const layer of layers) {
    if (layer.length !== layers[0].length || layer.some((row) => row.length !== rowLength)) {
      structure.fail('todas as camadas precisam ter o mesmo número de linhas e de colunas');
    }

    for (const symbol of layer.join('')) {
      if (symbol !== STRUCTURE_AIR && !Object.hasOwn(palette, symbol)) {
        structure.fail(`a letra "${symbol}" da construção não está na legenda`);
      }
    }
  }

  return { palette, layers };
}

function parseSeason(season: JsonObjectReader): SeasonDefinition {
  return {
    id: season.field('id').id(),
    name: season.field('name').string(),
    emoji: season.field('emoji').string(),
    arrival: season.field('arrival').string(),
    dayScale: season.field('dayScale').number({ min: 0.3, max: 3 }),
    nightScale: season.field('nightScale').number({ min: 0.3, max: 3 }),
    growth: season.field('growth').number({ min: 0, max: 5 }),
    rain: season.field('rain').number({ min: 0, max: 1 }),
    snow: season.field('snow').number({ min: 0, max: 1 }),
    palette: Object.fromEntries(season.field('palette').object().entries().map(([from, to]) => [checkColor(season, from), to.color()])),
  };
}

/** A chave da paleta também é uma cor: a que existe hoje nas texturas. */
function checkColor(season: JsonObjectReader, color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    season.fail(`a cor "${color}" da paleta não está no formato #rrggbb`);
  }

  return color.toLowerCase();
}

function parseEnergy(energy: JsonObjectReader): WorldDefinition['hero']['energy'] {
  const max = energy.field('max').number({ integer: true, min: 1, max: 20 });

  return {
    max,
    drainEveryMs: energy.field('drainEveryMs').number({ integer: true, min: 10_000 }),
    lowAt: energy.field('lowAt').number({ integer: true, min: 0, max }),
  };
}
