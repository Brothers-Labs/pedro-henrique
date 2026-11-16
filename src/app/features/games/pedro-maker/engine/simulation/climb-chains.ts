import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import { centerX, type PhysicsBody } from './physics-body';
import { cellOf } from './tile-grid';

/**
 * Corrente de Subir: como o herói se pendura nela.
 *
 * Segurando o pulo (ou a seta para cima) ele sobe; soltando, escorrega
 * devagarinho para baixo. Lá no alto, o último elo dá um pulinho para o herói
 * alcançar o chão do lado. Pular apertando para o lado solta da corrente.
 */
export const CLIMB_CHAIN = {
  climbSpeed: 240,
  slideSpeed: 70,
  /** Fração do pulo normal no pulinho do alto da corrente. */
  topHopMultiplier: 0.78,
  /** Fração do pulo normal ao pular para o lado, soltando da corrente. */
  jumpOffMultiplier: 0.85,
  /** Sem apertar para os lados, o herói vai se ajeitando no meio da corrente: velocidade por pixel de distância. */
  centeringSpeed: 6,
} as const;

/** Onde o herói está na corrente; `null` quando não está em nenhuma. */
export interface ClimbChainGrip {
  /** Centro da coluna da corrente, em pixels do mundo. */
  readonly x: number;
  /** As mãos chegaram ao último elo, lá em cima. */
  readonly isAtTop: boolean;
}

export interface ClimbChainLink {
  readonly cellX: number;
  readonly cellY: number;
}

/**
 * As correntes de subir da fase, guardadas por célula. Várias empilhadas
 * viram uma corrente comprida; a de cima de cada pilha é o topo.
 */
export class ClimbChainSystem {
  readonly links: readonly ClimbChainLink[];

  private readonly cells = new Set<string>();

  constructor(objects: readonly LevelObject[]) {
    this.links = objects.filter((object) => object.type === 'climb-chain').map((object) => ({ cellX: object.x, cellY: object.y }));

    for (const link of this.links) {
      this.cells.add(cellKey(link.cellX, link.cellY));
    }
  }

  has(cellX: number, cellY: number): boolean {
    return this.cells.has(cellKey(cellX, cellY));
  }

  /** Este elo é o último de cima da pilha? */
  isTop(cellX: number, cellY: number): boolean {
    return this.has(cellX, cellY) && !this.has(cellX, cellY - 1);
  }

  /**
   * As mãos do herói (um pouco abaixo do alto da cabeça) estão numa corrente?
   * Vale também o meio do corpo, para quem chega pulando de baixo.
   */
  gripOf(body: PhysicsBody): ClimbChainGrip | null {
    if (this.links.length === 0) {
      return null;
    }

    const cellX = cellOf(centerX(body));
    const handsCell = cellOf(body.y + body.height * 0.2);
    const middleCell = cellOf(body.y + body.height * 0.6);
    const gripCell = this.has(cellX, handsCell) ? handsCell : this.has(cellX, middleCell) ? middleCell : null;

    if (gripCell === null) {
      return null;
    }

    const handsAboveTop = !this.has(cellX, handsCell);

    return { x: (cellX + 0.5) * TILE_SIZE, isAtTop: handsAboveTop || (this.isTop(cellX, gripCell) && body.y < gripCell * TILE_SIZE + TILE_SIZE * 0.35) };
  }
}

function cellKey(cellX: number, cellY: number): string {
  return `${cellX},${cellY}`;
}
