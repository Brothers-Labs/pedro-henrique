import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { BlockDefinition, ItemDefinition } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import { type BlockProperties, SHAPE_CODE } from '../block-properties';
import { canHarvest, rollLoot } from './block-rules';
import type { ItemDrops } from './item-drops';
import type { PhysicsBody } from './physics-body';
import type { RayHit } from './raycast';
import type { VisualEvent } from './simulation-events';

/** Formas que precisam de chão firme embaixo: sem ele, caem junto. */
const NEEDS_SUPPORT: ReadonlySet<number> = new Set([SHAPE_CODE.cross, SHAPE_CODE.torch]);

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
    const { world, catalog } = this.context;
    const number = world.get(x, y, z);
    const block = catalog.blockAt(number);

    if (!block) {
      return;
    }

    world.set(x, y, z, AIR);
    this.context.visual({ type: 'block-broken', x, y, z, block: number });
    this.context.removed(x, y, z);

    if (block.pairsVertically) {
      this.removePartner(x, y, z, block);
    }

    this.dropFrom(block, x, y, z, held);
    this.breakUnsupported(x, y + 1, z);
  }

  /**
   * Coloca o bloco do item da mão na face mirada. Devolve se colocou.
   *
   * Capim e água são substituíveis: mirar neles coloca o bloco no lugar deles.
   */
  place(hit: RayHit, item: ItemDefinition): boolean {
    const { world, catalog, properties } = this.context;

    if (!item.places) {
      return false;
    }

    const block = catalog.block(item.places);
    const number = catalog.blockNumber(block.id);
    const hitIsReplaceable = properties.isReplaceable[world.get(hit.x, hit.y, hit.z)] === 1;
    const x = hitIsReplaceable ? hit.x : hit.x + hit.normalX;
    const y = hitIsReplaceable ? hit.y : hit.y + hit.normalY;
    const z = hitIsReplaceable ? hit.z : hit.z + hit.normalZ;

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

  private dropFrom(block: BlockDefinition, x: number, y: number, z: number, held: ItemDefinition | null): void {
    const { catalog, drops, random } = this.context;
    const tool = held?.tool ?? null;

    if (!canHarvest(block, tool)) {
      return;
    }

    // A tesoura colhe o próprio bloco (folhas, lã), em vez do que ele costuma soltar.
    const sheared = tool?.type === 'shears' && block.tool === 'shears' ? this.itemPlacing(block.id) : null;
    const loot = sheared ? [{ item: sheared, count: 1 }] : block.drops ? rollLoot(catalog.lootTable(block.drops), random) : [];

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

  /** Planta ou tocha que ficou sem chão quebra junto, soltando o que dá. */
  private breakUnsupported(x: number, y: number, z: number): void {
    const { world, properties, catalog } = this.context;
    const number = world.get(x, y, z);

    if (!NEEDS_SUPPORT.has(properties.shape[number]) || this.isSupport(x, y - 1, z)) {
      return;
    }

    const block = catalog.blockAt(number);

    world.set(x, y, z, AIR);

    if (block) {
      this.dropFrom(block, x, y, z, null);
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
    return this.context.bodies().some(
      (body) =>
        body.x + body.halfWidth > x &&
        body.x - body.halfWidth < x + 1 &&
        body.z + body.halfWidth > z &&
        body.z - body.halfWidth < z + 1 &&
        body.y + body.height > y &&
        body.y < y + height,
    );
  }
}
