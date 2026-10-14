import { traceRoute } from '../../pedro-kart/tracks/default-tracks';
import type { CourseDefinition, CoursePiece, Lane, PieceKind } from '../models/course.model';
import type { BossId } from '../models/runner.model';

/** Atalho para escrever as fases à mão: casa, peça e, quando importa, a faixa. */
function piece(cell: number, kind: PieceKind, lane: Lane = 0): CoursePiece {
  return { cell, kind, lane };
}

/**
 * As seis fases oficiais, da mais fácil para a mais difícil.
 *
 * Cada uma num cenário diferente. A primeira só tem raios, um looping e
 * perigos que dá para desviar; os buracos chegam na segunda, e as últimas
 * juntam tudo em caminhos compridos e cheios de curvas.
 */
export const DEFAULT_COURSES: readonly CourseDefinition[] = [
  {
    id: 'avenida-neon',
    name: 'Avenida Neon',
    theme: 'cidade',
    isCircuit: false,
    path: traceRoute({ column: 0, row: 8 }, 'R12 U3 L11 U3 R11'),
    pieces: [
      piece(2, 'raios'),
      piece(4, 'turbo'),
      piece(6, 'raios', -1),
      piece(8, 'loop'),
      piece(11, 'raios', 1),
      piece(13, 'raios'),
      piece(17, 'espinhos'),
      piece(19, 'raios', -1),
      piece(21, 'caixa'),
      piece(23, 'besouro'),
      piece(25, 'raios', 1),
      piece(28, 'mola'),
      piece(31, 'raios'),
      piece(33, 'rampa'),
      piece(35, 'raios', -1),
      piece(37, 'abelha'),
      piece(39, 'turbo'),
    ],
  },
  {
    id: 'ondas-do-sol',
    name: 'Ondas do Sol',
    theme: 'praia',
    isCircuit: false,
    path: traceRoute({ column: 0, row: 9 }, 'U9 R3 D9 R3 U9 R3 D9 R3 U9'),
    pieces: [
      piece(2, 'raios'),
      piece(4, 'turbo'),
      piece(6, 'loop'),
      piece(8, 'raios', 1),
      piece(11, 'caixa'),
      piece(14, 'raios', -1),
      piece(16, 'buraco'),
      piece(18, 'raios'),
      piece(20, 'espinhos', 1),
      piece(23, 'mola'),
      piece(26, 'raios'),
      piece(28, 'rampa'),
      piece(30, 'tatu'),
      piece(32, 'raios', -1),
      piece(35, 'caixa'),
      piece(38, 'loop'),
      piece(41, 'buraco'),
      piece(43, 'raios', 1),
      piece(47, 'besouro'),
      piece(50, 'abelha', -1),
      piece(52, 'turbo'),
      piece(54, 'raios'),
      piece(56, 'espinhos', -1),
    ],
  },
  {
    id: 'pista-congelada',
    name: 'Pista Congelada',
    theme: 'gelo',
    isCircuit: false,
    path: traceRoute({ column: 0, row: 9 }, 'U5 R3 U4 R3 D8 R3 U8 R3 D9'),
    pieces: [
      piece(2, 'raios'),
      piece(3, 'turbo'),
      piece(7, 'caixa'),
      piece(10, 'raios', -1),
      piece(14, 'raios'),
      piece(17, 'loop'),
      piece(19, 'raios', 1),
      piece(21, 'buraco'),
      piece(24, 'besouro'),
      piece(28, 'espinhos'),
      piece(30, 'rampa'),
      piece(32, 'abelha', 1),
      piece(36, 'raios'),
      piece(39, 'tatu', -1),
      piece(41, 'loop'),
      piece(43, 'raios'),
      piece(45, 'turbo'),
    ],
  },
  {
    id: 'ceu-de-trovoes',
    name: 'Céu de Trovões',
    theme: 'tempestade',
    isCircuit: false,
    path: traceRoute({ column: 0, row: 5 }, 'R4 U5 R5 D3 L3 D3 R7 D3 L12'),
    pieces: [
      piece(2, 'turbo'),
      piece(6, 'raios'),
      piece(7, 'espinhos', 1),
      piece(11, 'loop'),
      piece(13, 'raios'),
      piece(16, 'barreira'),
      piece(19, 'abelha'),
      piece(22, 'caixa'),
      piece(25, 'buraco'),
      piece(27, 'tatu', 1),
      piece(29, 'raios', -1),
      piece(32, 'mola'),
      piece(35, 'raios'),
      piece(37, 'loop'),
      piece(40, 'buraco'),
      piece(42, 'besouro'),
      piece(44, 'raios', 1),
    ],
  },
  {
    id: 'corredor-de-lava',
    name: 'Corredor de Lava',
    theme: 'vulcao',
    isCircuit: false,
    path: traceRoute({ column: 0, row: 0 }, 'R13 D9 L13 U7 R11 D5 L9 U3 R5'),
    pieces: [
      piece(2, 'raios'),
      piece(4, 'turbo'),
      piece(6, 'buraco'),
      piece(8, 'raios', -1),
      piece(10, 'loop'),
      piece(12, 'raios', 1),
      piece(15, 'espinhos', -1),
      piece(17, 'besouro'),
      piece(19, 'mola'),
      piece(21, 'raios'),
      piece(24, 'caixa'),
      piece(26, 'buraco'),
      piece(28, 'tatu', 1),
      piece(30, 'raios', -1),
      piece(32, 'loop'),
      piece(34, 'raios'),
      piece(37, 'barreira'),
      piece(39, 'abelha', 1),
      piece(41, 'raios'),
      piece(44, 'turbo'),
      piece(46, 'buraco'),
      piece(48, 'rampa'),
      piece(50, 'espinhos', 1),
      piece(52, 'raios', -1),
      piece(55, 'tatu'),
      piece(57, 'caixa'),
      piece(60, 'loop'),
      piece(62, 'buraco'),
      piece(64, 'besouro', -1),
      piece(66, 'raios'),
      piece(69, 'mola'),
      piece(72, 'abelha'),
      piece(74, 'raios', 1),
    ],
  },
  {
    id: 'rota-das-estrelas',
    name: 'Rota das Estrelas',
    theme: 'espaco',
    isCircuit: false,
    path: traceRoute({ column: 13, row: 9 }, 'U9 L4 D7 L3 U7 L4 D9 R7'),
    pieces: [
      piece(2, 'raios'),
      piece(3, 'turbo'),
      piece(5, 'loop'),
      piece(7, 'buraco'),
      piece(8, 'raios', 1),
      piece(11, 'abelha'),
      piece(15, 'espinhos', -1),
      piece(17, 'tatu'),
      piece(19, 'raios', 1),
      piece(22, 'caixa'),
      piece(25, 'buraco'),
      piece(27, 'loop'),
      piece(29, 'raios'),
      piece(32, 'besouro'),
      piece(36, 'mola'),
      piece(38, 'rampa'),
      piece(40, 'espinhos', 1),
      piece(42, 'abelha', -1),
      piece(45, 'buraco'),
      piece(47, 'raios'),
      piece(49, 'turbo'),
    ],
  },
];

/** Arena de chefão: um circuito fechado e o robô que mora nele. */
export interface ArenaDefinition {
  readonly id: string;
  readonly name: string;
  readonly boss: BossId;
  readonly course: CourseDefinition;
}

function arena(id: string, name: string, boss: BossId, course: Omit<CourseDefinition, 'id' | 'name' | 'isCircuit'>): ArenaDefinition {
  return { id, name, boss, course: { ...course, id, name, isCircuit: true } };
}

/**
 * As três arenas, uma por chefão.
 *
 * São circuitos fechados, sem buracos nem loopings: a atenção da criança
 * fica toda no robô. Os raios voltam a aparecer a cada volta, para sempre
 * haver proteção contra o próximo ataque.
 */
export const ARENAS: readonly ArenaDefinition[] = [
  arena('arena-do-trovao', 'Arena do Trovão', 'trovao', {
    theme: 'tempestade',
    path: traceRoute({ column: 2, row: 7 }, 'R9 U5 L9 D4'),
    pieces: [
      piece(3, 'raios'),
      piece(6, 'turbo'),
      piece(9, 'raios', -1),
      piece(12, 'caixa'),
      piece(16, 'raios', 1),
      piece(20, 'turbo'),
      piece(23, 'raios'),
      piece(25, 'caixa'),
    ],
  }),
  arena('arena-do-tufao', 'Arena do Tufão', 'tufao', {
    theme: 'praia',
    path: traceRoute({ column: 3, row: 8 }, 'R8 U3 L3 U3 L5 D3 L2 D2 R1 D1'),
    pieces: [
      piece(3, 'raios'),
      piece(6, 'turbo'),
      piece(10, 'caixa'),
      piece(14, 'raios', 1),
      piece(18, 'raios', -1),
      piece(22, 'turbo'),
      piece(26, 'caixa'),
      piece(29, 'raios'),
    ],
  }),
  arena('fortaleza-do-apagao', 'Fortaleza do Apagão', 'apagao', {
    theme: 'cidade',
    path: traceRoute({ column: 1, row: 8 }, 'R5 U2 R3 D2 R3 U6 L3 D2 L3 U3 L5 D6'),
    pieces: [
      piece(3, 'raios'),
      piece(6, 'turbo'),
      piece(10, 'caixa'),
      piece(15, 'raios', -1),
      piece(20, 'turbo'),
      piece(25, 'raios', 1),
      piece(30, 'caixa'),
      piece(35, 'raios'),
      piece(40, 'turbo'),
    ],
  }),
];

const COURSES_BY_ID = new Map(DEFAULT_COURSES.map((course) => [course.id, course]));
const ARENAS_BY_ID = new Map(ARENAS.map((entry) => [entry.id, entry]));

export function defaultCourse(id: string): CourseDefinition | undefined {
  return COURSES_BY_ID.get(id);
}

export function findArena(id: string): ArenaDefinition | undefined {
  return ARENAS_BY_ID.get(id);
}
