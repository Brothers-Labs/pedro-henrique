import { DEFAULT_LEVEL_HEIGHT } from '../config/physics.config';
import type {
  EnemyKind,
  LevelBlueprint,
  LevelTheme,
  PowerUpKind,
  SurpriseContent,
} from '../models/level.model';
import { LevelBuilder } from './level-builder';
import { analyzeReachability } from './level-reachability';
import { SeededRandom } from './seeded-random';

export interface GeneratorOptions {
  readonly id: string;
  readonly name: string;
  readonly seed: number;
  readonly theme: LevelTheme;
  /** De 1 (bem tranquila) a 5 (bem desafiadora). */
  readonly difficulty: number;
  /** Largura em células. */
  readonly width: number;
  readonly enemies: readonly [EnemyKind, ...EnemyKind[]];
}

type SegmentKind =
  | 'flat'
  | 'step'
  | 'gap'
  | 'platforms'
  | 'blocks'
  | 'spring'
  | 'moving'
  | 'stairs'
  | 'crumble';

interface CrystalSpot {
  readonly x: number;
  readonly y: number;
  /** Cristal escondido em bloco surpresa, e não solto no ar. */
  readonly isHidden: boolean;
  /** Lugar comum, usado só quando faltam lugares mais interessantes. */
  readonly isFallback?: boolean;
}

/** Tentativas com sementes vizinhas antes de recorrer à fase de segurança. */
const MAX_ATTEMPTS = 30;

const CRYSTALS_PER_LEVEL = 3;
const HIGHEST_SURFACE = 8;
const LOWEST_SURFACE = 12;
const END_PADDING = 14;

const POWER_UPS: readonly [PowerUpKind, ...PowerUpKind[]] = ['super-jump', 'shield', 'turbo', 'magnet', 'wings'];

/**
 * Gerador de fases.
 *
 * Monta a fase em trechos — chão, buracos, degraus, plataformas, blocos,
 * molas — sempre com a mesma semente produzindo a mesma fase. Toda fase
 * gerada passa pelo validador de alcance antes de sair daqui: se o portal ou
 * algum cristal ficou fora de alcance, a semente seguinte é tentada.
 *
 * Moedas fora de alcance são retiradas, para que "pegar todas" seja sempre
 * possível.
 */
export function generateLevel(options: GeneratorOptions): LevelBlueprint {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = composeLevel(options, options.seed + attempt * 7919);
    const report = analyzeReachability(candidate);

    if (report.isPortalReachable && report.unreachableCrystals === 0) {
      const unreachable = new Set(report.unreachableCollectibles);

      return { ...candidate, objects: candidate.objects.filter((object) => !unreachable.has(object)) };
    }
  }

  return composeSafeLevel(options);
}

function composeLevel(options: GeneratorOptions, seed: number): LevelBlueprint {
  const random = new SeededRandom(seed);
  const height = DEFAULT_LEVEL_HEIGHT;
  const width = Math.max(60, options.width);
  const builder = new LevelBuilder(width, height);
  const difficulty = Math.min(5, Math.max(1, Math.round(options.difficulty)));
  const crystalSpots: CrystalSpot[] = [];

  let surface = LOWEST_SURFACE;
  let cursor = 10;
  let hasCheckpoint = false;

  builder.ground(0, cursor - 1, surface);
  builder.add('start', 2, surface - 1);
  decorate(builder, random, 0, cursor - 1, surface);

  while (cursor < width - END_PADDING) {
    if (!hasCheckpoint && cursor > width / 2) {
      builder.ground(cursor, cursor + 3, surface);
      builder.add('checkpoint', cursor + 1, surface - 1);
      cursor += 4;
      hasCheckpoint = true;
      continue;
    }

    const kind = random.weighted(segmentWeights(difficulty, options.theme));
    const next = buildSegment(kind, {
      builder,
      random,
      x: cursor,
      surface,
      difficulty,
      options,
      crystalSpots,
    });

    cursor = next.x;
    surface = next.surface;
  }

  builder.ground(cursor, width - 1, surface);
  builder.add('portal', width - 6, surface - 1);
  decorate(builder, random, cursor, width - 8, surface);

  placeCrystals(builder, random, crystalSpots);

  return builder.build({
    id: options.id,
    name: options.name,
    theme: options.theme,
    targetTimeSeconds: Math.round(width * 0.6),
  });
}

interface SegmentContext {
  readonly builder: LevelBuilder;
  readonly random: SeededRandom;
  readonly x: number;
  readonly surface: number;
  readonly difficulty: number;
  readonly options: GeneratorOptions;
  readonly crystalSpots: CrystalSpot[];
}

interface SegmentEnd {
  readonly x: number;
  readonly surface: number;
}

function segmentWeights(difficulty: number, theme: LevelTheme): readonly (readonly [SegmentKind, number])[] {
  const airy = theme === 'estrelas' ? 2 : 1;

  return [
    ['flat', 4],
    ['step', 3],
    ['gap', 2 + difficulty * 0.5],
    ['platforms', (1 + difficulty * 0.5) * airy],
    ['blocks', 2.5],
    ['spring', 1.2],
    ['moving', difficulty >= 2 ? 1 + difficulty * 0.3 : 0],
    ['stairs', 1.2],
    ['crumble', difficulty >= 3 ? 1 : 0],
  ];
}

function buildSegment(kind: SegmentKind, context: SegmentContext): SegmentEnd {
  switch (kind) {
    case 'flat':
      return flatSegment(context);
    case 'step':
      return stepSegment(context);
    case 'gap':
      return gapSegment(context);
    case 'platforms':
      return platformsSegment(context);
    case 'blocks':
      return blocksSegment(context);
    case 'spring':
      return springSegment(context);
    case 'moving':
      return movingSegment(context);
    case 'stairs':
      return stairsSegment(context);
    case 'crumble':
      return crumbleSegment(context);
  }
}

function flatSegment({ builder, random, x, surface, difficulty, options, crystalSpots }: SegmentContext): SegmentEnd {
  const length = random.integer(6, 10);
  const end = x + length - 1;

  builder.ground(x, end, surface);
  decorate(builder, random, x, end, surface);

  if (random.chance(0.35 + difficulty * 0.1)) {
    placeEnemy(builder, random, options.enemies, x + Math.floor(length / 2), surface);
  }

  if (random.chance(0.6)) {
    builder.coins(x + 2, surface - 3, Math.min(4, length - 3));
  }

  crystalSpots.push({ x: x + 1, y: surface - 3, isHidden: false, isFallback: true });

  return { x: end + 1, surface };
}

function stepSegment({ builder, random, x, surface }: SegmentContext): SegmentEnd {
  const change = random.pick([-2, -1, 1, 2] as const);
  const next = clampSurface(surface - change);
  const length = random.integer(5, 8);

  builder.ground(x, x + length - 1, next);
  builder.coins(x + 1, next - 2, 2);

  return { x: x + length, surface: next };
}

function gapSegment({ builder, random, x, surface, difficulty, options, crystalSpots }: SegmentContext): SegmentEnd {
  const gap = random.integer(2, difficulty >= 3 ? 4 : 3);

  fillPit(builder, options.theme, x, x + gap - 1);
  builder.coinArc(x - 1, surface - 3, gap + 2);

  if (random.chance(0.25)) {
    crystalSpots.push({ x: x + Math.floor(gap / 2), y: surface - 5, isHidden: false });
  }

  const landing = clampSurface(surface - random.pick([0, 0, 1] as const));
  const length = random.integer(4, 7);

  builder.ground(x + gap, x + gap + length - 1, landing);

  return { x: x + gap + length, surface: landing };
}

function platformsSegment({ builder, random, x, surface, options, crystalSpots }: SegmentContext): SegmentEnd {
  const pit = random.integer(6, 9);
  const platformRow = surface - random.integer(1, 2);

  fillPit(builder, options.theme, x, x + pit - 1);

  let platformX = x + 1;

  while (platformX < x + pit - 1) {
    const length = random.integer(2, 3);
    builder.row('platform', platformX, platformRow, Math.min(length, x + pit - 1 - platformX));
    builder.coins(platformX, platformRow - 1, Math.min(length, x + pit - 1 - platformX));
    platformX += length + random.integer(1, 2);
  }

  if (random.chance(0.4)) {
    crystalSpots.push({ x: x + Math.floor(pit / 2), y: platformRow - 3, isHidden: false });
  }

  const length = random.integer(4, 6);
  builder.ground(x + pit, x + pit + length - 1, surface);

  return { x: x + pit + length, surface };
}

function blocksSegment({ builder, random, x, surface, crystalSpots, difficulty, options }: SegmentContext): SegmentEnd {
  const length = random.integer(8, 11);
  const blockRow = surface - 4;
  const blockStart = x + 2;
  const blockCount = random.integer(3, 5);

  builder.ground(x, x + length - 1, surface);

  for (let index = 0; index < blockCount; index += 1) {
    const blockX = blockStart + index;
    const isSurprise = index % 2 === 0;

    if (!isSurprise) {
      builder.add('brick', blockX, blockRow);
      continue;
    }

    const contents: SurpriseContent = random.weighted([
      ['coins', 6],
      ['heart', 1.5],
      ['power-up', 2],
    ]);

    builder.add('surprise', blockX, blockRow, {
      contents,
      ...(contents === 'power-up' ? { powerUp: random.pick(POWER_UPS) } : {}),
    });
  }

  crystalSpots.push({ x: blockStart + blockCount - 1, y: blockRow, isHidden: true });

  if (random.chance(0.3 + difficulty * 0.08)) {
    placeEnemy(builder, random, options.enemies, x + length - 2, surface);
  }

  return { x: x + length, surface };
}

function springSegment({ builder, random, x, surface, crystalSpots }: SegmentContext): SegmentEnd {
  const length = random.integer(8, 10);
  const shelfRow = Math.max(2, surface - 7);

  builder.ground(x, x + length - 1, surface);
  builder.add('spring', x + 2, surface - 1);
  builder.row('platform', x + 3, shelfRow, 4);
  builder.coins(x + 3, shelfRow - 1, 3);
  crystalSpots.push({ x: x + 6, y: shelfRow - 1, isHidden: false });

  return { x: x + length, surface };
}

function movingSegment({ builder, random, x, surface, options }: SegmentContext): SegmentEnd {
  const pit = random.integer(6, 8);

  fillPit(builder, options.theme, x, x + pit - 1);
  builder.add('moving-platform', x + 1, surface, { axis: 'horizontal', range: pit - 3 });
  builder.coins(x + 2, surface - 3, pit - 4);
  builder.ground(x + pit, x + pit + 4, surface);

  return { x: x + pit + 5, surface };
}

function stairsSegment({ builder, random, x, surface }: SegmentContext): SegmentEnd {
  const steps = random.integer(2, 3);

  builder.ground(x, x + steps * 2 + 3, surface);

  for (let step = 1; step <= steps; step += 1) {
    const left = x + 1 + (step - 1);
    const right = x + steps * 2 + 1 - (step - 1);
    builder.fill('stone', left, right, surface - step, surface - step);
  }

  builder.coins(x + steps, surface - steps - 2, 2);

  return { x: x + steps * 2 + 4, surface };
}

function crumbleSegment({ builder, random, x, surface, options }: SegmentContext): SegmentEnd {
  const pit = random.integer(4, 5);

  fillPit(builder, options.theme, x, x + pit - 1);
  builder.row('crumble', x, surface, pit);
  builder.coins(x, surface - 2, pit);
  builder.ground(x + pit, x + pit + 4, surface);

  return { x: x + pit + 5, surface };
}

/** Buraco: vazio na maioria dos mundos, lava no vulcão. */
function fillPit(builder: LevelBuilder, theme: LevelTheme, fromX: number, toX: number): void {
  builder.clearColumns(fromX, toX);

  if (theme === 'vulcao') {
    builder.fill('lava', fromX, toX, builder.height - 1, builder.height - 1);
  }
}

function placeEnemy(
  builder: LevelBuilder,
  random: SeededRandom,
  enemies: readonly [EnemyKind, ...EnemyKind[]],
  x: number,
  surface: number,
): void {
  const kind = random.pick(enemies);
  const y = kind === 'bat' || kind === 'ghost' ? surface - 3 : surface - 1;

  builder.add(kind, x, y);
}

function decorate(builder: LevelBuilder, random: SeededRandom, fromX: number, toX: number, surface: number): void {
  for (let x = fromX; x <= toX; x += 1) {
    if (builder.typeAt(x, surface - 1) !== null || !random.chance(0.18)) {
      continue;
    }

    builder.add(random.pick(['tree', 'bush', 'flower', 'flower', 'rock'] as const), x, surface - 1);
  }
}

/**
 * Três cristais por fase, espalhados entre os melhores lugares encontrados.
 *
 * Os lugares de reserva (no ar, sobre chão plano) só completam a conta quando
 * a fase não ofereceu três lugares mais interessantes.
 */
function placeCrystals(builder: LevelBuilder, random: SeededRandom, spots: readonly CrystalSpot[]): void {
  const preferred = spots.filter((spot) => !spot.isFallback);
  const fallback = spots.filter((spot) => spot.isFallback);
  const chosen = preferred.length >= CRYSTALS_PER_LEVEL
    ? pickSpread(preferred, CRYSTALS_PER_LEVEL, random)
    : [...preferred, ...pickSpread(fallback, CRYSTALS_PER_LEVEL - preferred.length, random)];

  for (const spot of chosen) {
    if (spot.isHidden) {
      builder.add('surprise', spot.x, spot.y, { contents: 'crystal' });
    } else {
      builder.add('crystal', spot.x, spot.y);
    }
  }
}

function pickSpread(spots: readonly CrystalSpot[], count: number, random: SeededRandom): CrystalSpot[] {
  if (spots.length <= count) {
    return [...spots];
  }

  const bucketSize = spots.length / count;

  return Array.from({ length: count }, (_, bucket) => {
    const from = Math.floor(bucket * bucketSize);
    const to = Math.max(from, Math.floor((bucket + 1) * bucketSize) - 1);

    return spots[random.integer(from, to)];
  });
}

function clampSurface(row: number): number {
  return Math.min(LOWEST_SURFACE, Math.max(HIGHEST_SURFACE, row));
}

/**
 * Fase de segurança: chão contínuo, degraus baixos e três cristais no caminho.
 *
 * Só aparece se nenhuma das sementes tentadas deu uma fase completável — o
 * que os testes garantem que não acontece nas fases da campanha.
 */
function composeSafeLevel(options: GeneratorOptions): LevelBlueprint {
  const width = Math.max(60, options.width);
  const surface = LOWEST_SURFACE;
  const builder = new LevelBuilder(width, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, width - 1, surface);
  builder.add('start', 2, surface - 1);

  for (let x = 12; x < width - 12; x += 12) {
    builder.fill('stone', x, x + 1, surface - 1, surface - 1);
    builder.coins(x - 3, surface - 3, 3);
  }

  const third = Math.floor(width / 4);
  builder.add('crystal', third, surface - 2);
  builder.add('crystal', third * 2, surface - 2);
  builder.add('crystal', third * 3, surface - 2);
  builder.add('checkpoint', Math.floor(width / 2) + 2, surface - 1);
  builder.add('portal', width - 6, surface - 1);

  return builder.build({
    id: options.id,
    name: options.name,
    theme: options.theme,
    targetTimeSeconds: Math.round(width * 0.6),
  });
}
