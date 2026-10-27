import { CONTENT_SCHEMA_VERSION, type CropDefinition, type CropMaturity } from '../../models/content.model';
import { ensureUniqueIds, JsonReader, type JsonObjectReader, readSchemaVersion } from '../json-reader';

export function parseCrops(value: unknown): readonly CropDefinition[] {
  const root = JsonReader.root('crops', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const crops = root.field('crops').array({ minLength: 1 }).map((entry) => parseCrop(entry.object()));

  ensureUniqueIds('crops', 'Plantação', crops.map((crop) => crop.id));
  ensureUniqueIds('crops', 'Bloco de plantação', crops.map((crop) => crop.block));
  ensureUniqueIds('crops', 'Semente', crops.map((crop) => crop.seed));

  return crops;
}

function parseCrop(crop: JsonObjectReader): CropDefinition {
  return {
    id: crop.field('id').id(),
    name: crop.field('name').string(),
    block: crop.field('block').id(),
    seed: crop.field('seed').id(),
    stages: crop.field('stages').number({ integer: true, min: 1, max: 8 }),
    stageMs: crop.field('stageMs').number({ integer: true, min: 1000 }),
    wateredSpeedup: crop.optionalField('wateredSpeedup')?.number({ min: 1, max: 5 }) ?? 1,
    soil: crop.field('soil').array({ minLength: 1 }).map((block) => block.id()),
    mature: parseMaturity(crop.field('mature').object()),
  };
}

function parseMaturity(mature: JsonObjectReader): CropMaturity {
  const type = mature.field('type').oneOf(['harvest', 'tree'] as const);

  if (type === 'harvest') {
    return { type, loot: mature.field('loot').id() };
  }

  const minHeight = mature.field('minHeight').number({ integer: true, min: 3, max: 10 });
  const maxHeight = mature.field('maxHeight').number({ integer: true, min: 3, max: 10 });

  if (maxHeight < minHeight) {
    mature.fail('maxHeight não pode ser menor que minHeight');
  }

  return { type, log: mature.field('log').id(), leaves: mature.field('leaves').id(), minHeight, maxHeight };
}
