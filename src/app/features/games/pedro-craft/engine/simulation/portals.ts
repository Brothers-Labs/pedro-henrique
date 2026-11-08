import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { BlockDefinition } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import type { RayHit } from './raycast';

/** O menor vão que acende: 2 blocos de largura e 3 de altura. */
export const PORTAL_MIN_WIDTH = 2;
export const PORTAL_MIN_HEIGHT = 3;

/** Vão maior que isto não acende: a moldura aberta de um lado nunca vira uma busca pelo mundo todo. */
export const PORTAL_MAX_SIZE = 10;

/** Quanto tempo o herói fica dentro do portal até viajar: dá para ver o brilho antes de sumir. */
export const PORTAL_TRAVEL_MS = 1500;

const NEIGHBORS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

interface PortalKind {
  readonly block: BlockDefinition;
  readonly number: number;
  readonly frame: number;
  readonly igniters: readonly string[];
}

interface Cell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** O que aconteceu ao usar um item na moldura: acendeu, ou a moldura ainda não está pronta. */
export type PortalLighting = { readonly type: 'lit'; readonly portal: BlockDefinition } | { readonly type: 'no-frame' };

/** O herói ficou tempo bastante no portal: viaja até os pés de outro portal, ou fica sabendo que é o único. */
export type PortalTrip = { readonly type: 'travel'; readonly x: number; readonly y: number; readonly z: number } | { readonly type: 'alone' };

/**
 * Os portais: a moldura em pé que acende com o isqueiro e leva o herói até
 * outro portal igual.
 *
 * Os blocos do portal são blocos comuns do mundo e vão para o save como
 * qualquer outro: não há registro à parte que possa se desencontrar deles.
 */
export class Portals {
  private readonly kinds: readonly PortalKind[];
  private insideMs = 0;
  /** Acabou de chegar: só viaja de novo depois de sair do portal, senão voltaria na hora. */
  private mustLeave = false;
  private isClearing = false;

  constructor(
    private readonly world: VoxelWorld,
    catalog: CraftCatalog,
  ) {
    this.kinds = catalog.content.blocks.flatMap((block) =>
      block.portal
        ? [{ block, number: catalog.blockNumber(block.id), frame: catalog.blockNumber(block.portal.frame), igniters: block.portal.igniters }]
        : [],
    );

    if (this.kinds.length > 0) {
      world.listen((x, y, z, previous) => this.extinguishNear(x, y, z, previous));
    }
  }

  /**
   * O item usado no bloco mirado. `null` quando o bloco não é moldura de
   * portal que esse item acende — aí o botão segue para o resto do jogo.
   */
  light(target: RayHit, itemId: string): PortalLighting | null {
    const aimed = this.world.get(target.x, target.y, target.z);
    const kind = this.kinds.find((candidate) => candidate.frame === aimed && candidate.igniters.includes(itemId));

    if (!kind) {
      return null;
    }

    const start = { x: target.x + target.normalX, y: target.y + target.normalY, z: target.z + target.normalZ };
    const opening = this.findOpening(start, 'x', kind.frame) ?? this.findOpening(start, 'z', kind.frame);

    if (!opening) {
      return { type: 'no-frame' };
    }

    opening.forEach((cell) => this.world.set(cell.x, cell.y, cell.z, kind.number));

    return { type: 'lit', portal: kind.block };
  }

  /** Um passo com os pés do herói em (`x`, `y`, `z`). */
  step(x: number, y: number, z: number, elapsedMs: number): PortalTrip | null {
    const cell = { x: Math.floor(x), y: Math.floor(y + 0.5), z: Math.floor(z) };
    const kind = this.kindAt(cell);

    if (!kind) {
      this.insideMs = 0;
      this.mustLeave = false;
      return null;
    }

    if (this.mustLeave) {
      return null;
    }

    this.insideMs += elapsedMs;

    if (this.insideMs < PORTAL_TRAVEL_MS) {
      return null;
    }

    this.insideMs = 0;
    this.mustLeave = true;

    return this.tripFrom(cell, kind);
  }

  /**
   * O vão retangular, de pé ao longo de `axis`, que contém `start`: só ar por
   * dentro, moldura embaixo, em cima e dos lados. Os cantos não importam.
   */
  private findOpening(start: Cell, axis: 'x' | 'z', frame: number): readonly Cell[] | null {
    const origin = axis === 'x' ? start.x : start.z;
    const cellAt = (along: number, y: number): Cell => (axis === 'x' ? { x: along, y, z: start.z } : { x: start.x, y, z: along });
    const blockAt = (along: number, y: number): number => {
      const cell = cellAt(along, y);

      return this.world.get(cell.x, cell.y, cell.z);
    };

    if (!this.world.contains(start.x, start.y, start.z) || blockAt(origin, start.y) !== AIR) {
      return null;
    }

    const bottom = this.walk(start.y, -1, (y) => blockAt(origin, y));
    const first = bottom === null ? null : this.walk(origin, -1, (along) => blockAt(along, bottom));
    const last = bottom === null ? null : this.walk(origin, 1, (along) => blockAt(along, bottom));

    if (bottom === null || first === null || last === null) {
      return null;
    }

    const width = last - first + 1;
    const isFrameRow = (y: number): boolean => this.range(first, last).every((along) => blockAt(along, y) === frame);
    const isOpenRow = (y: number): boolean =>
      blockAt(first - 1, y) === frame && blockAt(last + 1, y) === frame && this.range(first, last).every((along) => blockAt(along, y) === AIR);

    if (width < PORTAL_MIN_WIDTH || width > PORTAL_MAX_SIZE || !isFrameRow(bottom - 1)) {
      return null;
    }

    let top = bottom;

    while (isOpenRow(top)) {
      top += 1;

      if (top - bottom > PORTAL_MAX_SIZE) {
        return null;
      }
    }

    if (top - bottom < PORTAL_MIN_HEIGHT || !isFrameRow(top)) {
      return null;
    }

    return this.range(bottom, top - 1).flatMap((y) => this.range(first, last).map((along) => cellAt(along, y)));
  }

  /** Anda de `from` no sentido `direction` enquanto houver ar; devolve a última célula vazia, ou `null` se passar do tamanho máximo. */
  private walk(from: number, direction: 1 | -1, blockAt: (position: number) => number): number | null {
    let position = from;

    while (blockAt(position + direction) === AIR) {
      position += direction;

      if (Math.abs(position - from) >= PORTAL_MAX_SIZE) {
        return null;
      }
    }

    return position;
  }

  private range(from: number, to: number): readonly number[] {
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  }

  /** Um pedaço da moldura (ou do próprio portal) saiu: o portal encostado nele apaga inteiro. */
  private extinguishNear(x: number, y: number, z: number, previous: number): void {
    if (this.isClearing || !this.kinds.some((kind) => kind.number === previous || kind.frame === previous)) {
      return;
    }

    this.isClearing = true;

    for (const [dx, dy, dz] of NEIGHBORS) {
      const neighbor = { x: x + dx, y: y + dy, z: z + dz };
      const kind = this.kindAt(neighbor);

      if (kind) {
        this.connected(neighbor, kind.number).forEach((cell) => this.world.set(cell.x, cell.y, cell.z, AIR));
      }
    }

    this.isClearing = false;
  }

  /** O portal mais perto, fora o de partida, com os pés no meio da linha de baixo. */
  private tripFrom(origin: Cell, kind: PortalKind): PortalTrip {
    const departure = new Set(this.connected(origin, kind.number).map((cell) => this.world.indexOf(cell.x, cell.y, cell.z)));
    const others = this.portalsOf(kind.number, departure);
    const nearest = others.reduce<readonly Cell[] | null>(
      (best, portal) => (best === null || distanceSquared(origin, portal[0]) < distanceSquared(origin, best[0]) ? portal : best),
      null,
    );

    if (!nearest) {
      return { type: 'alone' };
    }

    const lowest = Math.min(...nearest.map((cell) => cell.y));
    const bottomRow = nearest.filter((cell) => cell.y === lowest).sort((a, b) => a.x - b.x || a.z - b.z);
    const arrival = bottomRow[Math.floor((bottomRow.length - 1) / 2)];

    return { type: 'travel', x: arrival.x + 0.5, y: arrival.y, z: arrival.z + 0.5 };
  }

  /** Todos os portais deste tipo no mundo, menos as células de `skip`, cada um como a lista das suas células. */
  private portalsOf(number: number, skip: ReadonlySet<number>): readonly (readonly Cell[])[] {
    const cells = this.world.snapshot;
    const seen = new Set(skip);
    const portals: (readonly Cell[])[] = [];

    for (let index = 0; index < cells.length; index += 1) {
      if (cells[index] !== number || seen.has(index)) {
        continue;
      }

      const portal = this.connected(this.world.positionOf(index), number);

      portal.forEach((cell) => seen.add(this.world.indexOf(cell.x, cell.y, cell.z)));
      portals.push(portal);
    }

    return portals;
  }

  /** As células de portal ligadas a `start`, encostadas face com face. */
  private connected(start: Cell, number: number): readonly Cell[] {
    const found = new Map<number, Cell>([[this.world.indexOf(start.x, start.y, start.z), start]]);
    const pending: Cell[] = [start];

    for (let cell = pending.pop(); cell; cell = pending.pop()) {
      for (const [dx, dy, dz] of NEIGHBORS) {
        const next = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };

        if (!this.world.contains(next.x, next.y, next.z) || this.world.get(next.x, next.y, next.z) !== number) {
          continue;
        }

        const index = this.world.indexOf(next.x, next.y, next.z);

        if (!found.has(index)) {
          found.set(index, next);
          pending.push(next);
        }
      }
    }

    return [...found.values()];
  }

  private kindAt(cell: Cell): PortalKind | null {
    const block = this.world.get(cell.x, cell.y, cell.z);

    return this.kinds.find((kind) => kind.number === block) ?? null;
  }
}

function distanceSquared(a: Cell, b: Cell): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}
