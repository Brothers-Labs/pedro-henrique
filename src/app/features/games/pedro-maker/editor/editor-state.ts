import { OBJECT_BEHAVIOR } from '../config/object-catalog';
import { DEFAULT_LEVEL_HEIGHT } from '../config/physics.config';
import { LEVEL_LIMITS } from '../levels/level-validation';
import type { LevelObject, LevelObjectProperties, LevelObjectType, LevelTheme } from '../models/level.model';

/**
 * Estado do editor de fases, sem Angular e sem tela.
 *
 * Toda edição é uma função pura que recebe o estado e devolve outro: é o que
 * torna "desfazer" e "refazer" triviais — basta guardar os estados anteriores
 * — e deixa as regras do editor testáveis sem navegador.
 */

export interface EditorLevel {
  readonly name: string;
  readonly theme: LevelTheme;
  readonly width: number;
  readonly height: number;
  readonly objects: readonly LevelObject[];
}

export interface EditorHistory {
  readonly past: readonly EditorLevel[];
  readonly present: EditorLevel;
  readonly future: readonly EditorLevel[];
}

/** Passos guardados para desfazer; o suficiente sem pesar na memória. */
const HISTORY_LIMIT = 100;

export const DEFAULT_EDITOR_WIDTH = 60;
const STARTER_SURFACE = 12;

/** Fase nova: chão, o Pedro no começo e o portal no fim — já dá para testar. */
export function createStarterLevel(name: string, theme: LevelTheme, sequence: () => string): EditorLevel {
  const width = DEFAULT_EDITOR_WIDTH;
  const objects: LevelObject[] = [];

  for (let x = 0; x < width; x += 1) {
    for (let y = STARTER_SURFACE; y < DEFAULT_LEVEL_HEIGHT; y += 1) {
      objects.push({ id: sequence(), type: 'ground', x, y });
    }
  }

  objects.push({ id: sequence(), type: 'start', x: 2, y: STARTER_SURFACE - 1 });
  objects.push({ id: sequence(), type: 'portal', x: width - 4, y: STARTER_SURFACE - 1 });

  return { name, theme, width, height: DEFAULT_LEVEL_HEIGHT, objects };
}

export function createHistory(level: EditorLevel): EditorHistory {
  return { past: [], present: level, future: [] };
}

/** Registra uma edição. Edição que não muda nada não entra no histórico. */
export function commit(history: EditorHistory, next: EditorLevel): EditorHistory {
  if (next === history.present) {
    return history;
  }

  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  };
}

export function undo(history: EditorHistory): EditorHistory {
  const previous = history.past[history.past.length - 1];

  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: EditorHistory): EditorHistory {
  const [next, ...rest] = history.future;

  if (!next) {
    return history;
  }

  return { past: [...history.past, history.present], present: next, future: rest };
}

export function objectAt(level: EditorLevel, x: number, y: number): LevelObject | undefined {
  return level.objects.find((object) => object.x === x && object.y === y);
}

/**
 * Coloca uma peça na célula, substituindo o que estiver nela.
 *
 * Início e portal são únicos: colocar outro move o existente, em vez de criar
 * uma fase com dois pontos de partida.
 */
export function placeObject(
  level: EditorLevel,
  type: LevelObjectType,
  x: number,
  y: number,
  id: string,
  properties?: LevelObjectProperties,
): EditorLevel {
  if (!isInside(level, x, y)) {
    return level;
  }

  const current = objectAt(level, x, y);

  if (current?.type === type && sameProperties(current.properties, properties)) {
    return level;
  }

  const isUnique = OBJECT_BEHAVIOR[type].isUnique;
  const kept = level.objects.filter(
    (object) => !(object.x === x && object.y === y) && !(isUnique && object.type === type),
  );

  return {
    ...level,
    objects: [...kept, { id, type, x, y, ...(properties ? { properties } : {}) }],
  };
}

export function removeObjectAt(level: EditorLevel, x: number, y: number): EditorLevel {
  const remaining = level.objects.filter((object) => !(object.x === x && object.y === y));

  return remaining.length === level.objects.length ? level : { ...level, objects: remaining };
}

/** Move uma peça para outra célula, substituindo o que estiver no destino. */
export function moveObject(level: EditorLevel, fromX: number, fromY: number, toX: number, toY: number): EditorLevel {
  const moving = objectAt(level, fromX, fromY);

  if (!moving || !isInside(level, toX, toY) || (fromX === toX && fromY === toY)) {
    return level;
  }

  const kept = level.objects.filter(
    (object) => object !== moving && !(object.x === toX && object.y === toY),
  );

  return { ...level, objects: [...kept, { ...moving, x: toX, y: toY }] };
}

/** Muda a largura da fase; o que ficar fora da nova largura é retirado. */
export function resizeLevel(level: EditorLevel, width: number): EditorLevel {
  const safeWidth = Math.min(LEVEL_LIMITS.maxWidth, Math.max(LEVEL_LIMITS.minWidth, Math.trunc(width)));

  if (safeWidth === level.width) {
    return level;
  }

  return { ...level, width: safeWidth, objects: level.objects.filter((object) => object.x < safeWidth) };
}

export function renameLevel(level: EditorLevel, name: string): EditorLevel {
  return name === level.name ? level : { ...level, name };
}

export function changeTheme(level: EditorLevel, theme: LevelTheme): EditorLevel {
  return theme === level.theme ? level : { ...level, theme };
}

function isInside(level: EditorLevel, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height;
}

function sameProperties(first: LevelObjectProperties | undefined, second: LevelObjectProperties | undefined): boolean {
  return JSON.stringify(first ?? {}) === JSON.stringify(second ?? {});
}
