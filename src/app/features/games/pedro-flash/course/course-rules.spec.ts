import { traceRoute } from '../../pedro-kart/tracks/default-tracks';
import { findTrackProblems } from '../../pedro-kart/tracks/track-rules';
import { findCourseProblems, normalizeCourseName, pieceProblem, sanitizeCourse, sanitizePieces } from './course-rules';
import { ARENAS, DEFAULT_COURSES } from './default-courses';

describe('Regras das fases do Pedro Flash', () => {
  it('aceita todas as fases oficiais, com todas as peças no lugar', () => {
    for (const course of DEFAULT_COURSES) {
      expect(course.isCircuit).withContext(course.id).toBeFalse();
      expect(findCourseProblems(course.path)).withContext(course.id).toEqual([]);
      expect(sanitizePieces(course.pieces, course.path)).withContext(course.id).toEqual(course.pieces);
    }
  });

  it('fecha a volta de todas as arenas, sem buracos nem loopings', () => {
    for (const arena of ARENAS) {
      expect(arena.course.isCircuit).withContext(arena.id).toBeTrue();
      expect(findTrackProblems(arena.course.path)).withContext(arena.id).toEqual([]);
      expect(arena.course.pieces.some((piece) => piece.kind === 'loop' || piece.kind === 'buraco'))
        .withContext(arena.id)
        .toBeFalse();
    }
  });

  it('explica o que falta num caminho que ainda não dá para correr', () => {
    expect(findCourseProblems(traceRoute({ column: 0, row: 0 }, 'R3'))).toEqual(['curto-demais']);
    expect(findCourseProblems([{ column: 0, row: 0 }, { column: 2, row: 0 }, ...traceRoute({ column: 3, row: 0 }, 'R9')])).toEqual([
      'passo-torto',
    ]);
    expect(findCourseProblems([{ column: 0, row: 0 }, { column: 0, row: 0 }])).toEqual(['casa-repetida']);
    expect(findCourseProblems([{ column: -1, row: 0 }])).toEqual(['fora-da-grade']);
  });

  it('só aceita o looping numa casa reta e longe de buracos e de outros loopings', () => {
    const path = traceRoute({ column: 0, row: 5 }, 'R6 U3 R6');

    expect(pieceProblem(path, [], 6, 'loop')).toBe('curva');
    expect(pieceProblem(path, [], 3, 'loop')).toBeNull();
    expect(pieceProblem(path, [{ cell: 3, kind: 'loop', lane: 0 }], 5, 'loop')).toBe('perto-de-loop');
    expect(pieceProblem(path, [{ cell: 4, kind: 'buraco', lane: 0 }], 3, 'loop')).toBe('perto-de-buraco');
    expect(pieceProblem(path, [{ cell: 4, kind: 'buraco', lane: 0 }], 5, 'buraco')).toBe('buraco-seguido');
    expect(pieceProblem(path, [], 0, 'raios')).toBe('ponta');
    expect(pieceProblem(path, [], path.length - 1, 'raios')).toBe('ponta');
  });

  it('limpa peças estragadas, repetidas ou que quebram as regras', () => {
    const path = traceRoute({ column: 0, row: 5 }, 'R12');
    const pieces = sanitizePieces(
      [
        { cell: 3, kind: 'loop', lane: 0 },
        { cell: 4, kind: 'buraco', lane: 0 },
        { cell: 3, kind: 'raios', lane: 1 },
        { cell: 6, kind: 'foguete', lane: 0 },
        { cell: 7, kind: 'raios', lane: 5 },
        { cell: 8, kind: 'raios' },
        { cell: 0, kind: 'mola', lane: 0 },
        'lixo',
      ],
      path,
    );

    expect(pieces).toEqual([
      { cell: 3, kind: 'loop', lane: 0 },
      { cell: 8, kind: 'raios', lane: 0 },
    ]);
  });

  it('lê do aparelho só as fases inteiras, sempre como fase aberta', () => {
    const path = traceRoute({ column: 0, row: 5 }, 'R12');
    const stored = { id: 'fase-1', name: '  Minha   fase  ', theme: 'gelo', isCircuit: true, path, pieces: [] };

    expect(sanitizeCourse(stored)).toEqual({ id: 'fase-1', name: 'Minha fase', theme: 'gelo', isCircuit: false, path, pieces: [] });
    expect(sanitizeCourse({ ...stored, theme: 'lua' })).toBeNull();
    expect(sanitizeCourse({ ...stored, path: path.slice(0, 3) })).toBeNull();
    expect(sanitizeCourse({ ...stored, id: '' })).toBeNull();
    expect(sanitizeCourse(null)).toBeNull();
  });

  it('dá nome padrão quando o nome fica vazio', () => {
    expect(normalizeCourseName('   ', 'Minha fase 2')).toBe('Minha fase 2');
    expect(normalizeCourseName('a'.repeat(50), 'x').length).toBe(32);
  });
});
