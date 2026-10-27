import {
  CONTENT_SCHEMA_VERSION,
  type GoalDefinition,
  GOAL_TRIGGERS,
  type LootEntry,
  type LootTable,
} from '../../models/content.model';
import { ensureUniqueIds, JsonReader, type JsonObjectReader, optionalId, readSchemaVersion } from '../json-reader';

export function parseLootTables(value: unknown): readonly LootTable[] {
  const root = JsonReader.root('loot-tables', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const tables = root
    .field('lootTables')
    .array({ minLength: 1 })
    .map((entry) => {
      const table = entry.object();

      return {
        id: table.field('id').id(),
        entries: table.field('entries').array().map((item) => parseLootEntry(item.object())),
      };
    });

  ensureUniqueIds('loot-tables', 'Tabela de drop', tables.map((table) => table.id));

  return tables;
}

function parseLootEntry(entry: JsonObjectReader): LootEntry {
  const min = entry.optionalField('min')?.number({ integer: true, min: 1, max: 64 }) ?? 1;
  const max = entry.optionalField('max')?.number({ integer: true, min: 1, max: 64 }) ?? min;

  if (max < min) {
    entry.fail('max não pode ser menor que min');
  }

  return {
    item: entry.field('item').id(),
    min,
    max,
    chance: entry.optionalField('chance')?.number({ min: 0, max: 1 }) ?? 1,
  };
}

export function parseGoals(value: unknown): readonly GoalDefinition[] {
  const root = JsonReader.root('goals', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const goals = root.field('goals').array().map((entry) => parseGoal(entry.object()));

  ensureUniqueIds('goals', 'Missão', goals.map((goal) => goal.id));

  return goals;
}

function parseGoal(goal: JsonObjectReader): GoalDefinition {
  const trigger = goal.field('trigger').oneOf(GOAL_TRIGGERS);
  const target = optionalId(goal, 'target');

  if ((trigger === 'sleep') !== (target === null)) {
    goal.fail(trigger === 'sleep' ? 'a missão de dormir não tem alvo' : `a missão "${trigger}" precisa de um alvo`);
  }

  return {
    id: goal.field('id').id(),
    title: goal.field('title').string(),
    emoji: goal.field('emoji').string(),
    hint: goal.field('hint').string(),
    trigger,
    target,
    count: goal.optionalField('count')?.number({ integer: true, min: 1, max: 999 }) ?? 1,
  };
}
