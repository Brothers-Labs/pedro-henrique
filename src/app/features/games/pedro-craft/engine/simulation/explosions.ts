import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { ExplosionSpec } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import type { BlockActions } from './block-actions';
import type { Combat } from './combat';
import type { SimulationEvent, VisualEvent } from './simulation-events';

/** A TNT pega pela explosão de outra estoura logo, numa reação em cadeia que dá para ver. */
const CHAIN_FUSE_MS = 500;

export interface ExplosionsContext {
  readonly catalog: CraftCatalog;
  readonly world: VoxelWorld;
  readonly actions: BlockActions;
  readonly combat: Combat;
  event(event: SimulationEvent): void;
  visual(event: VisualEvent): void;
}

/** Pavio aceso numa célula do mundo. */
export interface LitFuse {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  leftMs: number;
}

/**
 * As explosões: a TNT acesa esperando o pavio e o estouro em si, que vale
 * também para o creeper.
 *
 * O pavio não vai para o save: um mundo aberto de novo volta com a TNT
 * apagada, inteira no lugar dela.
 */
export class Explosions {
  private readonly fuses = new Map<number, LitFuse>();

  constructor(private readonly context: ExplosionsContext) {}

  /** Os pavios acesos agora, para o desenho fazer a TNT piscar. */
  get lit(): Iterable<LitFuse> {
    return this.fuses.values();
  }

  /**
   * Acende a TNT da célula; `fuseMs` troca o pavio de sempre (o da reação em
   * cadeia, mais curto). Devolve se acendeu agora: uma TNT já acesa só tem o
   * pavio encurtado, e o que não é TNT não muda nada.
   */
  ignite(x: number, y: number, z: number, fuseMs?: number): boolean {
    const explosive = this.explosiveAt(x, y, z);
    const cell = this.context.world.indexOf(x, y, z);
    const lit = this.fuses.get(cell);

    if (lit && fuseMs !== undefined) {
      lit.leftMs = Math.min(lit.leftMs, fuseMs);
    }

    if (!explosive || lit) {
      return false;
    }

    this.fuses.set(cell, { x, y, z, leftMs: fuseMs ?? explosive.fuseMs });

    return true;
  }

  step(elapsedMs: number): void {
    // Cópia: a explosão de uma TNT acende outras no meio da volta.
    for (const [cell, fuse] of [...this.fuses]) {
      const explosive = this.explosiveAt(fuse.x, fuse.y, fuse.z);

      // Quebrada antes de estourar, a TNT vira item e o pavio apaga junto.
      if (!explosive) {
        this.fuses.delete(cell);
        continue;
      }

      fuse.leftMs -= elapsedMs;

      if (fuse.leftMs <= 0) {
        this.fuses.delete(cell);
        this.context.world.set(fuse.x, fuse.y, fuse.z, AIR);
        this.explode(fuse.x + 0.5, fuse.y + 0.5, fuse.z + 0.5, explosive);
      }
    }
  }

  /** O estouro em (`x`, `y`, `z`): abre o buraco, se for de abrir, e machuca e empurra quem está perto. */
  explode(x: number, y: number, z: number, explosion: ExplosionSpec): void {
    if (explosion.breaksBlocks) {
      this.context.actions.blast(x, y, z, explosion.radius, (cellX, cellY, cellZ) => this.ignite(cellX, cellY, cellZ, CHAIN_FUSE_MS));
    }

    this.context.combat.blast(x, y, z, explosion);
    this.context.visual({ type: 'explosion', x, y, z, radius: explosion.radius });
    this.context.event({ type: 'sound', cue: 'break' });
  }

  private explosiveAt(x: number, y: number, z: number): ExplosionSpec | null {
    return this.context.catalog.blockAt(this.context.world.get(x, y, z))?.explosive ?? null;
  }
}
