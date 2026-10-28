import { AIR } from '../content/craft-catalog';

/** Avisado a cada bloco trocado: a malha marca o chunk para refazer, o save anota a diferença. */
export type BlockChangeListener = (x: number, y: number, z: number, previous: number, next: number) => void;

/**
 * O mundo de blocos: um número por célula, num vetor só.
 *
 * O mundo é do tamanho de uma fazenda (96 × 96 × 48 ≈ 432 KB), pequeno o
 * bastante para dispensar chunks esparsos. A ordem é x, depois z, depois y:
 * percorrer uma coluna de chão é andar de `width × depth` em `width × depth`.
 *
 * Fora dos limites tudo é ar. Quem precisa de parede na borda (a física)
 * cuida disso; o mundo não inventa blocos que não existem.
 */
export class VoxelWorld {
  private readonly cells: Uint8Array;
  private readonly layerSize: number;
  private readonly listeners = new Set<BlockChangeListener>();

  constructor(
    readonly width: number,
    readonly depth: number,
    readonly height: number,
  ) {
    this.layerSize = width * depth;
    this.cells = new Uint8Array(this.layerSize * height);
  }

  /** Cópia das células, para comparar mundos e fotografar o estado. */
  get snapshot(): Uint8Array {
    return this.cells.slice();
  }

  contains(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.width && z >= 0 && z < this.depth && y >= 0 && y < this.height;
  }

  /** Posição da célula no vetor; só vale dentro dos limites. */
  indexOf(x: number, y: number, z: number): number {
    return y * this.layerSize + z * this.width + x;
  }

  /** O caminho de volta de `indexOf`: a posição de uma célula guardada pelo número. */
  positionOf(index: number): { readonly x: number; readonly y: number; readonly z: number } {
    return { x: index % this.width, y: Math.floor(index / this.layerSize), z: Math.floor(index / this.width) % this.depth };
  }

  get(x: number, y: number, z: number): number {
    return this.contains(x, y, z) ? this.cells[this.indexOf(x, y, z)] : AIR;
  }

  /**
   * Troca um bloco e avisa quem escuta.
   *
   * Devolve `false` fora dos limites ou quando o bloco já era o pedido — nada
   * mudou e ninguém precisa refazer malha nem salvar.
   */
  set(x: number, y: number, z: number, block: number): boolean {
    if (!this.contains(x, y, z)) {
      return false;
    }

    const index = this.indexOf(x, y, z);
    const previous = this.cells[index];

    if (previous === block) {
      return false;
    }

    this.cells[index] = block;

    for (const listener of this.listeners) {
      listener(x, y, z, previous, block);
    }

    return true;
  }

  /** Escrita sem aviso, só para o gerador montar o mundo antes de alguém escutar. */
  fill(x: number, y: number, z: number, block: number): void {
    if (this.contains(x, y, z)) {
      this.cells[this.indexOf(x, y, z)] = block;
    }
  }

  /** Y do bloco mais alto da coluna que satisfaz o filtro; -1 se não houver. */
  topY(x: number, z: number, accepts: (block: number) => boolean = (block) => block !== AIR): number {
    for (let y = this.height - 1; y >= 0; y -= 1) {
      if (accepts(this.get(x, y, z))) {
        return y;
      }
    }

    return -1;
  }

  listen(listener: BlockChangeListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }
}
