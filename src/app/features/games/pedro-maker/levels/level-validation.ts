import { OBJECT_BEHAVIOR } from '../config/object-catalog';
import {
  type LevelBlueprint,
  type LevelObject,
  type LevelObjectProperties,
  type LevelObjectType,
  POWER_UP_KINDS,
  SURPRISE_CONTENTS,
} from '../models/level.model';

export const LEVEL_LIMITS = {
  minWidth: 30,
  maxWidth: 400,
  minHeight: 15,
  maxHeight: 40,
  maxObjects: 12000,
} as const;

const KNOWN_TYPES = new Set<string>(Object.keys(OBJECT_BEHAVIOR));

export function isLevelObjectType(value: unknown): value is LevelObjectType {
  return typeof value === 'string' && KNOWN_TYPES.has(value);
}

/**
 * Problemas estruturais de uma fase, em frases para a criança ler.
 *
 * Lista vazia quer dizer fase jogável. Não verifica se o portal é alcançável —
 * isso é trabalho do validador de alcance, bem mais caro.
 */
export function findStructuralProblems(blueprint: LevelBlueprint): readonly string[] {
  const problems: string[] = [];

  if (!isWithin(blueprint.width, LEVEL_LIMITS.minWidth, LEVEL_LIMITS.maxWidth)) {
    problems.push(`A fase precisa ter entre ${LEVEL_LIMITS.minWidth} e ${LEVEL_LIMITS.maxWidth} colunas.`);
  }

  if (!isWithin(blueprint.height, LEVEL_LIMITS.minHeight, LEVEL_LIMITS.maxHeight)) {
    problems.push(`A fase precisa ter entre ${LEVEL_LIMITS.minHeight} e ${LEVEL_LIMITS.maxHeight} linhas.`);
  }

  if (blueprint.objects.length > LEVEL_LIMITS.maxObjects) {
    problems.push('A fase tem objetos demais.');
  }

  const starts = countOf(blueprint.objects, 'start');
  const portals = countOf(blueprint.objects, 'portal');

  if (starts !== 1) {
    problems.push(starts === 0 ? 'Coloque o ponto de início do Pedro.' : 'A fase só pode ter um início.');
  }

  if (portals !== 1) {
    problems.push(portals === 0 ? 'Coloque o portal final.' : 'A fase só pode ter um portal final.');
  }

  const outside = blueprint.objects.some(
    (object) => !isWithin(object.x, 0, blueprint.width - 1) || !isWithin(object.y, 0, blueprint.height - 1),
  );

  if (outside) {
    problems.push('Há objetos fora da área da fase.');
  }

  return problems;
}

/**
 * Normaliza um objeto vindo de fora (save, editor antigo).
 *
 * Devolve `null` para o que não tem conserto, em vez de lançar: um objeto
 * estranho some da fase e o resto dela continua de pé.
 */
export function sanitizeLevelObject(value: unknown, width: number, height: number): LevelObject | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Partial<LevelObject>;

  if (
    typeof candidate.id !== 'string' ||
    !isLevelObjectType(candidate.type) ||
    !isCell(candidate.x, width) ||
    !isCell(candidate.y, height)
  ) {
    return null;
  }

  const properties = sanitizeProperties(candidate.properties);

  return {
    id: candidate.id,
    type: candidate.type,
    x: candidate.x,
    y: candidate.y,
    ...(properties ? { properties } : {}),
  };
}

function sanitizeProperties(value: unknown): LevelObjectProperties | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const contents = pickOne(source['contents'], SURPRISE_CONTENTS);
  const powerUp = pickOne(source['powerUp'], POWER_UP_KINDS);
  const axis = pickOne(source['axis'], ['horizontal', 'vertical'] as const);
  const range = typeof source['range'] === 'number' && Number.isFinite(source['range'])
    ? Math.min(12, Math.max(1, Math.trunc(source['range'])))
    : undefined;
  const text = typeof source['text'] === 'string' ? source['text'].slice(0, 80) : undefined;
  const touchText = typeof source['touchText'] === 'string' ? source['touchText'].slice(0, 80) : undefined;
  const pair = typeof source['pair'] === 'string' ? source['pair'].slice(0, 12) : undefined;

  const properties: LevelObjectProperties = {
    ...(contents ? { contents } : {}),
    ...(powerUp ? { powerUp } : {}),
    ...(axis ? { axis } : {}),
    ...(range !== undefined ? { range } : {}),
    ...(text !== undefined ? { text } : {}),
    ...(touchText !== undefined ? { touchText } : {}),
    ...(pair !== undefined ? { pair } : {}),
  };

  return Object.keys(properties).length > 0 ? properties : null;
}

function pickOne<TValue extends string>(value: unknown, allowed: readonly TValue[]): TValue | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as TValue)
    : undefined;
}

function countOf(objects: readonly LevelObject[], type: LevelObjectType): number {
  return objects.reduce((total, object) => (object.type === type ? total + 1 : total), 0);
}

function isWithin(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isCell(value: unknown, size: number): value is number {
  return typeof value === 'number' && isWithin(value, 0, size - 1);
}
