import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { BlockDefinition, ItemDefinition } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import { type BlockProperties, SHAPE_CODE } from '../block-properties';
import { canHarvest, rollLoot } from './block-rules';
import type { ItemDrops } from './item-drops';
import type { PhysicsBody } from './physics-body';
import type { RayHit } from './raycast';
import type { VisualEvent } from './simulation-events';

/**
 * Parte do que a explosão quebra vira item no chão: o buraco não enche o
 * mundo de itens, e a criança ainda acha alguma coisa para recolher.
 */
const BLAST_DROP_CHANCE = 0.35;

/** Formas que precisam de chão firme embaixo: sem ele, caem junto. */
const NEEDS_SUPPORT: ReadonlySet<number> = new Set([SHAPE_CODE.cross, SHAPE_CODE.torch, SHAPE_CODE.rail, SHAPE_CODE.carpet]);

export interface BlockActionsContext {
  readonly catalog: CraftCatalog;
  readonly world: VoxelWorld;
  readonly properties: BlockProperties;
  readonly drops: ItemDrops;
  readonly random: () => number;
  visual(event: VisualEvent): void;
  /** Avisado quando um bloco é colocado: alimenta as missões. */
  placed(block: BlockDefinition): void;
  /** Avisado quando um bloco sai do mundo: o baú e a fornalha soltam o que guardavam. */
  removed(x: number, y: number, z: number): void;
  /** A planta madura da célula foi colhida: devolve a tabela da colheita, ou `null` se não havia o que colher. */
  harvest(x: number, y: number, z: number): string | null;
  /** Corpos que não podem ficar dentro de um bloco novo (o herói, as criaturas). */
  bodies(): readonly PhysicsBody[];
}

/**
 * O que o herói faz nos blocos: quebrar, colocar e usar.
 *
 * Separado da simulação para cada regra ficar pequena e testável: quem chama
 * decide quando (o botão, o tempo de quebra), e aqui se decide o quê.
 */
export class BlockActions {
  constructor(private readonly context: BlockActionsContext) {}

  /**
   * Quebra o bloco, solta o que ele dá e cuida do que dependia dele: a outra
   * metade da porta e a planta ou tocha em cima.
   */
  breakBlock(x: number, y: number, z: number, held: ItemDefinition | null): void {
    this.breakCell(x, y, z, held, true);
  }

  /**
   * A explosão quebra o que cabe na esfera em volta de (`centerX`, `centerY`,
   * `centerZ`). Fica o que não quebra (rocha-mãe, água) e o que aguenta
   * explosão (obsidiana); outra TNT não some: `ignite` acende o pavio dela.
   */
  blast(centerX: number, centerY: number, centerZ: number, radius: number, ignite: (x: number, y: number, z: number) => void): void {
    const { world, catalog, random } = this.context;
    const reach = Math.ceil(radius);
    const originX = Math.floor(centerX);
    const originY = Math.floor(centerY);
    const originZ = Math.floor(centerZ);

    for (let offsetY = -reach; offsetY <= reach; offsetY += 1) {
      for (let offsetZ = -reach; offsetZ <= reach; offsetZ += 1) {
        for (let offsetX = -reach; offsetX <= reach; offsetX += 1) {
          const x = originX + offsetX;
          const y = originY + offsetY;
          const z = originZ + offsetZ;
          const block = catalog.blockAt(world.get(x, y, z));

          if (!block || block.hardness === null || block.blastResistant || Math.hypot(offsetX, offsetY, offsetZ) > radius) {
            continue;
          }

          if (block.explosive) {
            ignite(x, y, z);
          } else {
            this.breakCell(x, y, z, null, random() < BLAST_DROP_CHANCE);
          }
        }
      }
    }
  }

  private breakCell(x: number, y: number, z: number, held: ItemDefinition | null, shouldDrop: boolean): void {
    const { world, catalog } = this.context;
    const number = world.get(x, y, z);
    const block = catalog.blockAt(number);

    if (!block) {
      return;
    }

    const harvest = this.context.harvest(x, y, z);

    world.set(x, y, z, AIR);
    this.context.visual({ type: 'block-broken', x, y, z, block: number });
    this.context.removed(x, y, z);

    if (block.pairsVertically) {
      this.removePartner(x, y, z, block);
    }

    if (shouldDrop) {
      this.dropFrom(block, x, y, z, held, harvest);
    }

    this.breakUnsupported(x, y + 1, z);
  }

  /** Coloca o bloco do item da mão na face mirada. Devolve se colocou. */
  place(hit: RayHit, item: ItemDefinition): boolean {
    return item.places ? this.placeBlock(hit, this.context.catalog.block(item.places)) : false;
  }

  /**
   * Coloca um bloco na face mirada: o do item da mão, a água do balde.
   *
   * Capim e água são substituíveis: mirar neles coloca o bloco no lugar deles.
   */
  placeBlock(hit: RayHit, block: BlockDefinition): boolean {
    const { world, properties } = this.context;
    const hitIsReplaceable = properties.isReplaceable[world.get(hit.x, hit.y, hit.z)] === 1;

    return hitIsReplaceable
      ? this.putBlock(hit.x, hit.y, hit.z, block)
      : this.putBlock(hit.x + hit.normalX, hit.y + hit.normalY, hit.z + hit.normalZ, block);
  }

  /** Planta em cima do solo da célula. Devolve se plantou. */
  plant(x: number, y: number, z: number, block: BlockDefinition): boolean {
    return this.putBlock(x, y + 1, z, block);
  }

  /** Passa a enxada: grama ou terra com ar em cima vira terra arada. Devolve se arou. */
  till(x: number, y: number, z: number): boolean {
    const { world, catalog } = this.context;
    const names = catalog.world.blocks;
    const ground = world.get(x, y, z);
    const isTillable = ground === catalog.blockNumber(names.surface) || ground === catalog.blockNumber(names.soil);

    return isTillable && world.get(x, y + 1, z) === AIR && world.set(x, y, z, catalog.blockNumber(names.farmland));
  }

  /** O balde recolhe o bloco da célula, se for o que ele pega (a nascente de água). Devolve se recolheu. */
  scoop(x: number, y: number, z: number, blockId: string): boolean {
    const { world, catalog } = this.context;

    return world.get(x, y, z) === catalog.blockNumber(blockId) && world.set(x, y, z, AIR);
  }

  private putBlock(x: number, y: number, z: number, block: BlockDefinition): boolean {
    const { world, catalog, properties } = this.context;
    const number = catalog.blockNumber(block.id);

    if (!this.isFree(x, y, z) || (block.pairsVertically && !this.isFree(x, y + 1, z))) {
      return false;
    }

    if (NEEDS_SUPPORT.has(properties.shape[number]) && !this.isSupport(x, y - 1, z)) {
      return false;
    }

    if (block.solid && this.blocksSomeone(x, y, z, block.pairsVertically ? 2 : 1)) {
      return false;
    }

    world.set(x, y, z, number);

    if (block.pairsVertically) {
      world.set(x, y + 1, z, number);
    }

    this.context.placed(block);

    return true;
  }

  /** Abre ou fecha a porta (as duas metades). Devolve se o bloco tinha o que fazer. */
  toggle(x: number, y: number, z: number): boolean {
    const { world, catalog } = this.context;
    const block = catalog.blockAt(world.get(x, y, z));

    if (!block?.toggleInto) {
      return false;
    }

    const next = catalog.blockNumber(block.toggleInto);
    const current = world.get(x, y, z);

    world.set(x, y, z, next);

    if (block.pairsVertically) {
      for (const partnerY of [y - 1, y + 1]) {
        if (world.get(x, partnerY, z) === current) {
          world.set(x, partnerY, z, next);
        }
      }
    }

    return true;
  }

  /** Solta o que o bloco dá; a planta madura solta a colheita (`harvest`) no lugar do drop de sempre. */
  private dropFrom(block: BlockDefinition, x: number, y: number, z: number, held: ItemDefinition | null, harvest: string | null): void {
    const { catalog, drops, random } = this.context;
    const tool = held?.tool ?? null;

    if (!canHarvest(block, tool)) {
      return;
    }

    // A tesoura colhe o próprio bloco (folhas, lã), em vez do que ele costuma soltar.
    const sheared = tool?.type === 'shears' && block.tool === 'shears' ? this.itemPlacing(block.id) : null;
    const table = harvest ?? block.drops;
    const loot = sheared ? [{ item: sheared, count: 1 }] : table ? rollLoot(catalog.lootTable(table), random) : [];

    for (const entry of loot) {
      drops.spawn(x + 0.5, y + 0.3, z + 0.5, { item: entry.item, count: entry.count, durability: null }, random);
    }
  }

  private removePartner(x: number, y: number, z: number, block: BlockDefinition): void {
    const { world, catalog } = this.context;

    for (const partnerY of [y - 1, y + 1]) {
      const partner = catalog.blockAt(world.get(x, partnerY, z));

      if (partner && (partner.id === block.id || partner.id === block.toggleInto)) {
        world.set(x, partnerY, z, AIR);
        return;
      }
    }
  }

  /** Planta, tocha, trilho ou tapete que ficou sem chão quebra junto, soltando o que dá. */
  private breakUnsupported(x: number, y: number, z: number): void {
    const { world, properties, catalog } = this.context;
    const number = world.get(x, y, z);

    if (!NEEDS_SUPPORT.has(properties.shape[number]) || this.isSupport(x, y - 1, z)) {
      return;
    }

    const block = catalog.blockAt(number);
    const harvest = this.context.harvest(x, y, z);

    world.set(x, y, z, AIR);

    if (block) {
      this.dropFrom(block, x, y, z, null, harvest);
    }
  }

  private itemPlacing(blockId: string): string | null {
    return this.context.catalog.items.find((item) => item.places === blockId)?.id ?? null;
  }

  private isFree(x: number, y: number, z: number): boolean {
    const { world, properties } = this.context;
    const current = world.get(x, y, z);

    return world.contains(x, y, z) && (current === AIR || properties.isReplaceable[current] === 1);
  }

  private isSupport(x: number, y: number, z: number): boolean {
    return this.context.properties.isOpaqueCube[this.context.world.get(x, y, z)] === 1;
  }

  /** Alguém ficaria preso dentro do bloco novo? */
  private blocksSomeone(x: number, y: number, z: number, height: number): boolean {
    return this.context.bodies().some((body) => body.occupies(x, y, z, x + 1, y + height, z + 1));
  }
}
