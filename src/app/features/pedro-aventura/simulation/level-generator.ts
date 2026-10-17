import { SeededRandom, seedFromText } from '../../games/pedro-maker/levels/seeded-random';
import { type Difficulty, difficultyById } from '../config/difficulty.config';
import type { LevelDefinition, ObstacleKind } from '../models/campaign.model';
import { type Lane, LANES, type ObstacleSpec, type PickupSpec, type RampSpec, type TrackLayout } from './track.model';

/** Trecho sem obstáculos no começo, no fim e em volta de cada checkpoint. */
const START_CLEAR = 40;
const END_CLEAR = 28;
const CHECKPOINT_CLEAR = 10;

/** Espaço entre fileiras: maior nas fases calmas, menor nas cheias. */
const GAP_CALM = 26;
const GAP_BUSY = 14;

/** Carros andando precisam de pista livre na frente para a criança reagir. */
const TRAFFIC_EXTRA_GAP = 16;

/** Trecho sem obstáculo depois de cada rampa: o voo inteiro cabe nele. */
const RAMP_ZONE = 24;

/** Distância mínima entre a última fileira e a rampa seguinte. */
const RAMP_RUN_UP = 6;

const COIN_SPACING = 2.4;
const COIN_HEIGHT = 1.0;

/** Obstáculos que podem ocupar as três faixas ao mesmo tempo, porque há como passar por cima ou por baixo. */
const FULL_ROW_KINDS: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>(['barrier', 'high-bar', 'cone']);

/** Obstáculos que ficam sozinhos na fileira: os que andam. */
const SOLO_KINDS: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>(['traffic-car', 'sweeper', 'animal']);

/** Chance de uma fileira de moedas terminar numa barra de ouro. */
const GOLD_BAR_CHANCE = 0.2;

/** Diamantes ficam no alto: só quem pula na hora certa alcança. */
const DIAMOND_HEIGHT = 2.3;
const DIAMOND_FRACTIONS: readonly number[] = [0.45, 0.8];

/** Fases a partir deste comprimento ganham um segundo turbo. */
const LONG_LEVEL_METERS = 700;

/** A coroa da rampa fica acima do arco: só quem pula pela rampa alcança. */
const RAMP_CROWN_HEIGHT = 4.2;

/** Arco de moedas sobre a rampa: distância e altura de cada uma, no caminho do voo. */
const RAMP_COIN_ARC: readonly { readonly dz: number; readonly y: number }[] = [
  { dz: 4, y: 2.2 },
  { dz: 6.5, y: 3.0 },
  { dz: 9, y: 3.4 },
  { dz: 11.5, y: 3.0 },
  { dz: 14, y: 2.2 },
];

interface Row {
  readonly z: number;
  /** Faixas ocupadas e o obstáculo de cada uma. */
  readonly blocked: ReadonlyMap<Lane, ObstacleKind>;
  readonly isSolo: boolean;
}

/**
 * Transforma a ficha de uma fase numa pista.
 *
 * Determinístico: a mesma fase gera sempre a mesma pista, em qualquer
 * aparelho — é o que permite validar o resultado de uma partida e testar
 * todas as fases do jogo.
 *
 * Regra de segurança: toda fileira deixa uma faixa livre, a não ser que seja
 * uma fileira inteira de algo que se pula ou se passa por baixo.
 */
export function generateLayout(baseLevel: LevelDefinition, difficulty: Difficulty = 'facil'): TrackLayout {
  // O Fácil mantém a semente original: as pistas de sempre continuam as mesmas.
  const seed = difficulty === 'facil' ? `pedro-aventura:${baseLevel.id}` : `pedro-aventura:${baseLevel.id}:${difficulty}`;
  const random = new SeededRandom(seedFromText(seed));
  const level = withDensity(baseLevel, difficulty);
  const checkpoints = [Math.round(level.lengthMeters / 3), Math.round((level.lengthMeters * 2) / 3)];
  const { rows, rampPositions } = buildPlan(level, random, checkpoints);
  const obstacles = rowsToObstacles(rows);

  const ids = { next: obstacles.length + 1 };
  const pickups: PickupSpec[] = [];
  const ramps: RampSpec[] = [];

  placeRamps(rampPositions, random, ids, ramps, pickups);
  placeGapPickups(level, rows, random, ids, ramps, pickups);
  placeCrowns(level, rows, ids, ramps, pickups);
  placeDiamonds(level, rows, ids, pickups);
  placeTurbos(level, rows, ids, pickups);

  const count = (kind: PickupSpec['kind']) => pickups.filter((pickup) => pickup.kind === kind).length;

  return {
    levelId: level.id,
    length: level.lengthMeters,
    checkpoints,
    obstacles,
    pickups: pickups.sort((first, second) => first.z - second.z),
    ramps,
    totals: {
      coins: count('coin'),
      goldBars: count('gold-bar'),
      diamonds: count('diamond'),
      hearts: count('heart'),
      crowns: count('crown'),
      turbos: count('turbo'),
      ramps: ramps.length,
    },
  };
}

/** Densidade da fase já com o acréscimo da dificuldade, sem passar do teto que ainda deixa respirar. */
const MAX_DENSITY = 0.85;

function withDensity(level: LevelDefinition, difficulty: Difficulty): LevelDefinition {
  const bonus = difficultyById(difficulty).densityBonus;

  return bonus === 0 ? level : { ...level, density: Math.min(MAX_DENSITY, level.density + bonus) };
}

interface TrackPlan {
  readonly rows: readonly Row[];
  readonly rampPositions: readonly number[];
}

/**
 * Distribui as fileiras e as rampas ao longo da pista.
 *
 * As rampas têm trecho reservado, espalhadas por igual: a fase sempre tem uma
 * rampa a mais do que o objetivo pede, por mais cheia que seja.
 */
function buildPlan(level: LevelDefinition, random: SeededRandom, checkpoints: readonly number[]): TrackPlan {
  const rows: Row[] = [];
  const rampPositions: number[] = [];
  const lastZ = level.lengthMeters - END_CLEAR;
  const baseGap = GAP_CALM + (GAP_BUSY - GAP_CALM) * level.density;
  const rampCount = level.rampTarget + 1;
  const rampMarks = Array.from({ length: rampCount }, (_, index) => START_CLEAR + ((lastZ - START_CLEAR) * (index + 0.5)) / rampCount);
  let z = START_CLEAR;
  let isAfterRamp = false;

  while (z < lastZ) {
    const nearCheckpoint = checkpoints.find((checkpoint) => Math.abs(checkpoint - z) < CHECKPOINT_CLEAR);

    if (nearCheckpoint !== undefined) {
      z = nearCheckpoint + CHECKPOINT_CLEAR;
      continue;
    }

    const previous = rows.at(-1) ?? null;
    const nextMark = rampMarks[rampPositions.length];

    if (nextMark !== undefined && z >= nextMark) {
      const rampZ = Math.max(z, (previous?.z ?? 0) + RAMP_RUN_UP);

      rampPositions.push(rampZ);
      z = rampZ + RAMP_ZONE;
      isAfterRamp = true;
      continue;
    }

    const row = buildRow(level, random, z, previous, isAfterRamp);

    rows.push(row);
    isAfterRamp = false;

    const gap = baseGap * (0.85 + random.next() * 0.4);
    const hasTraffic = [...row.blocked.values()].includes('traffic-car');

    z += hasTraffic ? gap + TRAFFIC_EXTRA_GAP : gap;
  }

  return { rows, rampPositions };
}

/** `isAfterRamp`: logo depois do voo não vem carro na contramão, que chegaria junto com o pouso. */
function buildRow(level: LevelDefinition, random: SeededRandom, z: number, previous: Row | null, isAfterRamp: boolean): Row {
  const drawn = random.pick(level.obstacleKinds);
  const regular = level.obstacleKinds.filter((candidate) => !SOLO_KINDS.has(candidate));
  const kind = isAfterRamp && drawn === 'traffic-car' ? (regular[0] ?? 'sweeper') : drawn;

  if (SOLO_KINDS.has(kind)) {
    const lane = kind === 'sweeper' ? 0 : trafficLane(random, previous);

    return { z, blocked: new Map([[lane, kind]]), isSolo: true };
  }

  // Daqui em diante `kind` é um obstáculo comum; os companheiros de fileira também são.
  const kinds: readonly [ObstacleKind, ...ObstacleKind[]] = [kind, ...regular];

  if (FULL_ROW_KINDS.has(kind) && random.chance(level.density * 0.25)) {
    return { z, blocked: new Map(LANES.map((lane) => [lane, kind])), isSolo: false };
  }

  const blockedCount = level.density > 0.4 && random.chance(0.4) ? 2 : 1;
  const lanes = shuffled(LANES, random).slice(0, blockedCount);
  const blocked = new Map<Lane, ObstacleKind>(
    lanes.map((lane, index) => [lane, index === 0 ? kind : random.pick(kinds)]),
  );

  return { z, blocked, isSolo: false };
}

/**
 * Faixa do carro na contramão.
 *
 * Se a fileira anterior deixou só uma faixa livre, o carro nunca vem nela: a
 * criança sairia de um obstáculo direto na frente do carro.
 */
function trafficLane(random: SeededRandom, previous: Row | null): Lane {
  const previousFree = previous ? freeLanes(previous) : LANES;
  const candidates = previousFree.length === 1 ? LANES.filter((lane) => lane !== previousFree[0]) : LANES;

  return random.pick(nonEmpty(candidates));
}

function rowsToObstacles(rows: readonly Row[]): ObstacleSpec[] {
  let id = 1;

  return rows.flatMap((row) =>
    [...row.blocked.entries()].map(([lane, kind]) => ({ id: id++, kind, lane, z: row.z })),
  );
}

/** Rampas com arco de moedas, cada uma no começo do seu trecho reservado. */
function placeRamps(
  positions: readonly number[],
  random: SeededRandom,
  ids: { next: number },
  ramps: RampSpec[],
  pickups: PickupSpec[],
): void {
  for (const z of positions) {
    const lane = random.pick(nonEmpty(LANES));

    ramps.push({ id: ids.next++, lane, z });

    for (const point of RAMP_COIN_ARC) {
      pickups.push({ id: ids.next++, kind: 'coin', lane, z: z + point.dz, y: point.y });
    }
  }
}

/** Fileiras de moedas e corações nos trechos entre obstáculos. */
function placeGapPickups(
  level: LevelDefinition,
  rows: readonly Row[],
  random: SeededRandom,
  ids: { next: number },
  ramps: readonly RampSpec[],
  pickups: PickupSpec[],
): void {
  const stretches = [{ from: 12, to: rows[0]?.z ?? level.lengthMeters - END_CLEAR }];

  rows.forEach((row, index) => {
    stretches.push({ from: row.z + 3, to: (rows[index + 1]?.z ?? level.lengthMeters - 6) - 3 });
  });

  for (const stretch of stretches) {
    const length = stretch.to - stretch.from;

    if (length < 6) {
      continue;
    }

    const takenByRamp = ramps.filter((ramp) => ramp.z >= stretch.from - 4 && ramp.z <= stretch.to).map((ramp) => ramp.lane);
    const lanes = LANES.filter((lane) => !takenByRamp.includes(lane));

    if (lanes.length === 0) {
      continue;
    }

    const lane = random.pick(nonEmpty(lanes));
    const coins = Math.min(8, Math.floor(length / COIN_SPACING));

    for (let index = 0; index < coins; index += 1) {
      pickups.push({ id: ids.next++, kind: 'coin', lane, z: stretch.from + index * COIN_SPACING, y: COIN_HEIGHT });
    }

    const hasHeart = random.chance(0.22);
    const goldZ = stretch.from + coins * COIN_SPACING;

    // A fileira de moedas às vezes termina numa barra de ouro, na mesma faixa.
    if (random.chance(GOLD_BAR_CHANCE) && goldZ < stretch.to) {
      pickups.push({ id: ids.next++, kind: 'gold-bar', lane, z: goldZ, y: COIN_HEIGHT });
    }

    if (!hasHeart) {
      continue;
    }

    // O coração fica ao lado das moedas, ou logo depois delas quando só sobra uma faixa.
    const otherLanes = lanes.filter((candidate) => candidate !== lane);
    const afterCoins = stretch.from + coins * COIN_SPACING + 1;

    if (otherLanes.length > 0) {
      pickups.push({ id: ids.next++, kind: 'heart', lane: random.pick(nonEmpty(otherLanes)), z: stretch.from + length / 2, y: COIN_HEIGHT });
    } else if (afterCoins + 1.5 < stretch.to) {
      pickups.push({ id: ids.next++, kind: 'heart', lane, z: afterCoins + 1.5, y: COIN_HEIGHT });
    }
  }

  ensureGoldBar(pickups);
}

/** Toda fase tem ao menos uma barra de ouro: a última moeda da primeira fileira vira barra. */
function ensureGoldBar(pickups: PickupSpec[]): void {
  if (pickups.some((pickup) => pickup.kind === 'gold-bar')) {
    return;
  }

  const firstLine = pickups.filter((pickup) => pickup.kind === 'coin' && pickup.y === COIN_HEIGHT);
  const last = firstLine.find((pickup, index) => firstLine[index + 1]?.lane !== pickup.lane || index === firstLine.length - 1);

  if (last) {
    pickups[pickups.indexOf(last)] = { ...last, kind: 'gold-bar' };
  }
}

/** Fileira mais perto de uma fração da pista, entre as que deixam faixa livre. */
function rowNear(level: LevelDefinition, rows: readonly Row[], fraction: number): Row | null {
  const target = level.lengthMeters * fraction;
  const candidates = rows.filter((row) => !row.isSolo && freeLanes(row).length > 0);

  return candidates.reduce<Row | null>(
    (closest, candidate) => (closest === null || Math.abs(candidate.z - target) < Math.abs(closest.z - target) ? candidate : closest),
    null,
  );
}

/** Dois diamantes por fase, no alto de uma faixa livre bem na altura da fileira: é preciso pular. */
function placeDiamonds(level: LevelDefinition, rows: readonly Row[], ids: { next: number }, pickups: PickupSpec[]): void {
  for (const fraction of DIAMOND_FRACTIONS) {
    const row = rowNear(level, rows, fraction);

    if (row) {
      pickups.push({ id: ids.next++, kind: 'diamond', lane: nonEmpty(freeLanes(row))[0], z: row.z, y: DIAMOND_HEIGHT });
    }
  }
}

/** Turbo no meio da pista (e um segundo nas fases longas), numa faixa sem outro item por perto. */
function placeTurbos(level: LevelDefinition, rows: readonly Row[], ids: { next: number }, pickups: PickupSpec[]): void {
  const fractions = level.lengthMeters >= LONG_LEVEL_METERS ? [0.3, 0.65] : [0.5];

  for (const fraction of fractions) {
    const target = level.lengthMeters * fraction;
    // Da fileira mais perto do ponto desejado para a mais longe, até achar uma faixa sem item por perto.
    const candidates = rows.filter((row) => !row.isSolo).sort((first, second) => Math.abs(first.z - target) - Math.abs(second.z - target));

    for (const row of candidates) {
      const z = row.z + 6;
      const lane = freeLanes(row).find(
        (candidate) => !pickups.some((pickup) => pickup.lane === candidate && Math.abs(pickup.z - z) < 2),
      );

      if (lane !== undefined) {
        pickups.push({ id: ids.next++, kind: 'turbo', lane, z, y: COIN_HEIGHT });
        break;
      }
    }
  }
}

/** Três coroas por fase: uma em cada terço, sempre numa faixa livre. A do meio voa sobre uma rampa quando há. */
function placeCrowns(level: LevelDefinition, rows: readonly Row[], ids: { next: number }, ramps: readonly RampSpec[], pickups: PickupSpec[]): void {
  const middleRamp = ramps[Math.floor(ramps.length / 2)] ?? null;

  [0.25, 0.55, 0.85].forEach((fraction, index) => {
    if (index === 1 && middleRamp) {
      pickups.push({ id: ids.next++, kind: 'crown', lane: middleRamp.lane, z: middleRamp.z + 9, y: RAMP_CROWN_HEIGHT });
      return;
    }

    const target = level.lengthMeters * fraction;
    const row = rows.reduce<Row | null>(
      (closest, candidate) => (closest === null || Math.abs(candidate.z - target) < Math.abs(closest.z - target) ? candidate : closest),
      null,
    );
    const z = row ? row.z + 5 : target;
    const lane = row ? nonEmpty(freeLanes(row))[0] : 0;
    const occupied = pickups.some((pickup) => pickup.lane === lane && Math.abs(pickup.z - z) < 1.2);

    pickups.push({ id: ids.next++, kind: 'crown', lane, z: occupied ? z + 1.2 : z, y: COIN_HEIGHT + 0.3 });
  });
}

export function freeLanes(row: Row): readonly Lane[] {
  return LANES.filter((lane) => !row.blocked.has(lane));
}

function shuffled(lanes: readonly Lane[], random: SeededRandom): Lane[] {
  const copy = [...lanes];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = random.integer(0, index);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }

  return copy;
}

/** Garante ao sorteio uma lista não vazia; a do meio é o recuo seguro. */
function nonEmpty(lanes: readonly Lane[]): readonly [Lane, ...Lane[]] {
  return lanes.length > 0 ? [lanes[0], ...lanes.slice(1)] : [0];
}
