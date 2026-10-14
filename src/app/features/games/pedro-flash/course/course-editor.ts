import type { GridCell } from '../../pedro-kart/models/track.model';
import { areNeighbors, isInsideGrid, isSameCell } from '../../pedro-kart/tracks/track-rules';
import { LANE_CYCLE, pieceDefinition } from '../config/piece.config';
import type { CoursePiece, FlashTheme, PieceKind } from '../models/course.model';
import { pieceProblem, type PieceProblem } from './course-rules';

/** A fase enquanto ainda está sendo montada no Pedro Flash Maker. */
export interface CourseDraft {
  readonly name: string;
  readonly theme: FlashTheme;
  readonly path: readonly GridCell[];
  readonly pieces: readonly CoursePiece[];
}

/** Resultado de um toque com uma peça: a fase nova e, quando a peça não coube, o porquê. */
export interface PlacementResult {
  readonly draft: CourseDraft;
  readonly problem: PieceProblem | null;
}

/** Desfazer guarda até tantos passos: dá para voltar bastante sem pesar na memória. */
const HISTORY_LIMIT = 60;

export function createEmptyDraft(theme: FlashTheme = 'cidade'): CourseDraft {
  return { name: '', theme, path: [], pieces: [] };
}

/**
 * Continua o caminho até a casa tocada.
 *
 * Encostar na casa de onde o traço veio apaga o último pedaço — é a borracha
 * natural de quem desenha com o dedo. Casas longe do fim do traço, ou já
 * usadas, são ignoradas: o caminho nunca fica torto nem se cruza.
 */
export function extendPath(draft: CourseDraft, cell: GridCell): CourseDraft {
  const { path } = draft;

  if (!isInsideGrid(cell)) {
    return draft;
  }

  if (path.length === 0) {
    return { ...draft, path: [cell] };
  }

  const last = path[path.length - 1];

  if (isSameCell(last, cell)) {
    return draft;
  }

  if (path.length >= 2 && isSameCell(path[path.length - 2], cell)) {
    return shortenPath(draft, path.length - 1);
  }

  if (!areNeighbors(last, cell) || path.some((existing) => isSameCell(existing, cell))) {
    return draft;
  }

  return { ...draft, path: [...path, cell] };
}

/**
 * Corta o caminho no tamanho pedido.
 *
 * As peças que ficaram de fora vão junto, e a da nova última casa também:
 * a chegada fica sempre livre.
 */
export function shortenPath(draft: CourseDraft, length: number): CourseDraft {
  const size = Math.max(0, Math.min(draft.path.length, length));

  return {
    ...draft,
    path: draft.path.slice(0, size),
    pieces: draft.pieces.filter((piece) => piece.cell < size - 1),
  };
}

/**
 * Põe, gira ou tira uma peça na casa tocada.
 *
 * Tocar com a mesma peça numa casa que já a tem troca a faixa (meio,
 * esquerda, direita) e, depois da última, tira a peça. Peça de pista
 * inteira sai no segundo toque. Uma peça diferente substitui a que estava.
 */
export function placePiece(draft: CourseDraft, cell: GridCell, kind: PieceKind): PlacementResult {
  const index = draft.path.findIndex((existing) => isSameCell(existing, cell));

  if (index === -1) {
    return { draft, problem: null };
  }

  const existing = draft.pieces.find((candidate) => candidate.cell === index);

  if (existing?.kind === kind) {
    return { draft: cycleLane(draft, existing), problem: null };
  }

  const problem = pieceProblem(draft.path, draft.pieces, index, kind);

  if (problem) {
    return { draft, problem };
  }

  return { draft: withPiece(draft, { cell: index, kind, lane: 0 }), problem: null };
}

/** Tira a peça da casa tocada, se houver uma. */
export function erasePiece(draft: CourseDraft, cell: GridCell): CourseDraft {
  const index = draft.path.findIndex((existing) => isSameCell(existing, cell));

  if (index === -1 || !draft.pieces.some((piece) => piece.cell === index)) {
    return draft;
  }

  return { ...draft, pieces: draft.pieces.filter((piece) => piece.cell !== index) };
}

function cycleLane(draft: CourseDraft, piece: CoursePiece): CourseDraft {
  const position = LANE_CYCLE.indexOf(piece.lane);
  const nextLane = LANE_CYCLE[position + 1];
  const isLastLane = !pieceDefinition(piece.kind).usesLane || nextLane === undefined;
  const others = draft.pieces.filter((candidate) => candidate.cell !== piece.cell);

  return isLastLane ? { ...draft, pieces: others } : withPiece(draft, { ...piece, lane: nextLane });
}

function withPiece(draft: CourseDraft, piece: CoursePiece): CourseDraft {
  const others = draft.pieces.filter((candidate) => candidate.cell !== piece.cell);

  return { ...draft, pieces: [...others, piece].sort((first, second) => first.cell - second.cell) };
}

export interface EditorHistory<TDraft> {
  readonly past: readonly TDraft[];
  readonly present: TDraft;
}

export function createEditorHistory<TDraft>(draft: TDraft): EditorHistory<TDraft> {
  return { past: [], present: draft };
}

/** Grava uma mudança; mudança que não muda nada não vira passo de desfazer. */
export function commitDraft<TDraft>(history: EditorHistory<TDraft>, next: TDraft): EditorHistory<TDraft> {
  if (next === history.present) {
    return history;
  }

  return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: next };
}

export function undoDraft<TDraft>(history: EditorHistory<TDraft>): EditorHistory<TDraft> {
  const previous = history.past[history.past.length - 1];

  return previous ? { past: history.past.slice(0, -1), present: previous } : history;
}
