import { TRACK_GRID, type GridCell, type TrackDefinition } from '../models/track.model';

/** Pontos da linha central por casa do circuito: o bastante para a curva parecer redonda. */
export const SAMPLES_PER_CELL = 6;

/** Meia largura do asfalto, em metros do jogo. */
export const ROAD_HALF_WIDTH = 5.6;

/**
 * Até onde o kart pode sair do asfalto antes de bater no muro invisível.
 *
 * Fica abaixo de meia casa de propósito: duas retas vizinhas na grade nunca
 * se encostam, então ninguém corta caminho pulando de uma para a outra.
 */
export const WALL_DISTANCE = TRACK_GRID.cellSize / 2 - 0.4;

/** Quantas amostras em volta da última posição conhecida o localizador olha. */
const SEARCH_WINDOW = SAMPLES_PER_CELL * 2;

/** Ponto da linha central, já com a direção da pista e a distância desde a largada. */
export interface CircuitSample {
  readonly x: number;
  readonly z: number;
  /** Direção da pista neste ponto, de comprimento 1. */
  readonly tangentX: number;
  readonly tangentZ: number;
  readonly distance: number;
}

/** Onde algo está em relação à pista. */
export interface TrackLocation {
  readonly index: number;
  /** Distância percorrida desde a largada, de 0 até o comprimento da volta. */
  readonly along: number;
  /** Afastamento do centro; positivo é à direita de quem corre. */
  readonly lateral: number;
}

/** O circuito pronto para correr: a linha central suave e o que fica nela. */
export interface Circuit {
  readonly samples: readonly CircuitSample[];
  readonly length: number;
  /** Distâncias, desde a largada, das placas de turbo. */
  readonly boostDistances: readonly number[];
  /** Distâncias, desde a largada, das fileiras de caixas de surpresa. */
  readonly itemDistances: readonly number[];
  readonly worldWidth: number;
  readonly worldDepth: number;
}

/** Centro da casa no mundo 3D. */
export function cellCenter(cell: GridCell): { readonly x: number; readonly z: number } {
  return {
    x: (cell.column + 0.5) * TRACK_GRID.cellSize,
    z: (cell.row + 0.5) * TRACK_GRID.cellSize,
  };
}

/**
 * Transforma o caminho de casas numa linha central suave.
 *
 * A curva (Catmull-Rom fechada) passa pelo centro de cada casa; numa esquina
 * da grade ela arredonda sozinha, sem o editor precisar de peças de curva.
 */
export function buildCircuit(track: TrackDefinition): Circuit {
  if (track.path.length < 3) {
    throw new Error(`A pista "${track.id}" precisa de pelo menos três casas.`);
  }

  const points = track.path.map(cellCenter);
  const positions = sampleClosedSpline(points);
  const samples = withTangentsAndDistances(positions);
  const last = samples[samples.length - 1];
  const closingGap = Math.hypot(samples[0].x - last.x, samples[0].z - last.z);
  const length = last.distance + closingGap;

  return {
    samples,
    length,
    boostDistances: track.boostCells.map((cell) => samples[cell * SAMPLES_PER_CELL].distance),
    itemDistances: track.itemCells.map((cell) => samples[cell * SAMPLES_PER_CELL].distance),
    worldWidth: TRACK_GRID.columns * TRACK_GRID.cellSize,
    worldDepth: TRACK_GRID.rows * TRACK_GRID.cellSize,
  };
}

/** Ponto da linha central a certa distância da largada, dando quantas voltas forem preciso. */
export function pointAt(circuit: Circuit, distance: number): CircuitSample {
  const along = wrapDistance(circuit, distance);
  const index = indexAtDistance(circuit, along);
  const sample = circuit.samples[index];
  const next = circuit.samples[(index + 1) % circuit.samples.length];
  const segmentEnd = index + 1 === circuit.samples.length ? circuit.length : next.distance;
  const segmentLength = segmentEnd - sample.distance;
  const blend = segmentLength > 0 ? (along - sample.distance) / segmentLength : 0;

  return {
    x: sample.x + (next.x - sample.x) * blend,
    z: sample.z + (next.z - sample.z) * blend,
    tangentX: sample.tangentX,
    tangentZ: sample.tangentZ,
    distance: along,
  };
}

/**
 * Onde um ponto do mundo está na pista.
 *
 * Com `hintIndex`, olha só em volta da última posição conhecida: assim um
 * kart numa reta nunca é confundido com a reta vizinha, por mais perto que
 * ela passe. Sem dica, procura no circuito inteiro.
 */
export function locate(circuit: Circuit, x: number, z: number, hintIndex?: number): TrackLocation {
  const { samples } = circuit;
  const count = samples.length;
  const firstOffset = hintIndex === undefined ? 0 : -SEARCH_WINDOW;
  const lastOffset = hintIndex === undefined ? count - 1 : SEARCH_WINDOW;
  const origin = hintIndex ?? 0;
  let bestIndex = origin;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let offset = firstOffset; offset <= lastOffset; offset += 1) {
    const index = (((origin + offset) % count) + count) % count;
    const sample = samples[index];
    const distance = (sample.x - x) ** 2 + (sample.z - z) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  const sample = samples[bestIndex];
  const offsetX = x - sample.x;
  const offsetZ = z - sample.z;
  const forward = offsetX * sample.tangentX + offsetZ * sample.tangentZ;
  // A direita de quem olha para (tx, tz) no plano do chão é (-tz, tx).
  const lateral = -offsetX * sample.tangentZ + offsetZ * sample.tangentX;

  return {
    index: bestIndex,
    along: wrapDistance(circuit, sample.distance + forward),
    lateral,
  };
}

/** Distância entre dois pontos da volta, sempre pelo caminho mais curto e com sinal. */
export function signedGap(circuit: Circuit, from: number, to: number): number {
  const half = circuit.length / 2;
  let gap = to - from;

  while (gap > half) {
    gap -= circuit.length;
  }

  while (gap < -half) {
    gap += circuit.length;
  }

  return gap;
}

export function wrapDistance(circuit: Circuit, distance: number): number {
  return ((distance % circuit.length) + circuit.length) % circuit.length;
}

function indexAtDistance(circuit: Circuit, along: number): number {
  const { samples } = circuit;
  let low = 0;
  let high = samples.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if (samples[middle].distance <= along) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
}

function sampleClosedSpline(points: readonly { readonly x: number; readonly z: number }[]): { x: number; z: number }[] {
  const count = points.length;
  const result: { x: number; z: number }[] = [];

  for (let index = 0; index < count; index += 1) {
    const previous = points[(index - 1 + count) % count];
    const current = points[index];
    const next = points[(index + 1) % count];
    const afterNext = points[(index + 2) % count];

    for (let step = 0; step < SAMPLES_PER_CELL; step += 1) {
      const t = step / SAMPLES_PER_CELL;

      result.push({
        x: catmullRom(previous.x, current.x, next.x, afterNext.x, t),
        z: catmullRom(previous.z, current.z, next.z, afterNext.z, t),
      });
    }
  }

  return result;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;

  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function withTangentsAndDistances(positions: readonly { readonly x: number; readonly z: number }[]): CircuitSample[] {
  const count = positions.length;
  const samples: CircuitSample[] = [];
  let distance = 0;

  for (let index = 0; index < count; index += 1) {
    const current = positions[index];
    const previous = positions[(index - 1 + count) % count];
    const next = positions[(index + 1) % count];
    const directionX = next.x - previous.x;
    const directionZ = next.z - previous.z;
    const size = Math.hypot(directionX, directionZ) || 1;

    if (index > 0) {
      distance += Math.hypot(current.x - previous.x, current.z - previous.z);
    }

    samples.push({
      x: current.x,
      z: current.z,
      tangentX: directionX / size,
      tangentZ: directionZ / size,
      distance,
    });
  }

  return samples;
}
