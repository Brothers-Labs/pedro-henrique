import {
  CONTENT_SCHEMA_VERSION,
  CREATURE_BEHAVIORS,
  CREATURE_MODELS,
  type CreatureDefinition,
  type CreatureInteraction,
  type CreatureSpawn,
  TEMPERAMENTS,
} from '../../models/content.model';
import { isHeroId } from '../../../pedro-maker/config/hero.config';
import type { HeroId } from '../../../pedro-maker/models/progress.model';
import { colorList, ensureUniqueIds, JsonReader, type JsonObjectReader, optionalId, readSchemaVersion } from '../json-reader';
import { parseExplosion } from './parse-blocks';

/** Filhote vira adulto em cinco minutos de jogo, se o JSON não disser outra coisa. */
const DEFAULT_BABY_GROW_MS = 5 * 60 * 1000;

export function parseCreatures(value: unknown): readonly CreatureDefinition[] {
  const root = JsonReader.root('creatures', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const creatures = root.field('creatures').array({ minLength: 1 }).map((entry) => parseCreature(entry.object()));

  ensureUniqueIds('creatures', 'Criatura', creatures.map((creature) => creature.id));

  return creatures;
}

function parseCreature(creature: JsonObjectReader): CreatureDefinition {
  const spawn = creature.optionalField('spawn');
  const split = creature.optionalField('splitInto')?.object() ?? null;
  const lays = creature.optionalField('lays')?.object() ?? null;
  const explodes = creature.optionalField('explodes')?.object() ?? null;
  const model = creature.field('model').oneOf(CREATURE_MODELS);

  return {
    id: creature.field('id').id(),
    name: creature.field('name').string(),
    temperament: creature.field('temperament').oneOf(TEMPERAMENTS),
    health: creature.field('health').number({ integer: true, min: 1, max: 100 }),
    speed: creature.field('speed').number({ min: 0.1, max: 10 }),
    damage: creature.optionalField('damage')?.number({ integer: true, min: 0, max: 10 }) ?? 0,
    attackCooldownMs: creature.optionalField('attackCooldownMs')?.number({ integer: true, min: 200 }) ?? 1000,
    behavior: creature.field('behavior').oneOf(CREATURE_BEHAVIORS),
    model,
    colors: colorList(creature.field('colors')),
    width: creature.field('width').number({ min: 0.2, max: 2 }),
    height: creature.field('height').number({ min: 0.2, max: 2.5 }),
    drops: optionalId(creature, 'drops'),
    spawn: spawn ? parseSpawn(spawn.object()) : null,
    splitInto: split
      ? { creature: split.field('creature').id(), count: split.field('count').number({ integer: true, min: 1, max: 4 }) }
      : null,
    interactions: (creature.optionalField('interactions')?.array() ?? []).map((entry) => parseInteraction(entry.object())),
    lays: lays ? { item: lays.field('item').id(), everyMs: lays.field('everyMs').number({ integer: true, min: 1000 }) } : null,
    breedsWith: optionalId(creature, 'breedsWith'),
    babyGrowMs: creature.optionalField('babyGrowMs')?.number({ integer: true, min: 10000 }) ?? DEFAULT_BABY_GROW_MS,
    explodes: explodes ? parseExplosion(explodes) : null,
    greeting: creature.optionalField('greeting')?.string() ?? null,
    hero: parseHero(creature, model === 'maker-hero'),
  };
}

/** O boneco do Maker precisa dizer qual herói é; os outros modelos não têm herói. */
function parseHero(creature: JsonObjectReader, isMakerHero: boolean): HeroId | null {
  const field = creature.optionalField('hero');

  if (!isMakerHero) {
    if (field) {
      creature.fail('só o modelo "maker-hero" tem "hero"');
    }

    return null;
  }

  const hero = field?.string() ?? creature.fail('o modelo "maker-hero" precisa de "hero"');

  return isHeroId(hero) ? hero : creature.fail(`"${hero}" não é um herói do Pedro Maker`);
}

function parseSpawn(spawn: JsonObjectReader): CreatureSpawn {
  const groupMin = spawn.field('groupMin').number({ integer: true, min: 1, max: 6 });
  const groupMax = spawn.field('groupMax').number({ integer: true, min: 1, max: 6 });

  if (groupMax < groupMin) {
    spawn.fail('groupMax não pode ser menor que groupMin');
  }

  return {
    period: spawn.field('period').oneOf(['day', 'night'] as const),
    on: spawn.field('on').array({ minLength: 1 }).map((block) => block.id()),
    groupMin,
    groupMax,
    weight: spawn.field('weight').number({ min: 0.1, max: 100 }),
  };
}

function parseInteraction(interaction: JsonObjectReader): CreatureInteraction {
  const parsed: CreatureInteraction = {
    item: interaction.field('item').id(),
    loot: optionalId(interaction, 'loot'),
    convertsItemTo: optionalId(interaction, 'convertsItemTo'),
    cooldownMs: interaction.optionalField('cooldownMs')?.number({ integer: true, min: 0 }) ?? 0,
  };

  if (parsed.loot === null && parsed.convertsItemTo === null) {
    interaction.fail('a interação precisa de "loot" ou "convertsItemTo"');
  }

  return parsed;
}
