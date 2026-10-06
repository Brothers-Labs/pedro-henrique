import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { kartBody, RIVALS } from '../config/kart.config';
import type { KartSetup } from '../models/kart.model';
import type { TrackDefinition } from '../models/track.model';
import {
  buildCircuit,
  locate,
  pointAt,
  ROAD_HALF_WIDTH,
  signedGap,
  WALL_DISTANCE,
  wrapDistance,
  type Circuit,
} from './circuit';
import { clamp, handlingFor, IDLE_DRIVE, Kart, KART_PHYSICS, type DriveInput, type KartItem } from './kart';
import { RivalDriver } from './rival-driver';

/** Passo fixo da física: sessenta vezes por segundo em qualquer tela. */
export const RACE_STEP_MS = 1000 / 60;
const STEP_SECONDS = RACE_STEP_MS / 1000;

export const COUNTDOWN_MS = 3000;

export const PLAYER_KART_ID = 'pedro';

/** Fileiras de caixas: três lado a lado, para dar para pegar mesmo fora do meio. */
const ITEM_BOX_LANES: readonly number[] = [-3.2, 0, 3.2];
const ITEM_BOX_RADIUS = 1.9;
const ITEM_BOX_RESPAWN_MS = 3000;

const BOOST_PAD_HALF_LENGTH = 3;
const BOOST_PAD_HALF_WIDTH = 3.4;

const PEEL_RADIUS = 1.5;
const MAX_PEELS = 8;
/** A casca recém-largada não pega quem largou: senão o próprio kart escorregaria nela. */
const PEEL_ARMING_MS = 600;

/** Grid de largada: duas colunas, fileiras para trás da linha. */
const GRID_LANE = 2.4;
const GRID_FIRST_ROW = 4;
const GRID_ROW_GAP = 5;
/** O Pedro larga no meio do pelotão: dá para ultrapassar, sem ficar sozinho no fim. */
const PLAYER_GRID_SLOT = 3;

export type RacePhase = 'contagem' | 'correndo' | 'terminou';

export interface RaceSetup {
  readonly track: TrackDefinition;
  readonly playerSetup: KartSetup;
  readonly playerName: string;
  /** Fração da velocidade máxima que os adversários usam. */
  readonly rivalPace: number;
  readonly seed?: number;
}

export interface ItemBox {
  readonly x: number;
  readonly z: number;
  /** Momento da corrida em que a caixa volta; zero quando ela está na pista. */
  respawnAtMs: number;
}

export interface Peel {
  readonly x: number;
  readonly z: number;
  readonly ownerId: string;
  readonly droppedAtMs: number;
}

export interface RaceResult {
  readonly placement: number;
  readonly racers: number;
  readonly timeMs: number;
  readonly bestLapMs: number | null;
}

export type RaceEvent =
  | { readonly type: 'contagem'; readonly value: number }
  | { readonly type: 'largada' }
  | { readonly type: 'volta'; readonly lap: number; readonly totalLaps: number }
  | { readonly type: 'item'; readonly item: KartItem }
  | { readonly type: 'item-usado'; readonly item: KartItem }
  | { readonly type: 'turbo' }
  | { readonly type: 'rodou' }
  | { readonly type: 'batida' }
  | { readonly type: 'chegada'; readonly result: RaceResult };

/** O que o painel da corrida mostra. */
export interface RaceHud {
  readonly phase: RacePhase;
  /** Volta que o Pedro está correndo, de 1 até o total. */
  readonly lap: number;
  readonly totalLaps: number;
  readonly position: number;
  readonly racers: number;
  readonly item: KartItem | null;
  readonly elapsedMs: number;
}

/**
 * A corrida inteira, sem desenho nenhum.
 *
 * Recebe o volante do Pedro a cada passo e cuida do resto: adversários,
 * voltas, caixas de surpresa, turbos e cascas. Por não saber nada de tela,
 * dá para testar uma corrida inteira em milissegundos.
 */
export class RaceSimulation {
  readonly circuit: Circuit;
  readonly karts: readonly Kart[];
  readonly player: Kart;
  readonly itemBoxes: readonly ItemBox[];
  readonly peels: Peel[] = [];

  private readonly drivers: ReadonlyMap<string, RivalDriver>;
  private readonly autopilot: RivalDriver;
  private readonly random: SeededRandom;
  private readonly events: RaceEvent[] = [];
  private readonly finishOrder: string[] = [];
  private phaseState: RacePhase = 'contagem';
  private clockMs = 0;
  private lastCountdownValue = 0;

  constructor(private readonly setup: RaceSetup) {
    this.circuit = buildCircuit(setup.track);
    this.random = new SeededRandom(setup.seed ?? Date.now());
    this.player = new Kart(PLAYER_KART_ID, setup.playerName, handlingFor(kartBody(setup.playerSetup.body).stats), true);

    const rivals = RIVALS.map(
      (rival) => new Kart(rival.id, rival.name, handlingFor(kartBody(rival.setup.body).stats), false),
    );
    const karts = [...rivals];

    karts.splice(PLAYER_GRID_SLOT, 0, this.player);
    this.karts = karts;
    this.drivers = new Map(
      rivals.map((kart, index) => [kart.id, new RivalDriver(this.circuit, laneFor(index), this.random)]),
    );
    this.autopilot = new RivalDriver(this.circuit, 0, this.random);
    this.itemBoxes = this.createItemBoxes();
    this.placeOnGrid();
  }

  get phase(): RacePhase {
    return this.phaseState;
  }

  /** Relógio da simulação desde o primeiro passo, contagem incluída: é o das caixas e cascas. */
  get timeMs(): number {
    return this.clockMs;
  }

  /** Tempo de corrida desde a largada; zero durante a contagem. */
  get elapsedMs(): number {
    return Math.max(0, this.clockMs - COUNTDOWN_MS);
  }

  get totalLaps(): number {
    return this.setup.track.laps;
  }

  hud(): RaceHud {
    return {
      phase: this.phaseState,
      lap: clamp(this.player.lap + 1, 1, this.totalLaps),
      totalLaps: this.totalLaps,
      position: this.positionOf(this.player),
      racers: this.karts.length,
      item: this.player.item,
      elapsedMs: this.player.finishTimeMs ?? this.elapsedMs,
    };
  }

  /** Karts na ordem da classificação: quem chegou primeiro e, depois, quem está na frente. */
  standings(): readonly Kart[] {
    const length = this.circuit.length;

    return [...this.karts].sort((first, second) => {
      const firstFinish = this.finishOrder.indexOf(first.id);
      const secondFinish = this.finishOrder.indexOf(second.id);

      if (firstFinish !== -1 || secondFinish !== -1) {
        return (firstFinish === -1 ? Infinity : firstFinish) - (secondFinish === -1 ? Infinity : secondFinish);
      }

      return second.raceDistance(length) - first.raceDistance(length);
    });
  }

  positionOf(kart: Kart): number {
    return this.standings().indexOf(kart) + 1;
  }

  /** Entrega e esvazia a fila de acontecimentos desde a última leitura. */
  drainEvents(): readonly RaceEvent[] {
    return this.events.splice(0, this.events.length);
  }

  step(input: DriveInput): void {
    this.clockMs += RACE_STEP_MS;

    if (this.phaseState === 'contagem') {
      this.tickCountdown();
      return;
    }

    for (const kart of this.karts) {
      this.driveKart(kart, this.inputFor(kart, input));
    }

    this.resolveKartContacts();
  }

  private tickCountdown(): void {
    const remaining = COUNTDOWN_MS - this.clockMs;
    const value = Math.ceil(remaining / 1000);

    if (remaining <= 0) {
      this.phaseState = 'correndo';
      this.events.push({ type: 'largada' });
      return;
    }

    if (value !== this.lastCountdownValue) {
      this.lastCountdownValue = value;
      this.events.push({ type: 'contagem', value });
    }
  }

  private inputFor(kart: Kart, playerInput: DriveInput): DriveInput {
    if (kart.isPlayer && !kart.hasFinished) {
      return playerInput;
    }

    const driver = kart.isPlayer ? this.autopilot : this.drivers.get(kart.id);

    return driver ? driver.decide(kart, this.karts) : IDLE_DRIVE;
  }

  private paceFor(kart: Kart): number {
    if (kart.isPlayer) {
      return kart.hasFinished ? 0.7 : 1;
    }

    return this.setup.rivalPace * rubberBand(signedRaceGap(this, kart));
  }

  private driveKart(kart: Kart, input: DriveInput): void {
    const previousAlong = kart.along;

    if (input.useItem && kart.item) {
      this.useItem(kart, kart.item);
    }

    kart.drive(input, STEP_SECONDS, this.paceFor(kart));
    this.keepInsideWalls(kart);
    this.countLap(kart, previousAlong);
    this.touchBoostPads(kart);
    this.touchItemBoxes(kart);
    this.touchPeels(kart);
  }

  private keepInsideWalls(kart: Kart): void {
    let location = locate(this.circuit, kart.x, kart.z, kart.trackIndex);
    const isAtWall = Math.abs(location.lateral) > WALL_DISTANCE;

    if (isAtWall) {
      const center = pointAt(this.circuit, location.along);
      const lateral = Math.sign(location.lateral) * WALL_DISTANCE;

      kart.bounceInside(center.x - center.tangentZ * lateral, center.z + center.tangentX * lateral);
      location = { ...location, lateral };

      // Raspar no muro dura vários passos; o aviso sai só no momento da batida.
      if (kart.isPlayer && !kart.isTouchingWall) {
        this.events.push({ type: 'batida' });
      }
    }

    kart.isTouchingWall = isAtWall;

    kart.trackIndex = location.index;
    kart.along = location.along;
    kart.lateral = location.lateral;
    kart.isOnGrass = Math.abs(location.lateral) > ROAD_HALF_WIDTH;
  }

  /**
   * Conta a volta quando o kart cruza a linha de chegada.
   *
   * Cruzar de ré desconta: assim ninguém ganha volta indo e voltando em
   * cima da linha.
   */
  private countLap(kart: Kart, previousAlong: number): void {
    const length = this.circuit.length;
    const crossedForward = previousAlong > length * 0.75 && kart.along < length * 0.25;
    const crossedBackward = previousAlong < length * 0.25 && kart.along > length * 0.75;

    if (crossedBackward) {
      kart.lap -= 1;
      return;
    }

    if (!crossedForward || kart.hasFinished) {
      return;
    }

    kart.lap += 1;

    if (kart.lap >= 1) {
      const lapMs = this.elapsedMs - kart.lapStartedAtMs;
      kart.bestLapMs = kart.bestLapMs === null ? lapMs : Math.min(kart.bestLapMs, lapMs);
    }

    kart.lapStartedAtMs = this.elapsedMs;

    if (kart.lap >= this.totalLaps) {
      this.finish(kart);
    } else if (kart.isPlayer && kart.lap >= 1) {
      this.events.push({ type: 'volta', lap: kart.lap + 1, totalLaps: this.totalLaps });
    }
  }

  private finish(kart: Kart): void {
    kart.finishTimeMs = this.elapsedMs;
    this.finishOrder.push(kart.id);

    if (!kart.isPlayer) {
      return;
    }

    this.phaseState = 'terminou';
    this.events.push({
      type: 'chegada',
      result: {
        placement: this.finishOrder.length,
        racers: this.karts.length,
        timeMs: kart.finishTimeMs,
        bestLapMs: kart.bestLapMs,
      },
    });
  }

  private touchBoostPads(kart: Kart): void {
    if (Math.abs(kart.lateral) > BOOST_PAD_HALF_WIDTH || kart.boostSeconds > KART_PHYSICS.boostSeconds * 0.5) {
      return;
    }

    const isOnPad = this.circuit.boostDistances.some(
      (distance) => Math.abs(signedGap(this.circuit, distance, kart.along)) < BOOST_PAD_HALF_LENGTH,
    );

    if (isOnPad) {
      kart.startBoost();

      if (kart.isPlayer) {
        this.events.push({ type: 'turbo' });
      }
    }
  }

  private touchItemBoxes(kart: Kart): void {
    for (const box of this.itemBoxes) {
      if (box.respawnAtMs > this.clockMs) {
        continue;
      }

      if (Math.hypot(box.x - kart.x, box.z - kart.z) > ITEM_BOX_RADIUS) {
        continue;
      }

      box.respawnAtMs = this.clockMs + ITEM_BOX_RESPAWN_MS;

      if (kart.item === null) {
        kart.item = this.rollItem(kart);

        if (kart.isPlayer) {
          this.events.push({ type: 'item', item: kart.item });
        }
      }
    }
  }

  private touchPeels(kart: Kart): void {
    const index = this.peels.findIndex(
      (peel) =>
        Math.hypot(peel.x - kart.x, peel.z - kart.z) < PEEL_RADIUS &&
        (peel.ownerId !== kart.id || this.clockMs - peel.droppedAtMs > PEEL_ARMING_MS),
    );

    if (index === -1) {
      return;
    }

    this.peels.splice(index, 1);

    if (kart.spinOut() && kart.isPlayer) {
      this.events.push({ type: 'rodou' });
    }
  }

  /**
   * Sorteio da caixa de surpresa.
   *
   * Quem está lá atrás ganha mais turbo e estrela, e quem lidera ganha mais
   * casca: é o empurrãozinho que deixa a corrida emocionante até o fim.
   */
  private rollItem(kart: Kart): KartItem {
    const isLeading = this.positionOf(kart) === 1;

    return this.random.weighted<KartItem>(
      isLeading
        ? [
            ['casca', 5],
            ['turbo', 4],
            ['estrela', 1],
          ]
        : [
            ['turbo', 5],
            ['casca', 3],
            ['estrela', 2],
          ],
    );
  }

  private useItem(kart: Kart, item: KartItem): void {
    kart.item = null;

    switch (item) {
      case 'turbo':
        kart.startBoost();
        break;
      case 'estrela':
        kart.startStar();
        break;
      case 'casca':
        this.dropPeel(kart);
        break;
    }

    if (kart.isPlayer) {
      this.events.push({ type: 'item-usado', item });
    }
  }

  private dropPeel(kart: Kart): void {
    if (this.peels.length >= MAX_PEELS) {
      this.peels.shift();
    }

    this.peels.push({
      x: kart.x - Math.sin(kart.heading) * 2.4,
      z: kart.z - Math.cos(kart.heading) * 2.4,
      ownerId: kart.id,
      droppedAtMs: this.clockMs,
    });
  }

  /** Karts que se encostam se afastam; quem está com estrela derruba o outro. */
  private resolveKartContacts(): void {
    const minimum = KART_PHYSICS.radius * 2;

    for (let first = 0; first < this.karts.length; first += 1) {
      for (let second = first + 1; second < this.karts.length; second += 1) {
        const a = this.karts[first];
        const b = this.karts[second];
        const offsetX = b.x - a.x;
        const offsetZ = b.z - a.z;
        const distance = Math.hypot(offsetX, offsetZ);

        if (distance >= minimum || distance === 0) {
          continue;
        }

        const push = (minimum - distance) / 2;
        const normalX = offsetX / distance;
        const normalZ = offsetZ / distance;

        a.x -= normalX * push;
        a.z -= normalZ * push;
        b.x += normalX * push;
        b.z += normalZ * push;
        this.knockDown(a, b);
        this.knockDown(b, a);
      }
    }
  }

  private knockDown(attacker: Kart, target: Kart): void {
    if (attacker.hasStar && target.spinOut() && target.isPlayer) {
      this.events.push({ type: 'rodou' });
    }
  }

  private createItemBoxes(): ItemBox[] {
    return this.circuit.itemDistances.flatMap((distance) => {
      const center = pointAt(this.circuit, distance);

      return ITEM_BOX_LANES.map((lateral) => ({
        x: center.x - center.tangentZ * lateral,
        z: center.z + center.tangentX * lateral,
        respawnAtMs: 0,
      }));
    });
  }

  private placeOnGrid(): void {
    this.karts.forEach((kart, slot) => {
      const row = Math.floor(slot / 2);
      const lateral = slot % 2 === 0 ? -GRID_LANE : GRID_LANE;
      const distance = wrapDistance(this.circuit, -(GRID_FIRST_ROW + row * GRID_ROW_GAP));
      const center = pointAt(this.circuit, distance);

      kart.placeAt(
        center.x - center.tangentZ * lateral,
        center.z + center.tangentX * lateral,
        Math.atan2(center.tangentX, center.tangentZ),
      );

      const location = locate(this.circuit, kart.x, kart.z);
      kart.trackIndex = location.index;
      kart.along = location.along;
      kart.lateral = location.lateral;
    });
  }
}

/** Cada adversário corre numa faixa própria, para não virarem uma fila indiana. */
function laneFor(index: number): number {
  const lanes = [-2.6, 1.8, -0.8, 2.8, 0.6];

  return lanes[index % lanes.length];
}

/** Quanto o adversário está à frente (positivo) ou atrás do Pedro, em metros de corrida. */
function signedRaceGap(race: RaceSimulation, kart: Kart): number {
  const length = race.circuit.length;

  return kart.raceDistance(length) - race.player.raceDistance(length);
}

/**
 * Elástico de corrida.
 *
 * Quem dispara na frente tira um pouco o pé, e quem fica muito para trás
 * ganha um fôlego: o Pedro quase sempre tem alguém por perto para ultrapassar.
 */
export function rubberBand(gapToPlayer: number): number {
  if (gapToPlayer > 40) {
    return 0.88;
  }

  if (gapToPlayer < -60) {
    return 1.1;
  }

  return 1;
}
