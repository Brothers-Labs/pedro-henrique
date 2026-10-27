import {
  BLOCK_INTERACTIONS,
  BLOCK_SHAPES,
  type BlockDefinition,
  type BlockFaces,
  CONTENT_SCHEMA_VERSION,
  TEXTURE_DETAILS,
  TEXTURE_PATTERNS,
  type TextureSpec,
  TOOL_TYPES,
} from '../../models/content.model';
import { colorList, ensureUniqueIds, JsonReader, type JsonObjectReader, optionalId, readSchemaVersion } from '../json-reader';

/** Maior nível de ferramenta que existe (ouro). */
export const MAX_TOOL_TIER = 4;

const MAX_LIGHT = 15;

export function parseBlocks(value: unknown): readonly BlockDefinition[] {
  const root = JsonReader.root('blocks', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const blocks = root.field('blocks').array({ minLength: 1 }).map((entry) => parseBlock(entry.object()));

  ensureUniqueIds('blocks', 'Bloco', blocks.map((block) => block.id));

  return blocks;
}

function parseBlock(block: JsonObjectReader): BlockDefinition {
  const hardness = block.optionalField('hardness')?.number({ min: 0, max: 60 }) ?? null;

  return {
    id: block.field('id').id(),
    name: block.field('name').string(),
    shape: block.field('shape').oneOf(BLOCK_SHAPES),
    solid: block.field('solid').boolean(),
    transparent: block.field('transparent').boolean(),
    hardness,
    tool: block.optionalField('tool')?.oneOf(TOOL_TYPES) ?? null,
    minTier: block.optionalField('minTier')?.number({ integer: true, min: 0, max: MAX_TOOL_TIER }) ?? 0,
    drops: optionalId(block, 'drops'),
    light: block.optionalField('light')?.number({ integer: true, min: 0, max: MAX_LIGHT }) ?? 0,
    collisionHeight: block.optionalField('collisionHeight')?.number({ min: 0.1, max: 1.5 }) ?? 1,
    replaceable: block.optionalField('replaceable')?.boolean() ?? false,
    pairsVertically: block.optionalField('pairsVertically')?.boolean() ?? false,
    toggleInto: optionalId(block, 'toggleInto'),
    interaction: block.optionalField('interaction')?.oneOf(BLOCK_INTERACTIONS) ?? null,
    mapColor: block.field('mapColor').color(),
    textures: parseFaces(block.field('textures').object()),
  };
}

/**
 * Faces do bloco.
 *
 * `all` vale para as seis faces; `top`, `side` e `bottom` trocam só a sua.
 * É o que deixa a grama ter topo verde e lado de terra sem repetir a terra três vezes.
 */
function parseFaces(textures: JsonObjectReader): BlockFaces {
  const all = textures.optionalField('all');
  const fallback = all ? parseTexture(all.object()) : null;
  const face = (name: 'top' | 'side' | 'bottom'): TextureSpec => {
    const own = textures.optionalField(name);

    if (own) {
      return parseTexture(own.object());
    }

    return fallback ?? textures.fail(`falta "all" ou "${name}"`);
  };

  return { top: face('top'), side: face('side'), bottom: face('bottom') };
}

export function parseTexture(texture: JsonObjectReader): TextureSpec {
  return {
    pattern: texture.field('pattern').oneOf(TEXTURE_PATTERNS),
    colors: colorList(texture.field('colors')),
    detail: texture.optionalField('detail')?.oneOf(TEXTURE_DETAILS) ?? null,
  };
}
