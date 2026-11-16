import { TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import { overlaps, type WorldArea } from './physics-body';
import { COLLISION, type TileGrid } from './tile-grid';

/**
 * Prensa Esmagadora: o ciclo inteiro, em milissegundos.
 *
 * Lá em cima ela espera bastante (a criança vê e passa), despenca rápido,
 * fica um tempinho no chão e sobe devagar — dá para ver chegando.
 */
export const CRUSHER = {
  restMs: 1400,
  fallMs: 260,
  downMs: 650,
  riseMs: 900,
  /** No máximo quantos blocos a prensa desce: mais que isso fica difícil de prever. */
  maxDropCells: 6,
  /** Puxada a alavanca, a prensa sobe este tanto acima de onde foi posta e fica lá. */
  liftPx: TILE_SIZE,
  /** Quanto tempo leva para subir de vez depois da alavanca. */
  liftMs: 700,
  /** Folga da cabeça de ferro: encostar de raspão não esmaga. */
  pad: 4,
} as const;

export const CRUSHER_CYCLE_MS = CRUSHER.restMs + CRUSHER.fallMs + CRUSHER.downMs + CRUSHER.riseMs;

export type CrusherPhase = 'rest' | 'fall' | 'down' | 'rise' | 'raised';

export interface Crusher {
  readonly id: number;
  /** Célula onde a prensa foi posta: é a casa dela, lá em cima. */
  readonly cellX: number;
  readonly cellY: number;
  /** Quantos blocos vazios há embaixo dela até o chão (limitado por `maxDropCells`). */
  readonly dropCells: number;
  /** Prensas lado a lado não descem juntas: cada uma começa num ponto do ciclo. */
  readonly cycleOffsetMs: number;
  isRaised: boolean;
  raisedAt: number;
  /** Onde a cabeça estava quando a alavanca foi puxada, em pixels abaixo da casa. */
  raisedFromPx: number;
  /** A casa está firme no mapa agora (a prensa parada lá em cima segura quem pisa nela). */
  isHomeSolid: boolean;
}

export interface CrusherState {
  readonly phase: CrusherPhase;
  /** Quanto a cabeça está abaixo da casa, em pixels; negativo quando já subiu de vez. */
  readonly offsetPx: number;
}

/**
 * As prensas esmagadoras da fase.
 *
 * O ciclo sai do relógio da partida, como no bastão de fogo: a pausa congela a
 * prensa e o mesmo instante sempre mostra a mesma posição — na tela e no
 * teste. Parada lá em cima, a cabeça é firme (dá para subir nela); enquanto
 * desce e no chão, esmaga; subindo, não machuca ninguém.
 *
 * Uma alavanca puxada levanta todas as prensas de vez, e elas não descem mais:
 * o caminho embaixo fica livre.
 */
export class CrusherSystem {
  readonly crushers: Crusher[] = [];

  constructor(
    objects: readonly LevelObject[],
    private readonly grid: TileGrid,
  ) {
    for (const object of objects) {
      if (object.type !== 'crusher') {
        continue;
      }

      this.crushers.push({
        id: this.crushers.length + 1,
        cellX: object.x,
        cellY: object.y,
        dropCells: countDrop(grid, object.x, object.y),
        cycleOffsetMs: (this.crushers.length * 700) % CRUSHER_CYCLE_MS,
        isRaised: false,
        raisedAt: 0,
        raisedFromPx: 0,
        isHomeSolid: false,
      });
    }
  }

  get hasCrushers(): boolean {
    return this.crushers.length > 0;
  }

  /** Fase e posição da cabeça neste instante. */
  stateOf(crusher: Crusher, now: number): CrusherState {
    if (crusher.isRaised) {
      const progress = Math.min(1, Math.max(0, (now - crusher.raisedAt) / CRUSHER.liftMs));
      const eased = 1 - (1 - progress) * (1 - progress);

      return { phase: 'raised', offsetPx: crusher.raisedFromPx + (-CRUSHER.liftPx - crusher.raisedFromPx) * eased };
    }

    const drop = crusher.dropCells * TILE_SIZE;

    if (drop === 0) {
      return { phase: 'rest', offsetPx: 0 };
    }

    let time = (now + crusher.cycleOffsetMs) % CRUSHER_CYCLE_MS;

    if (time < CRUSHER.restMs) {
      return { phase: 'rest', offsetPx: 0 };
    }

    time -= CRUSHER.restMs;

    if (time < CRUSHER.fallMs) {
      const progress = time / CRUSHER.fallMs;

      // Despenca acelerando, como coisa pesada caindo.
      return { phase: 'fall', offsetPx: drop * progress * progress };
    }

    time -= CRUSHER.fallMs;

    if (time < CRUSHER.downMs) {
      return { phase: 'down', offsetPx: drop };
    }

    time -= CRUSHER.downMs;

    return { phase: 'rise', offsetPx: drop * (1 - time / CRUSHER.riseMs) };
  }

  /** A cabeça de ferro neste instante, em pixels do mundo. */
  headArea(crusher: Crusher, now: number): WorldArea {
    const { offsetPx } = this.stateOf(crusher, now);

    return { x: crusher.cellX * TILE_SIZE, y: crusher.cellY * TILE_SIZE + offsetPx, width: TILE_SIZE, height: TILE_SIZE };
  }

  /** A prensa que está esmagando este corpo agora; `null` se nenhuma. */
  crushing(now: number, body: WorldArea): Crusher | null {
    return this.crushers.find((crusher) => this.isCrushing(crusher, now, body)) ?? null;
  }

  isCrushing(crusher: Crusher, now: number, body: WorldArea): boolean {
    const { phase, offsetPx } = this.stateOf(crusher, now);

    if ((phase !== 'fall' && phase !== 'down') || offsetPx < CRUSHER.pad) {
      return false;
    }

    const head = this.headArea(crusher, now);

    return overlaps(body, { x: head.x + CRUSHER.pad, y: head.y + CRUSHER.pad, width: head.width - CRUSHER.pad * 2, height: head.height - CRUSHER.pad });
  }

  /**
   * Bate no chão neste passo? Serve para o tremor e o barulho, uma vez por
   * descida.
   */
  slammedBetween(crusher: Crusher, previousNow: number, now: number): boolean {
    return this.stateOf(crusher, previousNow).phase === 'fall' && this.stateOf(crusher, now).phase === 'down';
  }

  /**
   * Mantém a casa da prensa firme só enquanto ela está parada lá em cima.
   * Com alguém dentro da casa (a prensa voltando por cima do herói), espera
   * ele sair: nunca prende ninguém dentro do bloco.
   */
  update(now: number, bodies: readonly WorldArea[]): void {
    for (const crusher of this.crushers) {
      const shouldBeSolid = !crusher.isRaised && this.stateOf(crusher, now).phase === 'rest';

      if (shouldBeSolid === crusher.isHomeSolid) {
        continue;
      }

      const home: WorldArea = { x: crusher.cellX * TILE_SIZE, y: crusher.cellY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };

      if (shouldBeSolid && bodies.some((body) => overlaps(body, home))) {
        continue;
      }

      crusher.isHomeSolid = shouldBeSolid;
      this.grid.setCollision(crusher.cellX, crusher.cellY, shouldBeSolid ? COLLISION.solid : COLLISION.empty);
    }
  }

  /** A alavanca foi puxada: todas as prensas sobem e ficam lá em cima. Devolve quantas subiram. */
  raiseAll(now: number): number {
    let raised = 0;

    for (const crusher of this.crushers) {
      if (crusher.isRaised) {
        continue;
      }

      crusher.raisedFromPx = this.stateOf(crusher, now).offsetPx;
      crusher.isRaised = true;
      crusher.raisedAt = now;
      raised += 1;

      if (crusher.isHomeSolid) {
        crusher.isHomeSolid = false;
        this.grid.setCollision(crusher.cellX, crusher.cellY, COLLISION.empty);
      }
    }

    return raised;
  }
}

/** Blocos vazios embaixo da prensa até o primeiro firme (ou o fundo da fase). */
function countDrop(grid: TileGrid, cellX: number, cellY: number): number {
  let drop = 0;

  while (drop < CRUSHER.maxDropCells && grid.contains(cellX, cellY + drop + 1) && grid.collisionAt(cellX, cellY + drop + 1) === COLLISION.empty) {
    drop += 1;
  }

  return drop;
}
