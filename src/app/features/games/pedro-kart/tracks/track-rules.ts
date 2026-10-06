import { isTrackTheme } from '../config/theme.config';
import { TRACK_GRID, type GridCell, type TrackDefinition } from '../models/track.model';

/** O que impede um circuito de virar corrida, já no jeito que a tela explica. */
export type TrackProblem = 'curto-demais' | 'aberto' | 'casa-repetida' | 'fora-da-grade' | 'passo-torto';

export const TRACK_PROBLEM_MESSAGES: Readonly<Record<TrackProblem, string>> = {
  'curto-demais': `Desenhe pelo menos ${TRACK_GRID.minimumCells} casas de pista.`,
  aberto: 'Feche a volta: a última casa precisa encostar na largada 🏁.',
  'casa-repetida': 'A pista não pode passar duas vezes pela mesma casa.',
  'fora-da-grade': 'Uma parte da pista ficou fora do mapa.',
  'passo-torto': 'Cada casa precisa encostar na anterior, sem pular nem andar na diagonal.',
};

export function isSameCell(first: GridCell, second: GridCell): boolean {
  return first.column === second.column && first.row === second.row;
}

/** Vizinhas de lado, nunca na diagonal: é o que faz a pista ter só retas e curvas de verdade. */
export function areNeighbors(first: GridCell, second: GridCell): boolean {
  return Math.abs(first.column - second.column) + Math.abs(first.row - second.row) === 1;
}

export function isInsideGrid(cell: GridCell): boolean {
  return (
    Number.isInteger(cell.column) &&
    Number.isInteger(cell.row) &&
    cell.column >= 0 &&
    cell.row >= 0 &&
    cell.column < TRACK_GRID.columns &&
    cell.row < TRACK_GRID.rows
  );
}

export function cellKey(cell: GridCell): string {
  return `${cell.column}:${cell.row}`;
}

/** Problemas do circuito, do mais básico para o mais fino; vazio quando dá para correr. */
export function findTrackProblems(path: readonly GridCell[]): readonly TrackProblem[] {
  if (path.some((cell) => !isInsideGrid(cell))) {
    return ['fora-da-grade'];
  }

  if (new Set(path.map(cellKey)).size !== path.length) {
    return ['casa-repetida'];
  }

  const problems: TrackProblem[] = [];

  if (path.slice(1).some((cell, index) => !areNeighbors(path[index], cell))) {
    problems.push('passo-torto');
  }

  if (path.length < TRACK_GRID.minimumCells) {
    problems.push('curto-demais');
  } else if (!areNeighbors(path[path.length - 1], path[0])) {
    problems.push('aberto');
  }

  return problems;
}

export function isRaceable(path: readonly GridCell[]): boolean {
  return findTrackProblems(path).length === 0;
}

export function clampLaps(laps: number): number {
  if (!Number.isFinite(laps)) {
    return TRACK_GRID.minimumLaps;
  }

  return Math.min(TRACK_GRID.maximumLaps, Math.max(TRACK_GRID.minimumLaps, Math.round(laps)));
}

/** Nome limpo para guardar: sem espaços sobrando e no tamanho que cabe na tela. */
export function normalizeTrackName(name: string, fallback: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, TRACK_GRID.maximumNameLength);

  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Lê uma pista vinda do armazenamento e devolve só se ela estiver inteira.
 *
 * O banco do aparelho pode ter dados de uma versão antiga ou corrompidos;
 * nada do que vem de lá é confiável até passar por aqui.
 */
export function sanitizeTrack(value: unknown): TrackDefinition | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, name, theme, laps, path, boostCells, itemCells } = value;

  if (typeof id !== 'string' || id.length === 0 || typeof name !== 'string' || !isTrackTheme(theme)) {
    return null;
  }

  if (!Array.isArray(path) || !path.every(isGridCell) || !isRaceable(path)) {
    return null;
  }

  return {
    id,
    name: normalizeTrackName(name, 'Minha pista'),
    theme,
    laps: clampLaps(typeof laps === 'number' ? laps : TRACK_GRID.minimumLaps),
    path: path.map((cell) => ({ column: cell.column, row: cell.row })),
    boostCells: sanitizeCellIndexes(boostCells, path.length),
    itemCells: sanitizeCellIndexes(itemCells, path.length),
  };
}

/**
 * Índices válidos e sem repetição.
 *
 * A casa da largada (zero) fica de fora: turbo ou caixa em cima da linha
 * embolaria a saída de todo mundo.
 */
export function sanitizeCellIndexes(value: unknown, pathLength: number): readonly number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const valid = value.filter(
    (index): index is number => Number.isInteger(index) && index > 0 && index < pathLength,
  );

  return [...new Set(valid)].sort((first, second) => first - second);
}

function isGridCell(value: unknown): value is GridCell {
  return isRecord(value) && typeof value['column'] === 'number' && typeof value['row'] === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
