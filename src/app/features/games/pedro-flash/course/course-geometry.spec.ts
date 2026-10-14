import { TRACK_GRID } from '../../pedro-kart/models/track.model';
import { traceRoute } from '../../pedro-kart/tracks/default-tracks';
import type { CourseDefinition } from '../models/course.model';
import {
  buildCourse,
  courseGap,
  isOverGap,
  LOOP_RADIUS,
  ROAD_HEIGHT,
  sampleFrame,
  worldPoint,
  type CourseSample,
} from './course-geometry';
import { ARENAS, DEFAULT_COURSES } from './default-courses';

const STRAIGHT: CourseDefinition = {
  id: 'reta',
  name: 'Reta',
  theme: 'cidade',
  isCircuit: false,
  path: traceRoute({ column: 0, row: 5 }, 'R12'),
  pieces: [],
};

function dot(sample: CourseSample, kind: 'tangent-up' | 'tangent-right' | 'up-right'): number {
  switch (kind) {
    case 'tangent-up':
      return sample.tangentX * sample.upX + sample.tangentY * sample.upY + sample.tangentZ * sample.upZ;
    case 'tangent-right':
      return sample.tangentX * sample.rightX + sample.tangentY * sample.rightY + sample.tangentZ * sample.rightZ;
    case 'up-right':
      return sample.upX * sample.rightX + sample.upY * sample.rightY + sample.upZ * sample.rightZ;
  }
}

describe('Geometria das fases do Pedro Flash', () => {
  it('estende a fase aberta antes da largada e depois da chegada', () => {
    const course = buildCourse(STRAIGHT);
    const cellLength = TRACK_GRID.cellSize;

    expect(course.startDistance).toBeCloseTo(cellLength, 3);
    expect(course.goalDistance - course.startDistance).toBeCloseTo(12 * cellLength, 3);
    expect(course.length - course.goalDistance).toBeCloseTo(3 * cellLength, 3);
  });

  it('põe a estrada suspensa na altura certa, com a direita de quem corre para +x em -z', () => {
    const course = buildCourse(STRAIGHT);
    const frame = sampleFrame(course, course.startDistance + 20);
    const side = worldPoint(frame, 2, 0);

    expect(frame.y).toBeCloseTo(ROAD_HEIGHT, 5);
    expect(frame.tangentX).toBeCloseTo(1, 5);
    expect(side.z).toBeCloseTo(frame.z + 2, 5);
  });

  it('mantém o referencial de cada ponto em ângulo reto em todas as fases e arenas', () => {
    for (const definition of [...DEFAULT_COURSES, ...ARENAS.map((arena) => arena.course)]) {
      const course = buildCourse(definition);

      for (const sample of course.samples) {
        expect(Math.abs(dot(sample, 'tangent-up'))).withContext(definition.id).toBeLessThan(1e-6);
        expect(Math.abs(dot(sample, 'tangent-right'))).withContext(definition.id).toBeLessThan(1e-6);
        expect(Math.abs(dot(sample, 'up-right'))).withContext(definition.id).toBeLessThan(1e-6);
      }
    }
  });

  it('dá uma volta vertical inteira no looping, de cabeça para baixo no alto', () => {
    const course = buildCourse({ ...STRAIGHT, pieces: [{ cell: 6, kind: 'loop', lane: 0 }] });
    const [loop] = course.loops;
    const top = sampleFrame(course, (loop.start + loop.end) / 2);

    expect(course.loops.length).toBe(1);
    expect(loop.end - loop.start).toBeGreaterThan(2 * Math.PI * LOOP_RADIUS);
    expect(top.upY).toBeLessThan(-0.9);
    expect(top.y).toBeGreaterThan(ROAD_HEIGHT + LOOP_RADIUS * 1.8);
    // O looping aumenta a fase só no tamanho da volta: as casas seguintes ficam mais longe.
    expect(course.cellDistances[7] - course.cellDistances[6]).toBeGreaterThan(TRACK_GRID.cellSize + 2 * Math.PI * LOOP_RADIUS);
  });

  it('abre o buraco no meio da casa, com chão firme dos dois lados', () => {
    const course = buildCourse({ ...STRAIGHT, pieces: [{ cell: 5, kind: 'buraco', lane: 0 }] });
    const center = course.cellDistances[5];

    expect(isOverGap(course, center)).toBeTrue();
    expect(isOverGap(course, center - TRACK_GRID.cellSize / 2)).toBeFalse();
    expect(isOverGap(course, center + TRACK_GRID.cellSize / 2)).toBeFalse();
  });

  it('mede a distância na arena pelo lado mais curto da volta', () => {
    const course = buildCourse(ARENAS[0].course);

    expect(course.isCircuit).toBeTrue();
    expect(courseGap(course, course.length - 5, 5)).toBeCloseTo(10, 5);
    expect(courseGap(course, 5, course.length - 5)).toBeCloseTo(-10, 5);
    // Distâncias que já deram várias voltas continuam valendo.
    expect(courseGap(course, course.length * 3 + 2, 7)).toBeCloseTo(5, 5);
  });
});
