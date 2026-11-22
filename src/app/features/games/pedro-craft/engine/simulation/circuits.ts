import type { CraftCatalog } from '../../content/craft-catalog';
import type { BlockDefinition, CircuitPart } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';

export interface CircuitsContext {
  readonly catalog: CraftCatalog;
  readonly world: VoxelWorld;
  /** Troca a peça da célula para o outro jeito; na porta, as duas metades trocam juntas. */
  switchInto(x: number, y: number, z: number, blockId: string): void;
  /** O comando ligado chegou numa TNT: o pavio acende. */
  ignite(x: number, y: number, z: number): void;
}

interface Cell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Alavancas e linhas encostadas umas nas outras: ligadas, se qualquer alavanca do grupo estiver ligada. */
interface Network {
  readonly conductors: readonly Cell[];
  /** Portas e TNTs encostadas no grupo. */
  readonly receivers: readonly Cell[];
  readonly isPowered: boolean;
}

/** Os seis vizinhos de lado: a linha em cima da TNT também a acende. */
const NEIGHBOR_OFFSETS: readonly Cell[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

/**
 * Os circuitos: a alavanca dá o comando, a linha leva, e a porta ou a TNT
 * encostada obedece.
 *
 * Nada aqui roda a cada quadro. O circuito só é refeito quando uma peça entra,
 * sai ou é ligada pelo herói, e o jeito de cada peça (linha acesa, porta
 * aberta) fica gravado no próprio bloco — por isso vai para o save sozinho.
 */
export class Circuits {
  constructor(private readonly context: CircuitsContext) {}

  /** Bloco novo no mundo: a peça de circuito (ou a TNT) já obedece ao comando em volta dela. */
  placed(block: BlockDefinition, x: number, y: number, z: number): void {
    if (block.circuit || block.explosive) {
      this.refreshAround({ x, y, z });
    }
  }

  /** Saiu uma alavanca ou uma linha: o que dependia dela pode ter desligado. */
  removed(block: BlockDefinition, x: number, y: number, z: number): void {
    if (block.circuit && block.circuit.role !== 'receiver') {
      this.refreshAround({ x, y, z });
    }
  }

  /**
   * O herói usou o bloco da célula. Só a alavanca refaz o circuito: a porta
   * aberta com a mão continua aberta até o comando mudar.
   */
  toggled(x: number, y: number, z: number): void {
    if (this.partAt({ x, y, z })?.role === 'source') {
      this.refreshAround({ x, y, z });
    }
  }

  private refreshAround(origin: Cell): void {
    const networks = new Map<number, Network>();
    const receivers = new Map<number, Cell>();

    for (const cell of [origin, ...this.neighborsOf(origin)]) {
      if (this.isConductor(cell)) {
        const network = this.networkAt(cell, networks);

        network.receivers.forEach((receiver) => receivers.set(this.indexOf(receiver), receiver));
      } else if (this.isReceiver(cell)) {
        // A peça que acabou de sair deixa portas e TNTs encostadas só nela, sem grupo nenhum.
        receivers.set(this.indexOf(cell), cell);
      }
    }

    new Set(networks.values()).forEach((network) => this.lightWires(network));
    receivers.forEach((receiver) => this.command(receiver, networks));
  }

  /** O grupo de alavancas e linhas encostadas a partir de `start`, guardado para cada célula dele. */
  private networkAt(start: Cell, networks: Map<number, Network>): Network {
    const known = networks.get(this.indexOf(start));

    if (known) {
      return known;
    }

    const conductors: Cell[] = [];
    const receivers: Cell[] = [];
    const visited = new Set<number>([this.indexOf(start)]);
    const pending: Cell[] = [start];
    let isPowered = false;
    let cell = pending.pop();

    while (cell) {
      const part = this.partAt(cell);

      conductors.push(cell);
      isPowered ||= part?.role === 'source' && part.powered;

      for (const neighbor of this.neighborsOf(cell)) {
        const index = this.indexOf(neighbor);

        if (visited.has(index)) {
          continue;
        }

        visited.add(index);

        if (this.isConductor(neighbor)) {
          pending.push(neighbor);
        } else if (this.isReceiver(neighbor)) {
          receivers.push(neighbor);
        }
      }

      cell = pending.pop();
    }

    const network: Network = { conductors, receivers, isPowered };

    conductors.forEach((cell) => networks.set(this.indexOf(cell), network));

    return network;
  }

  /** Cada linha do grupo fica acesa ou apagada, conforme o grupo. */
  private lightWires(network: Network): void {
    for (const cell of network.conductors) {
      const part = this.partAt(cell);

      if (part?.role === 'wire' && part.powered !== network.isPowered && part.switchesInto) {
        this.context.switchInto(cell.x, cell.y, cell.z, part.switchesInto);
      }
    }
  }

  /**
   * A porta ou a TNT obedece a qualquer grupo ligado encostado nela — também
   * pela outra metade da porta.
   */
  private command(cell: Cell, networks: Map<number, Network>): void {
    const block = this.blockAt(cell);

    if (!block) {
      return;
    }

    const isPowered = this.receiverCells(cell, block).some((part) =>
      this.neighborsOf(part).some((neighbor) => this.isConductor(neighbor) && this.networkAt(neighbor, networks).isPowered),
    );

    if (block.explosive && isPowered) {
      this.context.ignite(cell.x, cell.y, cell.z);
    }

    const circuit = block.circuit;

    if (circuit?.role === 'receiver' && circuit.powered !== isPowered && circuit.switchesInto) {
      this.context.switchInto(cell.x, cell.y, cell.z, circuit.switchesInto);
    }
  }

  /** A célula e, na porta, a outra metade dela. */
  private receiverCells(cell: Cell, block: BlockDefinition): readonly Cell[] {
    if (!block.pairsVertically) {
      return [cell];
    }

    const number = this.context.world.get(cell.x, cell.y, cell.z);
    const partners = [cell.y - 1, cell.y + 1]
      .filter((y) => this.context.world.get(cell.x, y, cell.z) === number)
      .map((y) => ({ x: cell.x, y, z: cell.z }));

    return [cell, ...partners];
  }

  private isConductor(cell: Cell): boolean {
    const role = this.partAt(cell)?.role;

    return role === 'source' || role === 'wire';
  }

  private isReceiver(cell: Cell): boolean {
    const block = this.blockAt(cell);

    return block !== null && (block.circuit?.role === 'receiver' || block.explosive !== null);
  }

  private partAt(cell: Cell): CircuitPart | null {
    return this.blockAt(cell)?.circuit ?? null;
  }

  private blockAt(cell: Cell): BlockDefinition | null {
    return this.context.catalog.blockAt(this.context.world.get(cell.x, cell.y, cell.z));
  }

  /** Só os vizinhos dentro do mundo: fora dele não há peça, e o número da célula nem existe. */
  private neighborsOf(cell: Cell): readonly Cell[] {
    return NEIGHBOR_OFFSETS.map((offset) => ({ x: cell.x + offset.x, y: cell.y + offset.y, z: cell.z + offset.z })).filter((neighbor) =>
      this.context.world.contains(neighbor.x, neighbor.y, neighbor.z),
    );
  }

  private indexOf(cell: Cell): number {
    return this.context.world.indexOf(cell.x, cell.y, cell.z);
  }
}
