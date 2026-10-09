/**
 * Geometria da trilha do mapa.
 *
 * Tudo aqui é medido numa prancheta de largura fixa (`TRAIL_WIDTH`); a tela
 * estica a prancheta para a largura disponível mantendo a proporção. Assim o
 * mesmo cálculo serve ao celular, ao tablet e ao computador, e nenhuma
 * posição depende de quantas fases o mundo tem.
 */

export const TRAIL_WIDTH = 1000;

export interface TrailPoint {
  readonly x: number;
  readonly y: number;
}

export interface TrailLayout {
  readonly width: number;
  readonly height: number;
  readonly points: readonly TrailPoint[];
  /** Um trecho de curva por par de fases vizinhas, em sintaxe de `path` SVG. */
  readonly segments: readonly string[];
  /** Pontos livres, longe da trilha, onde cabem enfeites. */
  readonly decorationSpots: readonly TrailPoint[];
  /** Altura do rio, quando o cenário tem um. */
  readonly riverY: number;
}

/** Margem acima da primeira e abaixo da última fileira, com folga para o guardião e o rótulo. */
const VERTICAL_PADDING = 190;
const SIDE_MARGIN = 120;

/** Distância entre fileiras: maior numa coluna só, onde cada fase é uma fileira. */
const ROW_HEIGHT_SINGLE_COLUMN = 340;
const ROW_HEIGHT_MULTI_COLUMN = 300;

/** Sobe e desce das fases numa mesma fileira, para a trilha não parecer régua. */
const ROW_WOBBLE = 36;

/** Quanto a trilha vertical balança para os lados. */
const ZIGZAG_AMPLITUDE = 230;
const ZIGZAG_FREQUENCY = 1.25;

const DECORATION_GRID = 150;
const DECORATION_CLEARANCE = 120;
const CURVE_SAMPLES = [0.25, 0.5, 0.75];

/**
 * Posiciona `count` fases em `columns` colunas.
 *
 * Com uma coluna a trilha desce balançando (celular); com mais, ela serpenteia
 * em fileiras que alternam de sentido, como um caminho de tabuleiro.
 */
export function buildTrailLayout(count: number, columns: number): TrailLayout {
  const safeCount = Math.max(0, Math.trunc(count));
  const safeColumns = Math.max(1, Math.trunc(columns));

  const points = safeColumns === 1 ? zigzagPoints(safeCount) : serpentinePoints(safeCount, safeColumns);
  const rows = safeColumns === 1 ? safeCount : Math.ceil(safeCount / safeColumns);
  const rowHeight = safeColumns === 1 ? ROW_HEIGHT_SINGLE_COLUMN : ROW_HEIGHT_MULTI_COLUMN;
  const height = VERTICAL_PADDING * 2 + Math.max(0, rows - 1) * rowHeight;
  const segments = buildSegments(points);

  return {
    width: TRAIL_WIDTH,
    height,
    points,
    segments,
    decorationSpots: findDecorationSpots(points, height),
    riverY: height * 0.55,
  };
}

/** Caminho completo, ou só até a fase `untilIndex`, pronto para o atributo `d`. */
export function trailPath(layout: TrailLayout, untilIndex = layout.points.length - 1): string {
  const [first] = layout.points;

  if (!first) {
    return '';
  }

  return [`M ${round(first.x)} ${round(first.y)}`, ...layout.segments.slice(0, Math.max(0, untilIndex))].join(' ');
}

function zigzagPoints(count: number): TrailPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: TRAIL_WIDTH / 2 + ZIGZAG_AMPLITUDE * Math.sin(index * ZIGZAG_FREQUENCY),
    y: VERTICAL_PADDING + index * ROW_HEIGHT_SINGLE_COLUMN,
  }));
}

function serpentinePoints(count: number, columns: number): TrailPoint[] {
  const spacing = (TRAIL_WIDTH - SIDE_MARGIN * 2) / (columns - 1);

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const positionInRow = index % columns;
    const column = row % 2 === 0 ? positionInRow : columns - 1 - positionInRow;
    const wobble = positionInRow % 2 === 0 ? -ROW_WOBBLE : ROW_WOBBLE;

    return {
      x: SIDE_MARGIN + column * spacing,
      y: VERTICAL_PADDING + row * ROW_HEIGHT_MULTI_COLUMN + wobble,
    };
  });
}

/**
 * Curvas suaves que passam exatamente por cada fase (Catmull-Rom).
 *
 * Cada trecho é independente, para a tela poder pintar só o caminho já
 * percorrido com as mesmas curvas do caminho inteiro.
 */
function buildSegments(points: readonly TrailPoint[]): string[] {
  return points.slice(1).map((end, offset) => {
    const [first, second] = controlPoints(points, offset);

    return `C ${round(first.x)} ${round(first.y)}, ${round(second.x)} ${round(second.y)}, ${round(end.x)} ${round(end.y)}`;
  });
}

function controlPoints(points: readonly TrailPoint[], startIndex: number): readonly [TrailPoint, TrailPoint] {
  const start = points[startIndex];
  const end = points[startIndex + 1];
  const before = points[startIndex - 1] ?? start;
  const after = points[startIndex + 2] ?? end;

  return [
    { x: start.x + (end.x - before.x) / 6, y: start.y + (end.y - before.y) / 6 },
    { x: end.x - (after.x - start.x) / 6, y: end.y - (after.y - start.y) / 6 },
  ];
}

/** Pontos de uma grade com leve desalinhamento, longe das fases e das curvas. */
function findDecorationSpots(points: readonly TrailPoint[], height: number): TrailPoint[] {
  const obstacles = [...points, ...curveSamples(points)];
  const spots: TrailPoint[] = [];
  let cell = 0;

  for (let y = DECORATION_GRID / 2; y < height; y += DECORATION_GRID) {
    for (let x = DECORATION_GRID / 2; x < TRAIL_WIDTH; x += DECORATION_GRID) {
      cell += 1;
      const candidate = { x: x + jitter(cell, 1), y: y + jitter(cell, 2) };

      if (obstacles.every((obstacle) => distance(obstacle, candidate) > DECORATION_CLEARANCE)) {
        spots.push(candidate);
      }
    }
  }

  return spots;
}

function curveSamples(points: readonly TrailPoint[]): TrailPoint[] {
  return points.slice(1).flatMap((end, offset) => {
    const start = points[offset];
    const [first, second] = controlPoints(points, offset);

    return CURVE_SAMPLES.map((t) => bezierPoint(start, first, second, end, t));
  });
}

function bezierPoint(p0: TrailPoint, p1: TrailPoint, p2: TrailPoint, p3: TrailPoint, t: number): TrailPoint {
  const inverse = 1 - t;
  const a = inverse ** 3;
  const b = 3 * inverse ** 2 * t;
  const c = 3 * inverse * t ** 2;
  const d = t ** 3;

  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Desalinhamento determinístico: o mesmo mapa desenha sempre igual. */
function jitter(cell: number, salt: number): number {
  const value = Math.sin(cell * 12.9898 + salt * 78.233) * 43758.5453;

  return ((value - Math.floor(value)) - 0.5) * DECORATION_GRID * 0.5;
}

function distance(a: TrailPoint, b: TrailPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
