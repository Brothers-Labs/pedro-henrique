import { OBJECT_BEHAVIOR } from '../config/object-catalog';
import { DEFAULT_LEVEL_HEIGHT } from '../config/physics.config';
import { LEVEL_LIMITS } from '../levels/level-validation';
import type { ScreenMode } from '../config/screen.config';
import type { LevelObject, LevelObjectProperties, LevelObjectType, LevelTheme, PowerUpKind, SurpriseContent } from '../models/level.model';

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
  /** Tela da aba Telas; sem ela, a fase usa a tela dos ajustes de quem joga. */
  readonly screen?: ScreenMode;
}

export interface EditorHistory {
  readonly past: readonly EditorLevel[];
  readonly present: EditorLevel;
  readonly future: readonly EditorLevel[];
}

/** Uma célula da grade: coluna e linha, com a linha zero no topo. */
export interface GridCell {
  readonly x: number;
  readonly y: number;
}

/** Passos guardados para desfazer; o suficiente sem pesar na memória. */
const HISTORY_LIMIT = 100;

export const DEFAULT_EDITOR_WIDTH = 60;
const STARTER_SURFACE = 12;

/** Passo da chave numérica de célula: maior que a largura máxima de uma fase. */
const CELL_KEY_STRIDE = 1024;

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

/**
 * Coloca a mesma peça em várias células de uma vez: o retângulo cheio e o
 * traço rápido do dedo.
 *
 * Feito numa passada só — uma fase de 400 colunas tem milhares de objetos, e
 * colocar célula por célula refaria a lista inteira a cada uma.
 */
export function placeMany(
  level: EditorLevel,
  type: LevelObjectType,
  cells: readonly GridCell[],
  nextId: () => string,
  properties?: LevelObjectProperties,
): EditorLevel {
  const inside = cells.filter((cell) => isInside(level, cell.x, cell.y));
  const last = inside.at(-1);

  if (!last) {
    return level;
  }

  // Início e portal são únicos: num traço, vale a última célula.
  if (OBJECT_BEHAVIOR[type].isUnique) {
    return placeObject(level, type, last.x, last.y, nextId(), properties);
  }

  const targets = new Set(inside.map((cell) => cellKey(cell.x, cell.y)));
  const unchanged = level.objects.filter(
    (object) => targets.has(cellKey(object.x, object.y)) && object.type === type && sameProperties(object.properties, properties),
  );

  if (unchanged.length === targets.size) {
    return level;
  }

  const kept = level.objects.filter((object) => !targets.has(cellKey(object.x, object.y)));
  const added = [...targets].map((key) => {
    const { x, y } = cellFromKey(key);

    return { id: nextId(), type, x, y, ...(properties ? { properties } : {}) };
  });

  return { ...level, objects: [...kept, ...added] };
}

/** Apaga tudo o que estiver nas células pedidas. */
export function removeMany(level: EditorLevel, cells: readonly GridCell[]): EditorLevel {
  const targets = new Set(cells.map((cell) => cellKey(cell.x, cell.y)));
  const remaining = level.objects.filter((object) => !targets.has(cellKey(object.x, object.y)));

  return remaining.length === level.objects.length ? level : { ...level, objects: remaining };
}

/** Troca as propriedades da peça de uma célula: texto da placa, alcance da plataforma. */
export function updatePropertiesAt(level: EditorLevel, x: number, y: number, properties: LevelObjectProperties): EditorLevel {
  const current = objectAt(level, x, y);

  if (!current || sameProperties(current.properties, properties)) {
    return level;
  }

  const updated = { ...current, properties };

  return { ...level, objects: level.objects.map((object) => (object === current ? updated : object)) };
}

/**
 * Surpresa de "?" que os botões de "todas as surpresas" alcançam. O Lucky
 * Block e o Bloco de Moedas ficam de fora: são peças com cara própria, e
 * trocar o que têm dentro mudaria o desenho delas na fase.
 */
export function isRefillableSurprise(object: LevelObject): boolean {
  const contents = object.properties?.contents;

  return object.type === 'surprise' && contents !== 'lucky' && contents !== 'multi-coins';
}

/**
 * Troca de uma vez o que sai de todas as surpresas de "?" da fase: esvazia
 * todas ou enche todas de moedas, cristais ou um poder. Só o poder guarda qual
 * é o poder; as outras propriedades da peça ficam como estavam. Sem nada para
 * mudar, devolve a mesma fase — o desfazer não ganha um passo vazio.
 */
export function refillSurprises(level: EditorLevel, contents: SurpriseContent, powerUp?: PowerUpKind): EditorLevel {
  const nextPowerUp = contents === 'power-up' ? (powerUp ?? 'mushroom') : undefined;
  let changed = false;

  const objects = level.objects.map((object) => {
    const current = object.properties ?? {};

    if (!isRefillableSurprise(object) || ((current.contents ?? 'coins') === contents && current.powerUp === nextPowerUp)) {
      return object;
    }

    // Sem poder, a chave sai de vez, em vez de ficar guardada vazia.
    const properties = Object.fromEntries(
      Object.entries({ ...current, contents, powerUp: nextPowerUp }).filter(([, value]) => value !== undefined),
    ) as LevelObjectProperties;

    changed = true;
    return { ...object, properties };
  });

  return changed ? { ...level, objects } : level;
}

/**
 * Células no caminho reto entre duas, com as pontas incluídas.
 *
 * O dedo corre mais rápido que a tela avisa: sem isso, um risco ligeiro
 * deixaria buracos entre uma célula e outra.
 */
export function cellsOnLine(from: GridCell, to: GridCell): GridCell[] {
  const cells: GridCell[] = [];
  const stepX = Math.sign(to.x - from.x);
  const stepY = Math.sign(to.y - from.y);
  const distanceX = Math.abs(to.x - from.x);
  const distanceY = Math.abs(to.y - from.y);
  let x = from.x;
  let y = from.y;
  let error = distanceX - distanceY;

  for (;;) {
    cells.push({ x, y });

    if (x === to.x && y === to.y) {
      return cells;
    }

    const doubled = error * 2;

    if (doubled > -distanceY) {
      error -= distanceY;
      x += stepX;
    }

    if (doubled < distanceX) {
      error += distanceX;
      y += stepY;
    }
  }
}

/** Todas as células do retângulo entre dois cantos, com os cantos incluídos. */
export function cellsInRect(from: GridCell, to: GridCell): GridCell[] {
  const cells: GridCell[] = [];

  for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y += 1) {
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

/** Chave numérica de uma célula; cabe folgado na largura máxima da fase. */
function cellKey(x: number, y: number): number {
  return y * CELL_KEY_STRIDE + x;
}

function cellFromKey(key: number): GridCell {
  return { x: key % CELL_KEY_STRIDE, y: Math.floor(key / CELL_KEY_STRIDE) };
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

/** Escolhe a tela da fase; `null` volta a usar a tela dos ajustes de quem joga. */
export function changeScreen(level: EditorLevel, screen: ScreenMode | null): EditorLevel {
  if ((level.screen ?? null) === screen) {
    return level;
  }

  if (screen === null) {
    const { screen: _removed, ...rest } = level;

    return rest;
  }

  return { ...level, screen };
}

function isInside(level: EditorLevel, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height;
}

function sameProperties(first: LevelObjectProperties | undefined, second: LevelObjectProperties | undefined): boolean {
  return JSON.stringify(first ?? {}) === JSON.stringify(second ?? {});
}
