import type { GridCell, TrackTheme } from '../models/track.model';
import { TRACK_GRID } from '../models/track.model';
import { areNeighbors, isInsideGrid, isSameCell } from './track-rules';

/** A pista enquanto ainda está sendo desenhada no Pedro Kart Maker. */
export interface TrackDraft {
  readonly name: string;
  readonly theme: TrackTheme;
  readonly laps: number;
  readonly path: readonly GridCell[];
  readonly boostCells: readonly number[];
  readonly itemCells: readonly number[];
}

export type MarkerKind = 'turbo' | 'caixa';

/** Desfazer guarda até tantos passos: dá para voltar bastante sem pesar na memória. */
const HISTORY_LIMIT = 60;

export function createEmptyDraft(theme: TrackTheme = 'parque'): TrackDraft {
  return { name: '', theme, laps: 3, path: [], boostCells: [], itemCells: [] };
}

/**
 * Continua o traço até a casa tocada.
 *
 * Encostar na casa de onde o traço veio apaga o último pedaço — é a borracha
 * natural de quem desenha com o dedo. Casas longe do fim do traço, ou já
 * usadas, são ignoradas: a pista nunca fica torta nem se cruza.
 */
export function extendPath(draft: TrackDraft, cell: GridCell): TrackDraft {
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

/** Corta o traço no tamanho pedido, levando junto os turbos e caixas que ficaram de fora. */
export function shortenPath(draft: TrackDraft, length: number): TrackDraft {
  const size = Math.max(0, Math.min(draft.path.length, length));

  return {
    ...draft,
    path: draft.path.slice(0, size),
    boostCells: draft.boostCells.filter((index) => index < size),
    itemCells: draft.itemCells.filter((index) => index < size),
  };
}

/**
 * Põe ou tira um turbo ou uma caixa na casa tocada.
 *
 * Uma casa tem no máximo uma coisa; a largada não tem nenhuma, para a saída
 * ficar limpa para todo mundo.
 */
export function toggleMarker(draft: TrackDraft, cell: GridCell, kind: MarkerKind): TrackDraft {
  const index = draft.path.findIndex((existing) => isSameCell(existing, cell));

  if (index <= 0) {
    return draft;
  }

  const without = (markers: readonly number[]): readonly number[] => markers.filter((value) => value !== index);
  const toggled = (markers: readonly number[]): readonly number[] =>
    markers.includes(index) ? without(markers) : [...markers, index].sort(byNumber);

  return {
    ...draft,
    boostCells: kind === 'turbo' ? toggled(draft.boostCells) : without(draft.boostCells),
    itemCells: kind === 'caixa' ? toggled(draft.itemCells) : without(draft.itemCells),
  };
}

/** Quantas voltas, sempre dentro do que a corrida aceita. */
export function changeLaps(draft: TrackDraft, delta: number): TrackDraft {
  const laps = Math.min(TRACK_GRID.maximumLaps, Math.max(TRACK_GRID.minimumLaps, draft.laps + delta));

  return { ...draft, laps };
}

/** Desenho de seta que aponta da casa para a próxima, para mostrar o sentido da corrida. */
export function directionArrow(from: GridCell, to: GridCell): string {
  if (to.column > from.column) {
    return '→';
  }

  if (to.column < from.column) {
    return '←';
  }

  return to.row > from.row ? '↓' : '↑';
}

export interface EditorHistory {
  readonly past: readonly TrackDraft[];
  readonly present: TrackDraft;
}

export function createEditorHistory(draft: TrackDraft): EditorHistory {
  return { past: [], present: draft };
}

/** Grava uma mudança; mudança que não muda nada não vira passo de desfazer. */
export function commitDraft(history: EditorHistory, next: TrackDraft): EditorHistory {
  if (next === history.present) {
    return history;
  }

  return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: next };
}

export function undoDraft(history: EditorHistory): EditorHistory {
  const previous = history.past[history.past.length - 1];

  return previous ? { past: history.past.slice(0, -1), present: previous } : history;
}

function byNumber(first: number, second: number): number {
  return first - second;
}
