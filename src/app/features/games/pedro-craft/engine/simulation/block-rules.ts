import type { BlockDefinition, ItemAmount, LootTable, ToolStats, ToolType } from '../../models/content.model';

/** Segundos de dureza viram este tanto de milissegundos com a mão. */
const MS_PER_HARDNESS = 1000;

/** Sem a ferramenta mínima, a quebra demora isto a mais — e não dá item. */
const WRONG_TIER_SLOWDOWN = 3.5;

/** Nada quebra mais rápido que isto: o toque de quebrar o capim ainda dá para ver. */
const MIN_BREAK_MS = 50;

/** Nome da ferramenta já com o artigo certo: "uma picareta", "um machado". */
const TOOL_NAMES: Readonly<Record<ToolType, string>> = {
  pickaxe: 'uma picareta',
  axe: 'um machado',
  shovel: 'uma pá',
  hoe: 'uma enxada',
  sword: 'uma espada',
  shears: 'uma tesoura',
};

const TIER_NAMES: readonly string[] = ['', 'de madeira', 'de pedra', 'de ferro', 'de ouro'];

/** O bloco dá item com esta ferramenta? Bloco sem nível mínimo dá até com a mão. */
export function canHarvest(block: BlockDefinition, tool: ToolStats | null): boolean {
  return block.minTier === 0 || (tool !== null && tool.type === block.tool && tool.tier >= block.minTier);
}

/**
 * Tempo para quebrar, ou `null` quando o bloco não quebra (rocha-mãe, água).
 *
 * A ferramenta certa divide o tempo pela velocidade dela; faltar o nível
 * mínimo deixa tudo bem mais lento.
 */
export function breakDurationMs(block: BlockDefinition, tool: ToolStats | null): number | null {
  if (block.hardness === null) {
    return null;
  }

  let duration = block.hardness * MS_PER_HARDNESS;

  if (tool && tool.type === block.tool) {
    duration /= tool.speed;
  }

  if (!canHarvest(block, tool)) {
    duration *= WRONG_TIER_SLOWDOWN;
  }

  return Math.max(MIN_BREAK_MS, duration);
}

/** Frase para a criança quando o bloco pede uma ferramenta que ela não está usando. */
export function missingToolHint(block: BlockDefinition): string | null {
  if (block.minTier === 0 || block.tool === null) {
    return null;
  }

  return `Para pegar ${block.name.toLowerCase()}, use ${TOOL_NAMES[block.tool]} ${TIER_NAMES[block.minTier]} ou melhor.`;
}

/** Sorteia o que cai de uma tabela; cada entrada é sorteada sozinha. */
export function rollLoot(table: LootTable, random: () => number): readonly ItemAmount[] {
  const drops: ItemAmount[] = [];

  for (const entry of table.entries) {
    if (random() >= entry.chance) {
      continue;
    }

    const count = entry.min + Math.floor(random() * (entry.max - entry.min + 1));

    if (count > 0) {
      drops.push({ item: entry.item, count });
    }
  }

  return drops;
}
