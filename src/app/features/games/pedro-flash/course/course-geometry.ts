import { cellCenter } from '../../pedro-kart/simulation/circuit';
import type { CourseDefinition, Lane } from '../models/course.model';

/** Pontos da linha central por casa: o bastante para a curva parecer redonda. */
export const SAMPLES_PER_CELL = 8;

/** Meia largura da pista, em metros do jogo. */
export const ROAD_HALF_WIDTH = 5.2;

/** Distância entre o centro de duas faixas vizinhas. */
export const LANE_WIDTH = 3.2;

/** A pista é uma estrada suspensa: o chão do cenário fica esta altura abaixo dela. */
export const ROAD_HEIGHT = 4;

export const LOOP_RADIUS = 7;

/** Meio comprimento do vão de um buraco: menos que meia casa, para sobrar chão dos dois lados. */
const GAP_HALF_LENGTH = 6;

const LOOP_SAMPLES = 64;

/**
 * Quanto o looping anda de lado até completar a volta.
 *
 * Sem esse desvio, a descida do looping cairia em cima da própria entrada.
 * Depois da volta a pista faz um "S" suave e retorna para o meio da casa.
 */
const LOOP_SHIFT = 12;
const LOOP_EXIT_LENGTH = 34;

/** Uma casa de pista antes da largada, para o grid, e três depois da chegada, para frear. */
const LEAD_IN_CELLS = 1;
const RUN_OUT_CELLS = 3;

/**
 * Um ponto da linha central com o seu referencial: para onde a pista vai,
 * para onde é "em cima" e para onde é a direita de quem corre.
 *
 * No looping o "em cima" gira junto com a pista: é isso que deixa o Pedro
 * correr de cabeça para baixo sem cair.
 */
export interface CourseFrame {
  x: number;
  y: number;
  z: number;
  tangentX: number;
  tangentY: number;
  tangentZ: number;
  upX: number;
  upY: number;
  upZ: number;
  rightX: number;
  rightY: number;
  rightZ: number;
  /** Distância desde o começo da pista. */
  distance: number;
}

export type CourseSample = Readonly<CourseFrame>;

export interface DistanceRange {
  readonly start: number;
  readonly end: number;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/** A fase pronta para correr: a linha central em 3D e onde fica cada coisa nela. */
export interface Course {
  readonly definition: CourseDefinition;
  readonly samples: readonly CourseSample[];
  readonly length: number;
  readonly isCircuit: boolean;
  /** Onde fica a linha de largada. */
  readonly startDistance: number;
  /** Onde fica a chegada; na arena, que não tem chegada, é o comprimento da volta. */
  readonly goalDistance: number;
  /** Distância do centro de cada casa do caminho; no looping, a entrada dele. */
  readonly cellDistances: readonly number[];
  readonly gaps: readonly DistanceRange[];
  readonly loops: readonly DistanceRange[];
  readonly bounds: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number };
}

interface FlatPoint {
  readonly x: number;
  readonly z: number;
}

interface LiftedPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly upX: number;
  readonly upY: number;
  readonly upZ: number;
}

/**
 * Transforma o caminho de casas na estrada 3D.
 *
 * A curva (Catmull-Rom) passa pelo centro de cada casa, como no Pedro Kart;
 * depois a linha é levantada à altura da estrada e, em cada looping, ganha
 * uma volta vertical inteira.
 */
export function buildCourse(definition: CourseDefinition): Course {
  if (definition.path.length < 3) {
    throw new Error(`A fase "${definition.id}" precisa de pelo menos três casas.`);
  }

  const centers = definition.path.map(cellCenter);
  const controls = definition.isCircuit ? centers : extendOpenPath(centers);
  const flat = definition.isCircuit ? sampleClosedSpline(controls) : sampleOpenSpline(controls);
  const firstCellIndex = definition.isCircuit ? 0 : LEAD_IN_CELLS * SAMPLES_PER_CELL;
  const flatIndexOfCell = (cell: number): number => firstCellIndex + cell * SAMPLES_PER_CELL;
  const loopFlatIndexes = new Set(
    definition.pieces.filter((piece) => piece.kind === 'loop').map((piece) => flatIndexOfCell(piece.cell)),
  );
  const { points, sampleOfFlat, loopEnds } = liftTo3d(flat, definition.isCircuit, loopFlatIndexes);
  const samples = withFrames(points, definition.isCircuit);
  const last = samples[samples.length - 1];
  const closingGap = definition.isCircuit ? Math.hypot(samples[0].x - last.x, samples[0].y - last.y, samples[0].z - last.z) : 0;
  const length = last.distance + closingGap;
  const cellDistances = definition.path.map((_, cell) => samples[sampleOfFlat[flatIndexOfCell(cell)]].distance);

  return {
    definition,
    samples,
    length,
    isCircuit: definition.isCircuit,
    startDistance: definition.isCircuit ? 0 : cellDistances[0],
    goalDistance: definition.isCircuit ? length : cellDistances[cellDistances.length - 1],
    cellDistances,
    gaps: definition.pieces
      .filter((piece) => piece.kind === 'buraco')
      .map((piece) => ({
        start: cellDistances[piece.cell] - GAP_HALF_LENGTH,
        end: cellDistances[piece.cell] + GAP_HALF_LENGTH,
      })),
    loops: [...loopEnds].map(([flatIndex, endSample]) => ({
      start: samples[sampleOfFlat[flatIndex]].distance,
      end: samples[endSample].distance,
    })),
    bounds: boundsOf(samples),
  };
}

export function createFrame(): CourseFrame {
  return {
    x: 0,
    y: 0,
    z: 0,
    tangentX: 0,
    tangentY: 0,
    tangentZ: 1,
    upX: 0,
    upY: 1,
    upZ: 0,
    rightX: -1,
    rightY: 0,
    rightZ: 0,
    distance: 0,
  };
}

/**
 * Referencial da pista a certa distância, misturando os dois pontos vizinhos.
 *
 * Escreve em `out` em vez de criar um objeto: o desenho chama isto dezenas
 * de vezes por quadro.
 */
export function sampleFrame(course: Course, distance: number, out: CourseFrame = createFrame()): CourseFrame {
  const along = course.isCircuit ? wrapDistance(course, distance) : Math.min(course.length, Math.max(0, distance));
  const { samples } = course;
  const index = indexAtDistance(samples, along);
  const isLast = index === samples.length - 1;
  const next = isLast ? (course.isCircuit ? samples[0] : samples[index]) : samples[index + 1];
  const current = samples[index];
  const segmentEnd = isLast ? course.length : next.distance;
  const segmentLength = segmentEnd - current.distance;
  const blend = segmentLength > 0 ? Math.min(1, (along - current.distance) / segmentLength) : 0;

  const [tangentX, tangentY, tangentZ] = blendDirection(
    [current.tangentX, current.tangentY, current.tangentZ],
    [next.tangentX, next.tangentY, next.tangentZ],
    blend,
  );
  const [upX, upY, upZ] = blendDirection([current.upX, current.upY, current.upZ], [next.upX, next.upY, next.upZ], blend);
  const [rightX, rightY, rightZ] = blendDirection(
    [current.rightX, current.rightY, current.rightZ],
    [next.rightX, next.rightY, next.rightZ],
    blend,
  );

  out.x = lerp(current.x, next.x, blend);
  out.y = lerp(current.y, next.y, blend);
  out.z = lerp(current.z, next.z, blend);
  out.tangentX = tangentX;
  out.tangentY = tangentY;
  out.tangentZ = tangentZ;
  out.upX = upX;
  out.upY = upY;
  out.upZ = upZ;
  out.rightX = rightX;
  out.rightY = rightY;
  out.rightZ = rightZ;
  out.distance = along;

  return out;
}

/** Ponto do mundo a partir de um referencial, de um afastamento para o lado e de uma altura. */
export function worldPoint(frame: CourseFrame, lateral: number, height: number, out: WorldPoint = { x: 0, y: 0, z: 0 }): WorldPoint {
  out.x = frame.x + frame.rightX * lateral + frame.upX * height;
  out.y = frame.y + frame.rightY * lateral + frame.upY * height;
  out.z = frame.z + frame.rightZ * lateral + frame.upZ * height;

  return out;
}

/** Distância de `from` até `to` ao longo da pista; na arena, pelo caminho mais curto da volta. */
export function courseGap(course: Course, from: number, to: number): number {
  const gap = to - from;

  if (!course.isCircuit) {
    return gap;
  }

  const half = course.length / 2;

  return ((((gap + half) % course.length) + course.length) % course.length) - half;
}

export function wrapDistance(course: Course, distance: number): number {
  if (!course.isCircuit) {
    return distance;
  }

  return ((distance % course.length) + course.length) % course.length;
}

export function laneOffset(lane: Lane): number {
  return lane * LANE_WIDTH;
}

export function isOverGap(course: Course, distance: number): boolean {
  return course.gaps.some((gap) => distance > gap.start && distance < gap.end);
}

/** Começo do próximo buraco à frente, se houver um dentro de `range` metros. */
export function nextGapStart(course: Course, distance: number, range: number): number | null {
  for (const gap of course.gaps) {
    const ahead = gap.start - distance;

    if (ahead >= 0 && ahead <= range) {
      return gap.start;
    }
  }

  return null;
}

/**
 * Pontos de controle da fase aberta.
 *
 * Uma casa a mais antes da largada e três depois da chegada, seguindo a
 * direção das pontas: o grid tem onde ficar, e quem cruza a chegada tem
 * estrada para frear.
 */
function extendOpenPath(centers: readonly FlatPoint[]): FlatPoint[] {
  const first = centers[0];
  const second = centers[1];
  const last = centers[centers.length - 1];
  const beforeLast = centers[centers.length - 2];
  const leadIn = Array.from({ length: LEAD_IN_CELLS }, (_, index) => {
    const steps = LEAD_IN_CELLS - index;

    return { x: first.x - (second.x - first.x) * steps, z: first.z - (second.z - first.z) * steps };
  });
  const runOut = Array.from({ length: RUN_OUT_CELLS }, (_, index) => ({
    x: last.x + (last.x - beforeLast.x) * (index + 1),
    z: last.z + (last.z - beforeLast.z) * (index + 1),
  }));

  return [...leadIn, ...centers, ...runOut];
}

function sampleOpenSpline(points: readonly FlatPoint[]): FlatPoint[] {
  const result: FlatPoint[] = [];
  const count = points.length;

  for (let index = 0; index < count - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] ?? { x: 2 * current.x - next.x, z: 2 * current.z - next.z };
    const afterNext = points[index + 2] ?? { x: 2 * next.x - current.x, z: 2 * next.z - current.z };

    for (let step = 0; step < SAMPLES_PER_CELL; step += 1) {
      result.push(catmullRomPoint(previous, current, next, afterNext, step / SAMPLES_PER_CELL));
    }
  }

  result.push(points[count - 1]);

  return result;
}

function sampleClosedSpline(points: readonly FlatPoint[]): FlatPoint[] {
  const result: FlatPoint[] = [];
  const count = points.length;

  for (let index = 0; index < count; index += 1) {
    const previous = points[(index - 1 + count) % count];
    const current = points[index];
    const next = points[(index + 1) % count];
    const afterNext = points[(index + 2) % count];

    for (let step = 0; step < SAMPLES_PER_CELL; step += 1) {
      result.push(catmullRomPoint(previous, current, next, afterNext, step / SAMPLES_PER_CELL));
    }
  }

  return result;
}

function catmullRomPoint(p0: FlatPoint, p1: FlatPoint, p2: FlatPoint, p3: FlatPoint, t: number): FlatPoint {
  return { x: catmullRom(p0.x, p1.x, p2.x, p3.x, t), z: catmullRom(p0.z, p1.z, p2.z, p3.z, t) };
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;

  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * Levanta a linha do chão para a altura da estrada e encaixa os loopings.
 *
 * Devolve, para cada ponto do traçado plano, qual ponto 3D ele virou — o
 * looping acrescenta pontos no meio, e as casas depois dele mudam de número.
 */
function liftTo3d(
  flat: readonly FlatPoint[],
  isCircuit: boolean,
  loopIndexes: ReadonlySet<number>,
): { points: LiftedPoint[]; sampleOfFlat: number[]; loopEnds: Map<number, number> } {
  const points: LiftedPoint[] = [];
  const sampleOfFlat: number[] = [];
  const loopEnds = new Map<number, number>();
  const flatDistances = cumulativeFlatDistances(flat);
  const loopStarts: number[] = [];

  for (let index = 0; index < flat.length; index += 1) {
    const { tangentX, tangentZ } = flatTangent(flat, index, isCircuit);
    const rightX = -tangentZ;
    const rightZ = tangentX;
    const offset = loopStarts.reduce(
      (sum, start) => sum + LOOP_SHIFT * (1 - smoothstep((flatDistances[index] - flatDistances[start]) / LOOP_EXIT_LENGTH)),
      0,
    );
    const base = { x: flat[index].x + rightX * offset, y: ROAD_HEIGHT, z: flat[index].z + rightZ * offset };

    sampleOfFlat.push(points.length);
    points.push({ ...base, upX: 0, upY: 1, upZ: 0 });

    if (!loopIndexes.has(index)) {
      continue;
    }

    for (let step = 1; step <= LOOP_SAMPLES; step += 1) {
      const progress = step / LOOP_SAMPLES;
      const angle = progress * Math.PI * 2;
      const forward = LOOP_RADIUS * Math.sin(angle);
      const height = LOOP_RADIUS * (1 - Math.cos(angle));
      const side = LOOP_SHIFT * smoothstep(progress);

      points.push({
        x: base.x + tangentX * forward + rightX * side,
        y: base.y + height,
        z: base.z + tangentZ * forward + rightZ * side,
        upX: -tangentX * Math.sin(angle),
        upY: Math.cos(angle),
        upZ: -tangentZ * Math.sin(angle),
      });
    }

    loopEnds.set(index, points.length - 1);
    loopStarts.push(index);
  }

  return { points, sampleOfFlat, loopEnds };
}

function withFrames(points: readonly LiftedPoint[], isCircuit: boolean): CourseSample[] {
  const count = points.length;
  const samples: CourseSample[] = [];
  let distance = 0;

  for (let index = 0; index < count; index += 1) {
    const current = points[index];
    const previous = isCircuit ? points[(index - 1 + count) % count] : points[Math.max(0, index - 1)];
    const next = isCircuit ? points[(index + 1) % count] : points[Math.min(count - 1, index + 1)];

    if (index > 0) {
      const before = points[index - 1];

      distance += Math.hypot(current.x - before.x, current.y - before.y, current.z - before.z);
    }

    const [tangentX, tangentY, tangentZ] = normalize(next.x - previous.x, next.y - previous.y, next.z - previous.z);
    const along = current.upX * tangentX + current.upY * tangentY + current.upZ * tangentZ;
    const [upX, upY, upZ] = normalize(current.upX - tangentX * along, current.upY - tangentY * along, current.upZ - tangentZ * along);

    // A direita é frente × cima: no chão plano, quem corre para +z tem a direita em -x.
    const [rightX, rightY, rightZ] = normalize(
      tangentY * upZ - tangentZ * upY,
      tangentZ * upX - tangentX * upZ,
      tangentX * upY - tangentY * upX,
    );

    samples.push({
      x: current.x,
      y: current.y,
      z: current.z,
      tangentX,
      tangentY,
      tangentZ,
      upX,
      upY,
      upZ,
      rightX,
      rightY,
      rightZ,
      distance,
    });
  }

  return samples;
}

function flatTangent(flat: readonly FlatPoint[], index: number, isCircuit: boolean): { tangentX: number; tangentZ: number } {
  const count = flat.length;
  const previous = isCircuit ? flat[(index - 1 + count) % count] : flat[Math.max(0, index - 1)];
  const next = isCircuit ? flat[(index + 1) % count] : flat[Math.min(count - 1, index + 1)];
  const [tangentX, , tangentZ] = normalize(next.x - previous.x, 0, next.z - previous.z);

  return { tangentX, tangentZ };
}

function cumulativeFlatDistances(flat: readonly FlatPoint[]): number[] {
  const distances = [0];

  for (let index = 1; index < flat.length; index += 1) {
    distances.push(distances[index - 1] + Math.hypot(flat[index].x - flat[index - 1].x, flat[index].z - flat[index - 1].z));
  }

  return distances;
}

function indexAtDistance(samples: readonly CourseSample[], along: number): number {
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

function boundsOf(samples: readonly CourseSample[]): Course['bounds'] {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const sample of samples) {
    minX = Math.min(minX, sample.x);
    maxX = Math.max(maxX, sample.x);
    minZ = Math.min(minZ, sample.z);
    maxZ = Math.max(maxZ, sample.z);
  }

  return { minX, maxX, minZ, maxZ };
}

type Vector = readonly [number, number, number];

function blendDirection(from: Vector, to: Vector, blend: number): Vector {
  return normalize(lerp(from[0], to[0], blend), lerp(from[1], to[1], blend), lerp(from[2], to[2], blend));
}

function normalize(x: number, y: number, z: number): Vector {
  const size = Math.hypot(x, y, z) || 1;

  return [x / size, y / size, z / size];
}

function lerp(from: number, to: number, blend: number): number {
  return from + (to - from) * blend;
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));

  return t * t * (3 - 2 * t);
}
