import {
  BLOCK_INTERACTIONS,
  BLOCK_SHAPES,
  type BlockDefinition,
  type BlockFaces,
  CIRCUIT_ROLES,
  type CircuitPart,
  CONTENT_SCHEMA_VERSION,
  type ExplosionSpec,
  type ExplosiveBlock,
  type PortalBlock,
  TEXTURE_DETAILS,
  TEXTURE_PATTERNS,
  type TextureDetail,
  type TextureSpec,
  TOOL_TYPES,
} from '../../models/content.model';
import { colorList, ensureUniqueIds, JsonReader, type JsonObjectReader, optionalId, readSchemaVersion } from '../json-reader';

/** Maior nível de ferramenta que existe (diamante). */
export const MAX_TOOL_TIER = 5;

const MAX_LIGHT = 15;

/** Pavio curto demais não dá tempo de correr; longo demais, a criança esquece que acendeu. */
const MIN_FUSE_MS = 500;
const MAX_FUSE_MS = 10_000;

/** A bomba nuclear: o raio dela abre uma cratera de mais da metade do mundo, e ainda sobra borda. */
const MAX_BLAST_RADIUS = 30;

/** Até três algarismos cabem na faixa da TNT: "500". */
const TEXTURE_LABEL = /^\d{1,3}$/;

export function parseBlocks(value: unknown): readonly BlockDefinition[] {
  const root = JsonReader.root('blocks', value).object();

  readSchemaVersion(root, CONTENT_SCHEMA_VERSION);

  const blocks = root.field('blocks').array({ minLength: 1 }).map((entry) => parseBlock(entry.object()));

  ensureUniqueIds('blocks', 'Bloco', blocks.map((block) => block.id));

  return blocks;
}

function parseBlock(block: JsonObjectReader): BlockDefinition {
  const hardness = block.optionalField('hardness')?.number({ min: 0, max: 60 }) ?? null;
  const explosive = block.optionalField('explosive')?.object() ?? null;
  const portal = block.optionalField('portal')?.object() ?? null;
  const circuit = block.optionalField('circuit')?.object() ?? null;

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
    blastResistant: block.optionalField('blastResistant')?.boolean() ?? false,
    explosive: explosive ? parseExplosive(explosive) : null,
    portal: portal ? parsePortal(portal) : null,
    circuit: circuit ? parseCircuit(circuit) : null,
    stacksInto: optionalId(block, 'stacksInto'),
    mapColor: block.field('mapColor').color(),
    textures: parseFaces(block.field('textures').object()),
  };
}

function parseExplosive(explosive: JsonObjectReader): ExplosiveBlock {
  return { ...parseExplosion(explosive), igniters: parseIgniters(explosive) };
}

function parsePortal(portal: JsonObjectReader): PortalBlock {
  return { frame: portal.field('frame').id(), igniters: parseIgniters(portal) };
}

/** A linha e a porta precisam do outro jeito para trocar; a alavanca não, quem a troca é o herói. */
function parseCircuit(circuit: JsonObjectReader): CircuitPart {
  const role = circuit.field('role').oneOf(CIRCUIT_ROLES);
  const switchesInto = optionalId(circuit, 'switchesInto');

  if ((role === 'source') !== (switchesInto === null)) {
    circuit.fail(role === 'source' ? 'a alavanca não tem "switchesInto": quem a troca é o "toggleInto"' : 'falta "switchesInto"');
  }

  return { role, powered: circuit.field('powered').boolean(), switchesInto };
}

/** Os itens que acendem: a TNT e o portal pedem pelo menos um, para não ficarem impossíveis de acender. */
function parseIgniters(owner: JsonObjectReader): readonly string[] {
  return owner.field('igniters').array({ minLength: 1 }).map((igniter) => igniter.id());
}

/** O estouro da TNT e do creeper: o mesmo formato nos dois arquivos. */
export function parseExplosion(explosion: JsonObjectReader): ExplosionSpec {
  return {
    fuseMs: explosion.field('fuseMs').number({ integer: true, min: MIN_FUSE_MS, max: MAX_FUSE_MS }),
    radius: explosion.field('radius').number({ min: 1, max: MAX_BLAST_RADIUS }),
    damage: explosion.field('damage').number({ integer: true, min: 1, max: 10 }),
    breaksBlocks: explosion.optionalField('breaksBlocks')?.boolean() ?? false,
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
  const detail = texture.optionalField('detail')?.oneOf(TEXTURE_DETAILS) ?? null;

  return {
    pattern: texture.field('pattern').oneOf(TEXTURE_PATTERNS),
    colors: colorList(texture.field('colors')),
    detail,
    label: parseLabel(texture, detail),
  };
}

/** O número só tem onde ser pintado na faixa da TNT. */
function parseLabel(texture: JsonObjectReader, detail: TextureDetail | null): string | null {
  const label = texture.optionalField('label');

  if (!label) {
    return null;
  }

  if (detail !== 'band') {
    return texture.fail('"label" só vale com o "detail" "band"');
  }

  const text = label.string();

  return TEXTURE_LABEL.test(text) ? text : label.fail('use de 1 a 3 algarismos, como "500"');
}
