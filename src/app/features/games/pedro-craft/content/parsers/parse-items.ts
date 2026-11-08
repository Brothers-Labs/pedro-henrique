import {
  type BucketStats,
  CONTENT_SCHEMA_VERSION,
  ICON_SHAPES,
  ITEM_KINDS,
  type ItemDefinition,
  type ItemIcon,
  type ItemKind,
  type RangedStats,
  type ToolStats,
  TOOL_TYPES,
  type VehicleStats,
} from '../../models/content.model';
import { colorList, ensureUniqueIds, JsonReader, type JsonObjectReader, optionalId, readSchemaVersion } from '../json-reader';
import { MAX_TOOL_TIER } from './parse-blocks';

/** Golpe com a mão vazia, ou com um item que não é arma. */
export const HAND_DAMAGE = 1;
export const HAND_ATTACK_COOLDOWN_MS = 400;
export const HAND_KNOCKBACK = 3;

export function parseItems(value: unknown): readonly ItemDefinition[] {
  const root = JsonReader.root('items', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const items = root.field('items').array({ minLength: 1 }).map((entry) => parseItem(entry.object()));

  ensureUniqueIds('items', 'Item', items.map((item) => item.id));

  return items;
}

function parseItem(item: JsonObjectReader): ItemDefinition {
  const tool = item.optionalField('tool');
  const ranged = item.optionalField('ranged');
  const bucket = item.optionalField('bucket');
  const durability = item.optionalField('durability')?.number({ integer: true, min: 1 }) ?? null;
  const maxStack = item.field('maxStack').number({ integer: true, min: 1, max: 64 });
  const kind = item.field('kind').oneOf(ITEM_KINDS);

  if (durability !== null && maxStack !== 1) {
    item.fail('item com durabilidade precisa de maxStack 1');
  }

  return {
    id: item.field('id').id(),
    name: item.field('name').string(),
    kind,
    maxStack,
    icon: parseIcon(item.field('icon').object()),
    places: optionalId(item, 'places'),
    plants: optionalId(item, 'plants'),
    tool: tool ? parseTool(tool.object()) : null,
    durability,
    damage: item.optionalField('damage')?.number({ min: 0, max: 20 }) ?? HAND_DAMAGE,
    attackCooldownMs: item.optionalField('attackCooldownMs')?.number({ integer: true, min: 100 }) ?? HAND_ATTACK_COOLDOWN_MS,
    knockback: item.optionalField('knockback')?.number({ min: 0, max: 20 }) ?? HAND_KNOCKBACK,
    ranged: ranged ? parseRanged(ranged.object()) : null,
    heal: item.optionalField('heal')?.number({ integer: true, min: 1, max: 20 }) ?? null,
    leftover: optionalId(item, 'leftover'),
    fertilizer: item.optionalField('fertilizer')?.number({ integer: true, min: 1, max: 3 }) ?? null,
    bucket: bucket ? parseBucket(bucket.object()) : null,
    vehicle: parseVehicle(item, kind),
    summons: parseSummons(item, kind),
  };
}

/** Só o item do tipo `summon` chama uma criatura, e ele sempre diz qual. */
function parseSummons(item: JsonObjectReader, kind: ItemKind): string | null {
  const summons = optionalId(item, 'summons');

  if ((kind === 'summon') !== (summons !== null)) {
    item.fail('item do tipo "summon" precisa de "summons", e só ele');
  }

  return summons;
}

/** Só o item do tipo `vehicle` anda no trilho, e ele sempre diz a velocidade. */
function parseVehicle(item: JsonObjectReader, kind: ItemKind): VehicleStats | null {
  const vehicle = item.optionalField('vehicle');

  if ((kind === 'vehicle') !== (vehicle !== null)) {
    item.fail('item do tipo "vehicle" precisa de "vehicle", e só ele');
  }

  return vehicle ? { speed: vehicle.object().field('speed').number({ min: 1, max: 20 }) } : null;
}

function parseIcon(icon: JsonObjectReader): ItemIcon {
  const type = icon.field('type').oneOf(['block', 'sprite'] as const);

  if (type === 'block') {
    return { type, block: icon.field('block').id() };
  }

  return { type, shape: icon.field('shape').oneOf(ICON_SHAPES), colors: colorList(icon.field('colors')) };
}

function parseTool(tool: JsonObjectReader): ToolStats {
  return {
    type: tool.field('type').oneOf(TOOL_TYPES),
    tier: tool.field('tier').number({ integer: true, min: 1, max: MAX_TOOL_TIER }),
    speed: tool.field('speed').number({ min: 1, max: 20 }),
  };
}

function parseRanged(ranged: JsonObjectReader): RangedStats {
  return {
    ammo: ranged.field('ammo').id(),
    damage: ranged.field('damage').number({ min: 1, max: 20 }),
    speed: ranged.field('speed').number({ min: 1, max: 60 }),
  };
}

function parseBucket(bucket: JsonObjectReader): BucketStats {
  const stats: BucketStats = {
    places: optionalId(bucket, 'places'),
    collects: optionalId(bucket, 'collects'),
    becomes: bucket.field('becomes').id(),
  };

  if ((stats.places === null) === (stats.collects === null)) {
    bucket.fail('balde precisa de exatamente um entre "places" e "collects"');
  }

  return stats;
}
