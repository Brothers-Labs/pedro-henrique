import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { VoxelWorld } from '../../world/voxel-world';

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * A água que escorre.
 *
 * Só a nascente (o lago, o riacho, o balde) é água de verdade. Dela escorre
 * a água corrente: cai direto para baixo e, quando encosta no chão, anda no
 * máximo `maxSpread` blocos para os lados. Tirar a nascente faz a corrente
 * secar sozinha, e por isso o save só precisa guardar as nascentes.
 *
 * Nada é varrido: cada bloco trocado acorda só as células em volta, e a água
 * anda um passo a cada `tickMs` — dá para ver ela escorrendo.
 */
export class WaterFlow {
  private readonly source: number;
  private readonly flowing: number;
  private readonly maxSpread: number;
  private readonly tickMs: number;
  /** Quantos blocos cada célula de água corrente está da nascente; 0 na água que cai. */
  private readonly distances = new Map<number, number>();
  private pending = new Set<number>();
  private elapsedMs = 0;

  constructor(
    private readonly world: VoxelWorld,
    catalog: CraftCatalog,
  ) {
    this.source = catalog.blockNumber(catalog.world.blocks.water);
    this.flowing = catalog.blockNumber(catalog.world.blocks.flowingWater);
    this.maxSpread = catalog.world.water.maxSpread;
    this.tickMs = catalog.world.water.tickMs;

    world.listen((x, y, z, _previous, next) => {
      if (next !== this.flowing) {
        this.distances.delete(world.indexOf(x, y, z));
      }

      this.wake(x, y, z);
    });
  }

  /** A água parou de mexer? */
  get isSettled(): boolean {
    return this.pending.size === 0;
  }

  step(elapsedMs: number): void {
    // Parada, a água não acumula tempo: quando algo muda, ela começa no ritmo certo.
    if (this.isSettled) {
      this.elapsedMs = 0;
      return;
    }

    this.elapsedMs += elapsedMs;

    while (this.elapsedMs >= this.tickMs && !this.isSettled) {
      this.elapsedMs -= this.tickMs;
      this.tick();
    }
  }

  /** Um passo da água: cada célula acordada decide se tem, se ganha ou se perde água. */
  private tick(): void {
    const cells = this.pending;

    this.pending = new Set();

    for (const cell of cells) {
      this.settle(cell);
    }
  }

  private settle(cell: number): void {
    const { x, y, z } = this.world.positionOf(cell);
    const block = this.world.get(x, y, z);

    if (block !== AIR && block !== this.flowing) {
      return;
    }

    const distance = this.incoming(x, y, z);

    if (distance === null) {
      if (block === this.flowing) {
        this.world.set(x, y, z, AIR);
      }

      return;
    }

    if (block === AIR) {
      this.distances.set(cell, distance);
      this.world.set(x, y, z, this.flowing);
      return;
    }

    if (this.distances.get(cell) !== distance) {
      this.distances.set(cell, distance);
      this.wake(x, y, z);
    }
  }

  /** Distância da nascente que a célula receberia agora; `null` quando nada a alimenta. */
  private incoming(x: number, y: number, z: number): number | null {
    if (this.isWater(this.world.get(x, y + 1, z))) {
      return 0;
    }

    let best: number | null = null;

    for (const [dx, dz] of SIDES) {
      const neighborX = x + dx;
      const neighborZ = z + dz;
      const neighbor = this.world.get(neighborX, y, neighborZ);

      // Água que ainda pode cair não escorre para o lado: primeiro ela desce.
      if (!this.isWater(neighbor) || !this.isResting(neighborX, y, neighborZ)) {
        continue;
      }

      const distance = this.distanceOf(neighbor, this.world.indexOf(neighborX, y, neighborZ)) + 1;

      if (distance <= this.maxSpread && (best === null || distance < best)) {
        best = distance;
      }
    }

    return best;
  }

  private isResting(x: number, y: number, z: number): boolean {
    const below = this.world.get(x, y - 1, z);

    return below !== AIR && below !== this.flowing;
  }

  /** Corrente de distância desconhecida (vinda de um save) conta como a mais longe: seca se nada a alimentar. */
  private distanceOf(block: number, cell: number): number {
    return block === this.source ? 0 : (this.distances.get(cell) ?? this.maxSpread);
  }

  private isWater(block: number): boolean {
    return block === this.source || block === this.flowing;
  }

  /** Acorda a célula e as vizinhas: algo mudou perto e a água pode ter para onde ir. */
  private wake(x: number, y: number, z: number): void {
    this.queue(x, y, z);
    this.queue(x, y + 1, z);
    this.queue(x, y - 1, z);

    for (const [dx, dz] of SIDES) {
      this.queue(x + dx, y, z + dz);
    }
  }

  private queue(x: number, y: number, z: number): void {
    if (this.world.contains(x, y, z)) {
      this.pending.add(this.world.indexOf(x, y, z));
    }
  }
}
