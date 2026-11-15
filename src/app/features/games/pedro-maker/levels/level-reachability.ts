import { OBJECT_BEHAVIOR } from '../config/object-catalog';
import { GRAVITY, PLAYER_PHYSICS, TILE_SIZE, VALIDATION_PHYSICS } from '../config/physics.config';
import { isGiantCoinType, type LevelBlueprint, type LevelObject } from '../models/level.model';
import { skeletonWallColumn } from './skeleton-platform';

/**
 * Validador de alcance: a fase pode ser vencida?
 *
 * Em vez de regras do tipo "buraco de no máximo quatro células", ele simula os
 * pulos de verdade — com a mesma gravidade do jogo e um impulso um pouco menor
 * que o real — a partir de cada chão alcançado. Paredes, tetos, molas,
 * plataformas de mão única, lava e água entram na conta como no jogo. Na água
 * o Pedro nada para qualquer lado e salta para fora pela superfície.
 *
 * É conservador de propósito: aprova só o que uma criança consegue fazer sem
 * precisar de um pulo perfeito. Inimigos e power-ups ficam fora da conta.
 */

const Surface = {
  Empty: 0,
  Solid: 1,
  OneWay: 2,
  Hazard: 3,
  Spring: 4,
  Water: 5,
} as const;

type Surface = (typeof Surface)[keyof typeof Surface];

export interface ReachabilityReport {
  readonly isPortalReachable: boolean;
  /** Objetos coletáveis (moedas, cristais, itens) fora do alcance. */
  readonly unreachableCollectibles: readonly LevelObject[];
  readonly unreachableCrystals: number;
}

interface Grid {
  readonly width: number;
  readonly height: number;
  readonly surfaces: Uint8Array;
}

export function analyzeReachability(blueprint: LevelBlueprint): ReachabilityReport {
  const grid = buildGrid(blueprint);
  const touched = explore(grid, blueprint);

  const wasTouched = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < grid.width && y < grid.height && touched[y * grid.width + x] === 1;

  const portal = blueprint.objects.find((object) => object.type === 'portal');
  const isPortalReachable = portal
    ? wasTouched(portal.x, portal.y) || wasTouched(portal.x, portal.y - 1)
    : false;

  const unreachableCollectibles = blueprint.objects.filter((object) => {
    if (object.type === 'surprise') {
      // O conteúdo sai quando a cabeça bate por baixo do bloco.
      return object.properties?.contents === 'crystal' && !wasTouched(object.x, object.y + 1);
    }

    return isCollectible(object) && !wasTouched(object.x, object.y);
  });

  return {
    isPortalReachable,
    unreachableCollectibles,
    unreachableCrystals: unreachableCollectibles.filter(
      (object) => object.type === 'crystal' || object.type === 'surprise',
    ).length,
  };
}

function isCollectible(object: LevelObject): boolean {
  return (
    object.type === 'coin' ||
    object.type === 'big-coin' ||
    object.type === 'huge-coin' ||
    object.type === 'mega-coin' ||
    isGiantCoinType(object.type) ||
    object.type === 'key' ||
    object.type === 'crystal' ||
    object.type === 'heart' ||
    object.type === 'power-up'
  );
}

function buildGrid(blueprint: LevelBlueprint): Grid {
  const { width, height } = blueprint;
  const surfaces = new Uint8Array(width * height);

  const mark = (x: number, y: number, surface: Surface): void => {
    if (x >= 0 && y >= 0 && x < width && y < height) {
      surfaces[y * width + x] = surface;
    }
  };

  for (const object of blueprint.objects) {
    if (object.type === 'spring') {
      mark(object.x, object.y, Surface.Spring);
      continue;
    }

    if (object.type === 'moving-platform') {
      markMovingPath(object, mark);
      continue;
    }

    // O caminho da plataforma de esqueleto depende das paredes: só dá para marcar depois de todas elas.
    if (object.type === 'skeleton-platform') {
      continue;
    }

    switch (OBJECT_BEHAVIOR[object.type].surface) {
      case 'solid':
        mark(object.x, object.y, Surface.Solid);
        break;
      case 'one-way':
        mark(object.x, object.y, Surface.OneWay);
        break;
      case 'hazard':
        mark(object.x, object.y, Surface.Hazard);
        break;
      case 'water':
        mark(object.x, object.y, Surface.Water);
        break;
      case 'none':
        break;
    }
  }

  blueprint.objects
    .filter((object) => object.type === 'skeleton-platform')
    .forEach((object) => markSkeletonPath(object, width, (x, y) => surfaces[y * width + x] === Surface.Solid, mark));

  return { width, height, surfaces };
}

/** Da posição dela até a primeira parede sólida à direita: é tudo chão por onde a criança pode passar. */
function markSkeletonPath(
  object: LevelObject,
  width: number,
  isWall: (x: number, y: number) => boolean,
  mark: (x: number, y: number, surface: Surface) => void,
): void {
  const wall = skeletonWallColumn(object, width, isWall);

  for (let x = object.x; x < wall; x += 1) {
    mark(x, object.y, Surface.OneWay);
  }
}

/**
 * A plataforma móvel vira chão de mão única em todo o caminho que percorre.
 *
 * Não é exato — ela não está em todos os pontos ao mesmo tempo — mas quem
 * espera por ela alcança qualquer ponto do trajeto, que é o que importa aqui.
 */
function markMovingPath(object: LevelObject, mark: (x: number, y: number, surface: Surface) => void): void {
  const range = object.properties?.range ?? 3;

  if (object.properties?.axis === 'vertical') {
    for (let offset = 0; offset <= range; offset += 1) {
      mark(object.x, object.y - offset, Surface.OneWay);
      mark(object.x + 1, object.y - offset, Surface.OneWay);
    }

    return;
  }

  for (let offset = 0; offset <= range + 1; offset += 1) {
    mark(object.x + offset, object.y, Surface.OneWay);
  }
}

function surfaceAt(grid: Grid, x: number, y: number): Surface {
  if (x < 0 || x >= grid.width) {
    return Surface.Solid;
  }

  if (y < 0 || y >= grid.height) {
    return Surface.Empty;
  }

  return grid.surfaces[y * grid.width + x] as Surface;
}

/** A água conta como apoio: quem cai nela boia e pode nadar de volta para cima. */
function isSupport(surface: Surface): boolean {
  return surface === Surface.Solid || surface === Surface.OneWay || surface === Surface.Spring || surface === Surface.Water;
}

function isStandable(grid: Grid, x: number, y: number): boolean {
  const body = surfaceAt(grid, x, y);
  const head = surfaceAt(grid, x, y - 1);

  return (
    body !== Surface.Solid &&
    body !== Surface.Hazard &&
    head !== Surface.Solid &&
    (body === Surface.Water || isSupport(surfaceAt(grid, x, y + 1)))
  );
}

/** Percorre a fase a partir do início e marca toda célula que o corpo tocou. */
function explore(grid: Grid, blueprint: LevelBlueprint): Uint8Array {
  const touched = new Uint8Array(grid.width * grid.height);
  const visited = new Uint8Array(grid.width * grid.height);
  const queue: number[] = [];

  const enqueue = (x: number, y: number): void => {
    const index = y * grid.width + x;

    if (visited[index] === 0) {
      visited[index] = 1;
      queue.push(index);
    }
  };

  const start = blueprint.objects.find((object) => object.type === 'start');

  if (!start) {
    return touched;
  }

  if (isStandable(grid, start.x, start.y)) {
    enqueue(start.x, start.y);
    touch(grid, touched, start.x, start.y);
  } else {
    // Início no ar: o Pedro cai até o primeiro chão.
    for (const landing of simulate(grid, touched, cellCenterX(start.x), (start.y + 1) * TILE_SIZE, 0, 0)) {
      enqueue(landing.x, landing.y);
    }
  }

  const doors = blueprint.objects.filter((object) => object.type === 'door' || object.type === 'golden-door' || object.type === 'warp-pipe');

  while (queue.length > 0) {
    const index = queue.shift() as number;
    const x = index % grid.width;
    const y = Math.floor(index / grid.width);

    for (const landing of movesFrom(grid, touched, x, y)) {
      enqueue(landing.x, landing.y);
    }

    for (const destination of doorDestinations(doors, x, y)) {
      if (isStandable(grid, destination.x, destination.y)) {
        touch(grid, touched, destination.x, destination.y);
        enqueue(destination.x, destination.y);
      }
    }
  }

  return touched;
}

interface Cell {
  readonly x: number;
  readonly y: number;
}

function movesFrom(grid: Grid, touched: Uint8Array, x: number, y: number): Cell[] {
  const landings: Cell[] = [];
  const feetY = (y + 1) * TILE_SIZE;
  const centerX = cellCenterX(x);
  const speed = VALIDATION_PHYSICS.horizontalSpeed;
  const isOnSpring = surfaceAt(grid, x, y + 1) === Surface.Spring;
  const launch = isOnSpring ? VALIDATION_PHYSICS.springVelocity : VALIDATION_PHYSICS.jumpVelocity;
  const isSwimming = surfaceAt(grid, x, y) === Surface.Water || surfaceAt(grid, x, y + 1) === Surface.Water;
  // Com a cabeça debaixo d'água não há salto: só braçadas, uma célula por vez.
  const isUnderwater = surfaceAt(grid, x, y - 1) === Surface.Water;

  if (isSwimming) {
    for (const row of [y - 1, y + 1]) {
      if (isStandable(grid, x, row)) {
        touch(grid, touched, x, row);
        landings.push({ x, y: row });
      }
    }
  }

  for (const direction of [-1, 1]) {
    const neighbor = x + direction;

    if (isStandable(grid, neighbor, y)) {
      touch(grid, touched, neighbor, y);
      landings.push({ x: neighbor, y });
    } else if (!isUnderwater && isOpen(grid, neighbor, y)) {
      // Andar para fora da borda e cair, devagar ou correndo. A queda começa
      // com o corpo inteiro já na célula vizinha, fora do chão de origem.
      const edgeX = centerX + direction * (TILE_SIZE / 2 + VALIDATION_PHYSICS.halfBodyWidth + 1);

      for (const fraction of [0.35, 1]) {
        landings.push(...simulate(grid, touched, edgeX, feetY, direction * speed * fraction, 0));
      }
    }

    if (isUnderwater) {
      continue;
    }

    for (const fraction of [0.3, 0.6, 1]) {
      landings.push(...simulate(grid, touched, centerX, feetY, direction * speed * fraction, -launch));
    }
  }

  if (!isUnderwater) {
    landings.push(...simulate(grid, touched, centerX, feetY, 0, -launch));
  }

  return landings;
}

function isOpen(grid: Grid, x: number, y: number): boolean {
  const body = surfaceAt(grid, x, y);
  const head = surfaceAt(grid, x, y - 1);

  return body !== Surface.Solid && head !== Surface.Solid && body !== Surface.Hazard;
}

function doorDestinations(doors: readonly LevelObject[], x: number, y: number): Cell[] {
  const door = doors.find((candidate) => candidate.x === x && candidate.y === y);
  const pair = door?.properties?.pair;

  if (!door || !pair) {
    return [];
  }

  // Cano leva a cano e porta leva a porta, como no jogo.
  const isPipe = door.type === 'warp-pipe';

  return doors
    .filter((candidate) => candidate !== door && candidate.properties?.pair === pair && (candidate.type === 'warp-pipe') === isPipe)
    .map((candidate) => ({ x: candidate.x, y: candidate.y }));
}

/**
 * Um salto (ou queda) quadro a quadro, até pousar, cair da fase ou tocar lava.
 *
 * Devolve a célula de pouso quando ela é um chão de verdade; no caminho, marca
 * em `touched` cada célula que o corpo atravessou — é assim que se descobre
 * se uma moeda no alto de um arco é alcançável.
 */
function simulate(
  grid: Grid,
  touched: Uint8Array,
  startX: number,
  startFeetY: number,
  velocityX: number,
  initialVelocityY: number,
): Cell[] {
  const step = VALIDATION_PHYSICS.stepSeconds;
  const bottom = grid.height * TILE_SIZE + TILE_SIZE;
  let x = startX;
  let feetY = startFeetY;
  let velocityY = initialVelocityY;
  let horizontal = velocityX;

  for (let frame = 0; frame < VALIDATION_PHYSICS.maxSteps; frame += 1) {
    velocityY = Math.min(PLAYER_PHYSICS.maxFallSpeed, velocityY + GRAVITY * step);

    const nextX = x + horizontal * step;

    if (overlapsSurface(grid, nextX, feetY, Surface.Solid)) {
      horizontal = 0;
    } else {
      x = nextX;
    }

    const nextFeetY = feetY + velocityY * step;

    if (velocityY < 0) {
      if (overlapsSurface(grid, x, nextFeetY, Surface.Solid)) {
        velocityY = 0;
      } else {
        feetY = nextFeetY;
      }
    } else {
      const landing = findLanding(grid, x, feetY, nextFeetY);

      if (landing) {
        markBody(grid, touched, x, landing.y * TILE_SIZE + TILE_SIZE);

        return isStandable(grid, landing.x, landing.y) ? [landing] : [];
      }

      feetY = nextFeetY;
    }

    if (overlapsSurface(grid, x, feetY, Surface.Hazard) || feetY > bottom) {
      return [];
    }

    markBody(grid, touched, x, feetY);
  }

  return [];
}

/** Chão cruzado pelos pés entre um quadro e o seguinte, se houver. */
function findLanding(grid: Grid, x: number, feetY: number, nextFeetY: number): Cell | null {
  const row = Math.floor(nextFeetY / TILE_SIZE);

  if (row * TILE_SIZE < feetY - 0.5) {
    return null;
  }

  const [left, right] = bodyColumns(x);
  const center = Math.floor(x / TILE_SIZE);
  const candidates = center === left ? [left, right] : [right, left];

  for (const column of candidates) {
    if (isSupport(surfaceAt(grid, column, row))) {
      return { x: column, y: row - 1 };
    }
  }

  return null;
}

function overlapsSurface(grid: Grid, x: number, feetY: number, surface: Surface): boolean {
  const [left, right] = bodyColumns(x);
  const top = Math.floor((feetY - VALIDATION_PHYSICS.bodyHeight) / TILE_SIZE);
  const bottom = Math.floor((feetY - 0.5) / TILE_SIZE);

  for (let column = left; column <= right; column += 1) {
    for (let row = top; row <= bottom; row += 1) {
      if (surfaceAt(grid, column, row) === surface) {
        return true;
      }
    }
  }

  return false;
}

function markBody(grid: Grid, touched: Uint8Array, x: number, feetY: number): void {
  const [left, right] = bodyColumns(x);
  const top = Math.floor((feetY - VALIDATION_PHYSICS.bodyHeight) / TILE_SIZE);
  const bottom = Math.floor((feetY - 0.5) / TILE_SIZE);

  for (let column = left; column <= right; column += 1) {
    for (let row = top; row <= bottom; row += 1) {
      touch(grid, touched, column, row);
    }
  }
}

function touch(grid: Grid, touched: Uint8Array, x: number, y: number): void {
  if (x >= 0 && y >= 0 && x < grid.width && y < grid.height) {
    touched[y * grid.width + x] = 1;

    // A cabeça ocupa a célula de cima enquanto o Pedro está de pé.
    if (y > 0) {
      touched[(y - 1) * grid.width + x] = 1;
    }
  }
}

function bodyColumns(x: number): readonly [number, number] {
  const halfWidth = VALIDATION_PHYSICS.halfBodyWidth;

  return [Math.floor((x - halfWidth) / TILE_SIZE), Math.floor((x + halfWidth - 0.5) / TILE_SIZE)];
}

function cellCenterX(x: number): number {
  return x * TILE_SIZE + TILE_SIZE / 2;
}
