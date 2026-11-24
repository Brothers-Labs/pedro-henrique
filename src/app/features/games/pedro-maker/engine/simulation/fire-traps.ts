import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import { overlaps, type WorldArea } from './physics-body';
import { COLLISION, type TileGrid } from './tile-grid';

/**
 * Armadilha de Fogo: o ciclo inteiro, em milissegundos.
 *
 * Apagada ela espera bastante; antes de acender solta fumacinha (o aviso), e
 * aí a coluna de fogo sobe rápido, queima um tempo e se apaga de uma vez.
 */
export const FIRE_TRAP = {
  idleMs: 1800,
  warnMs: 650,
  burnMs: 1400,
  /** Quanto tempo a chama leva para chegar à altura toda. */
  growMs: 140,
  /** Altura da coluna de fogo, em blocos acima da armadilha. */
  flameCells: 3,
  /** Folga das bordas da chama: encostar de raspão não queima. */
  pad: 6,
} as const;

export const FIRE_TRAP_CYCLE_MS = FIRE_TRAP.idleMs + FIRE_TRAP.warnMs + FIRE_TRAP.burnMs;

export type FireTrapPhase = 'idle' | 'warn' | 'burn';

export interface FireTrap {
  readonly id: number;
  readonly cellX: number;
  readonly cellY: number;
  /** Blocos livres acima da armadilha, até o primeiro firme (no máximo `flameCells`): o fogo não atravessa o teto. */
  readonly flameCells: number;
  /** Armadilhas vizinhas se revezam: uma acende enquanto a do lado ainda espera. */
  readonly cycleOffsetMs: number;
}

/**
 * As armadilhas de fogo da fase.
 *
 * Não têm estado: a fase do ciclo sai do relógio da partida, como no bastão
 * de fogo e na prensa. A pausa congela o fogo e o mesmo instante sempre mostra
 * a mesma chama — na tela e no teste. O bloco em si é firme: dá para pisar em
 * cima dele quando o fogo está apagado.
 */
export class FireTrapSystem {
  readonly traps: readonly FireTrap[];

  constructor(objects: readonly LevelObject[], grid: TileGrid) {
    this.traps = objects
      .filter((object) => object.type === 'fire-trap')
      .map((object, index) => ({
        id: index + 1,
        cellX: object.x,
        cellY: object.y,
        flameCells: countFlameCells(grid, object.x, object.y),
        cycleOffsetMs: Math.abs(object.x % 2) * (FIRE_TRAP_CYCLE_MS / 2),
      }));
  }

  get hasTraps(): boolean {
    return this.traps.length > 0;
  }

  phaseOf(trap: FireTrap, now: number): FireTrapPhase {
    const time = (now + trap.cycleOffsetMs) % FIRE_TRAP_CYCLE_MS;

    if (time < FIRE_TRAP.idleMs) {
      return 'idle';
    }

    return time < FIRE_TRAP.idleMs + FIRE_TRAP.warnMs ? 'warn' : 'burn';
  }

  /** Altura da chama agora, em pixels acima do bloco; 0 apagada. */
  flameHeight(trap: FireTrap, now: number): number {
    if (this.phaseOf(trap, now) !== 'burn') {
      return 0;
    }

    const burning = (now + trap.cycleOffsetMs) % FIRE_TRAP_CYCLE_MS - FIRE_TRAP.idleMs - FIRE_TRAP.warnMs;
    const growth = Math.min(1, burning / FIRE_TRAP.growMs);

    return trap.flameCells * TILE_SIZE * growth;
  }

  /** A área que queima agora, em pixels do mundo; `null` com o fogo apagado. */
  flameArea(trap: FireTrap, now: number): WorldArea | null {
    const height = this.flameHeight(trap, now);

    if (height <= FIRE_TRAP.pad) {
      return null;
    }

    const top = trap.cellY * TILE_SIZE;

    return {
      x: trap.cellX * TILE_SIZE + FIRE_TRAP.pad,
      y: top - height + FIRE_TRAP.pad,
      width: TILE_SIZE - FIRE_TRAP.pad * 2,
      height: height - FIRE_TRAP.pad,
    };
  }

  /** A armadilha que está queimando este corpo agora; `null` se nenhuma. */
  touching(now: number, body: WorldArea): FireTrap | null {
    return (
      this.traps.find((trap) => {
        const flame = this.flameArea(trap, now);

        return flame !== null && overlaps(body, flame);
      }) ?? null
    );
  }
}

/** Blocos vazios acima da armadilha até o primeiro firme (ou o alto da fase). */
function countFlameCells(grid: TileGrid, cellX: number, cellY: number): number {
  let cells = 0;

  while (cells < FIRE_TRAP.flameCells && grid.contains(cellX, cellY - cells - 1) && grid.collisionAt(cellX, cellY - cells - 1) !== COLLISION.solid) {
    cells += 1;
  }

  return cells;
}
