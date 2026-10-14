import type { GridCell } from '../../pedro-kart/models/track.model';
import { areNeighbors, cellKey, isInsideGrid } from '../../pedro-kart/tracks/track-rules';
import { isLane, isPieceKind } from '../config/piece.config';
import { isFlashTheme } from '../config/theme.config';
import { COURSE_LIMITS, type CourseDefinition, type CoursePiece, type PieceKind } from '../models/course.model';

/** O que impede um caminho de virar fase, já no jeito que a tela explica. */
export type CourseProblem = 'curto-demais' | 'casa-repetida' | 'fora-da-grade' | 'passo-torto';

export const COURSE_PROBLEM_MESSAGES: Readonly<Record<CourseProblem, string>> = {
  'curto-demais': `Desenhe pelo menos ${COURSE_LIMITS.minimumCells} casas de caminho.`,
  'casa-repetida': 'O caminho não pode passar duas vezes pela mesma casa.',
  'fora-da-grade': 'Uma parte do caminho ficou fora do mapa.',
  'passo-torto': 'Cada casa precisa encostar na anterior, sem pular nem andar na diagonal.',
};

/** Por que uma peça não cabe numa casa. */
export type PieceProblem = 'ponta' | 'curva' | 'perto-de-loop' | 'buraco-seguido' | 'perto-de-buraco';

export const PIECE_PROBLEM_MESSAGES: Readonly<Record<PieceProblem, string>> = {
  ponta: 'A largada e a chegada ficam livres de peças.',
  curva: 'O looping só cabe numa casa reta, sem curva.',
  'perto-de-loop': 'Deixe duas casas livres entre um looping e outro, e nada de buraco colado nele.',
  'buraco-seguido': 'Dois buracos seguidos ficam compridos demais para pular.',
  'perto-de-buraco': 'O looping precisa de chão firme dos dois lados.',
};

/** Distância mínima, em casas, entre dois loopings: a saída de um precisa terminar antes do outro. */
const LOOP_SPACING = 3;

/** Problemas do caminho, do mais básico para o mais fino; vazio quando dá para correr. */
export function findCourseProblems(path: readonly GridCell[]): readonly CourseProblem[] {
  if (path.some((cell) => !isInsideGrid(cell))) {
    return ['fora-da-grade'];
  }

  if (new Set(path.map(cellKey)).size !== path.length) {
    return ['casa-repetida'];
  }

  const problems: CourseProblem[] = [];

  if (path.slice(1).some((cell, index) => !areNeighbors(path[index], cell))) {
    problems.push('passo-torto');
  }

  if (path.length < COURSE_LIMITS.minimumCells) {
    problems.push('curto-demais');
  }

  return problems;
}

export function isPlayable(path: readonly GridCell[]): boolean {
  return findCourseProblems(path).length === 0;
}

/** Casa reta: quem vem de trás e quem vem depois estão na mesma linha ou na mesma coluna. */
function isStraightCell(path: readonly GridCell[], index: number): boolean {
  const previous = path[index - 1];
  const next = path[index + 1];

  if (!previous || !next) {
    return false;
  }

  return previous.column === next.column || previous.row === next.row;
}

/**
 * Se a peça cabe na casa, considerando as outras peças do caminho.
 *
 * A peça que já está na própria casa não conta: trocar uma peça por outra
 * nunca é barrado por ela mesma.
 */
export function pieceProblem(
  path: readonly GridCell[],
  pieces: readonly CoursePiece[],
  cell: number,
  kind: PieceKind,
): PieceProblem | null {
  if (cell <= 0 || cell >= path.length - 1) {
    return 'ponta';
  }

  const others = pieces.filter((piece) => piece.cell !== cell);
  const has = (wanted: PieceKind, within: number): boolean =>
    others.some((piece) => piece.kind === wanted && Math.abs(piece.cell - cell) <= within);

  switch (kind) {
    case 'loop':
      if (!isStraightCell(path, cell)) {
        return 'curva';
      }

      if (has('loop', LOOP_SPACING - 1)) {
        return 'perto-de-loop';
      }

      return has('buraco', 1) ? 'perto-de-buraco' : null;
    case 'buraco':
      if (has('buraco', 1)) {
        return 'buraco-seguido';
      }

      return has('loop', 1) ? 'perto-de-loop' : null;
    default:
      return null;
  }
}

/**
 * Peças válidas, sem repetição de casa e respeitando as regras de vizinhança.
 *
 * Vai da largada para a chegada aceitando cada peça que ainda cabe: o
 * resultado é sempre o mesmo para a mesma lista, por mais estragada que ela
 * esteja.
 */
export function sanitizePieces(value: unknown, path: readonly GridCell[]): readonly CoursePiece[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const candidates = value
    .filter(isRecord)
    .map((piece) => ({ cell: piece['cell'], kind: piece['kind'], lane: piece['lane'] ?? 0 }))
    .filter(
      (piece): piece is CoursePiece =>
        Number.isInteger(piece.cell) && isPieceKind(piece.kind) && isLane(piece.lane),
    )
    .sort((first, second) => first.cell - second.cell);
  const accepted: CoursePiece[] = [];

  for (const piece of candidates) {
    const isTaken = accepted.some((existing) => existing.cell === piece.cell);

    if (!isTaken && pieceProblem(path, accepted, piece.cell, piece.kind) === null) {
      accepted.push({ cell: piece.cell, kind: piece.kind, lane: piece.lane });
    }
  }

  return accepted;
}

/**
 * Lê uma fase vinda do armazenamento e devolve só se ela estiver inteira.
 *
 * O banco do aparelho pode ter dados de uma versão antiga ou corrompidos;
 * nada do que vem de lá é confiável até passar por aqui. Fase criada nunca é
 * arena: o editor só desenha caminhos abertos.
 */
export function sanitizeCourse(value: unknown): CourseDefinition | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, name, theme, path, pieces } = value;

  if (typeof id !== 'string' || id.length === 0 || typeof name !== 'string' || !isFlashTheme(theme)) {
    return null;
  }

  if (!Array.isArray(path) || !path.every(isGridCell) || !isPlayable(path)) {
    return null;
  }

  const cells = path.map((cell) => ({ column: cell.column, row: cell.row }));

  return {
    id,
    name: normalizeCourseName(name, 'Minha fase'),
    theme,
    path: cells,
    isCircuit: false,
    pieces: sanitizePieces(pieces, cells),
  };
}

/** Nome limpo para guardar: sem espaços sobrando e no tamanho que cabe na tela. */
export function normalizeCourseName(name: string, fallback: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, COURSE_LIMITS.maximumNameLength);

  return trimmed.length > 0 ? trimmed : fallback;
}

function isGridCell(value: unknown): value is GridCell {
  return isRecord(value) && typeof value['column'] === 'number' && typeof value['row'] === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
