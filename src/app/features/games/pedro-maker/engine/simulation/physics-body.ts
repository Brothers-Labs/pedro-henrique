import { GRAVITY, TILE_SIZE } from '../../config/physics.config';
import { cellOf, COLLISION, type TileGrid } from './tile-grid';

/** Folga para as contas de borda: um corpo encostado não conta como dentro. */
const EPSILON = 0.01;

/** Plataforma que se move, vista pela física: só a face de cima segura. */
export interface PlatformSurface {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** Quanto ela andou neste passo; quem está em cima anda junto. */
  readonly deltaX: number;
  readonly deltaY: number;
}

/** Retângulo do mundo, em pixels (y para baixo). */
export interface WorldArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Caixa de colisão com velocidade, em pixels do mundo (y para baixo).
 *
 * Mutável de propósito: a física atualiza centenas de corpos 60 vezes por
 * segundo, e criar um objeto novo por passo só alimentaria o coletor de lixo.
 */
export interface PhysicsBody {
  /** Canto superior esquerdo. */
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  /** Posição no começo do passo, para a tela desenhar entre um passo e outro. */
  previousX: number;
  previousY: number;
  hasGravity: boolean;
  /** Fração da gravidade que age no corpo: menos de 1 dentro da água. */
  gravityScale: number;
  maxFallSpeed: number;
  blockedLeft: boolean;
  blockedRight: boolean;
  blockedUp: boolean;
  blockedDown: boolean;
  /** Velocidade vertical antes da colisão deste passo: é ela que decide o pisão. */
  impactVelocityY: number;
  riding: PlatformSurface | null;
  /** Coluna do bloco atingido pela cabeça neste passo, ou -1. */
  headHitColumn: number;
  headHitRow: number;
  /** Linha e colunas da grade onde o corpo pousou neste passo; linha -1 se não pousou na grade. */
  landedRow: number;
  landedFromColumn: number;
  landedToColumn: number;
}

export interface PhysicsWorld {
  readonly grid: TileGrid;
  readonly platforms: readonly PlatformSurface[];
}

export function createBody(width: number, height: number, hasGravity: boolean, maxFallSpeed = Number.POSITIVE_INFINITY): PhysicsBody {
  return {
    x: 0,
    y: 0,
    width,
    height,
    vx: 0,
    vy: 0,
    previousX: 0,
    previousY: 0,
    hasGravity,
    gravityScale: 1,
    maxFallSpeed,
    blockedLeft: false,
    blockedRight: false,
    blockedUp: false,
    blockedDown: false,
    impactVelocityY: 0,
    riding: null,
    headHitColumn: -1,
    headHitRow: -1,
    landedRow: -1,
    landedFromColumn: 0,
    landedToColumn: -1,
  };
}

/** Põe os pés do corpo exatamente sobre um ponto, parado. */
export function placeFeet(body: PhysicsBody, feetX: number, feetY: number): void {
  body.x = feetX - body.width / 2;
  body.y = feetY - body.height;
  body.previousX = body.x;
  body.previousY = body.y;
  body.vx = 0;
  body.vy = 0;
  body.riding = null;
}

export function centerX(body: PhysicsBody): number {
  return body.x + body.width / 2;
}

export function centerY(body: PhysicsBody): number {
  return body.y + body.height / 2;
}

export function bottom(body: PhysicsBody): number {
  return body.y + body.height;
}

export function overlaps(first: WorldArea, second: WorldArea): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

/** Nenhuma célula sólida dentro da área: um corpo desse tamanho caberia ali sem ficar preso. */
export function isAreaClear(grid: TileGrid, area: WorldArea): boolean {
  const firstColumn = cellOf(area.x + EPSILON);
  const lastColumn = cellOf(area.x + area.width - EPSILON);
  const firstRow = cellOf(area.y + EPSILON);
  const lastRow = cellOf(area.y + area.height - EPSILON);

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      if (grid.isSolidCell(column, row)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Um passo de física: gravidade, carona na plataforma, movimento e colisão.
 *
 * O movimento é resolvido um eixo de cada vez — primeiro o lado, depois a
 * altura —, o jeito clássico dos jogos de plataforma. Como nenhum corpo anda
 * mais que um bloco por passo, basta olhar a próxima coluna ou linha.
 */
export function stepBody(body: PhysicsBody, world: PhysicsWorld, seconds: number, keepInsideWorld: boolean): void {
  body.previousX = body.x;
  body.previousY = body.y;
  body.blockedLeft = false;
  body.blockedRight = false;
  body.blockedUp = false;
  body.blockedDown = false;
  body.headHitColumn = -1;
  body.landedRow = -1;

  const platform = body.riding;
  body.riding = null;

  if (platform && overlapsHorizontally(body, platform.x, platform.width)) {
    moveHorizontally(body, world.grid, platform.deltaX);
    body.y = platform.y - body.height;
  }

  if (body.hasGravity) {
    body.vy = Math.min(body.vy + GRAVITY * body.gravityScale * seconds, body.maxFallSpeed);
  }

  moveHorizontally(body, world.grid, body.vx * seconds);

  if (keepInsideWorld) {
    keepInside(body, world.grid.widthPx);
  }

  body.impactVelocityY = body.vy;
  moveVertically(body, world, body.vy * seconds);
}

function moveHorizontally(body: PhysicsBody, grid: TileGrid, distance: number): void {
  if (distance > 0) {
    const right = body.x + body.width;
    const column = cellOf(right + distance - EPSILON);

    if (column !== cellOf(right - EPSILON) && isColumnBlocked(body, grid, column)) {
      body.x = column * TILE_SIZE - body.width;
      body.vx = Math.min(0, body.vx);
      body.blockedRight = true;
      return;
    }
  } else if (distance < 0) {
    const column = cellOf(body.x + distance);

    if (column !== cellOf(body.x) && isColumnBlocked(body, grid, column)) {
      body.x = (column + 1) * TILE_SIZE;
      body.vx = Math.max(0, body.vx);
      body.blockedLeft = true;
      return;
    }
  }

  body.x += distance;
}

function moveVertically(body: PhysicsBody, world: PhysicsWorld, distance: number): void {
  if (distance > 0) {
    fall(body, world, distance);
  } else if (distance < 0) {
    rise(body, world.grid, distance);
  }
}

function fall(body: PhysicsBody, world: PhysicsWorld, distance: number): void {
  const currentBottom = body.y + body.height;
  const targetBottom = currentBottom + distance;
  const row = cellOf(targetBottom - EPSILON);
  const firstColumn = cellOf(body.x + EPSILON);
  const lastColumn = cellOf(body.x + body.width - EPSILON);
  let landingTop = Number.POSITIVE_INFINITY;
  let landingPlatform: PlatformSurface | null = null;

  if (row !== cellOf(currentBottom - EPSILON)) {
    const rowTop = row * TILE_SIZE;

    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const collision = world.grid.collisionAt(column, row);
      const holds = collision === COLLISION.solid || (collision === COLLISION.oneWay && currentBottom <= rowTop + EPSILON);

      if (holds) {
        landingTop = rowTop;
        break;
      }
    }
  }

  for (const platform of world.platforms) {
    const previousTop = platform.y - platform.deltaY;
    const wasAbove = currentBottom <= Math.max(platform.y, previousTop) + 1;

    if (wasAbove && targetBottom >= platform.y && platform.y < landingTop && overlapsHorizontally(body, platform.x, platform.width)) {
      landingTop = platform.y;
      landingPlatform = platform;
    }
  }

  if (!Number.isFinite(landingTop)) {
    body.y += distance;
    return;
  }

  body.y = landingTop - body.height;
  body.vy = 0;
  body.blockedDown = true;
  body.riding = landingPlatform;

  if (!landingPlatform) {
    body.landedRow = row;
    body.landedFromColumn = firstColumn;
    body.landedToColumn = lastColumn;
  }
}

function rise(body: PhysicsBody, grid: TileGrid, distance: number): void {
  const row = cellOf(body.y + distance);

  if (row === cellOf(body.y)) {
    body.y += distance;
    return;
  }

  const firstColumn = cellOf(body.x + EPSILON);
  const lastColumn = cellOf(body.x + body.width - EPSILON);
  const middleColumn = cellOf(body.x + body.width / 2);
  let hitColumn = -1;

  for (let column = firstColumn; column <= lastColumn; column += 1) {
    // A cabeçada vale para o bloco bem em cima do Pedro; o do lado só se não houver outro.
    if (grid.isSolidCell(column, row) && (hitColumn === -1 || column === middleColumn)) {
      hitColumn = column;
    }
  }

  if (hitColumn === -1) {
    body.y += distance;
    return;
  }

  body.y = (row + 1) * TILE_SIZE;
  body.vy = 0;
  body.blockedUp = true;
  body.headHitColumn = hitColumn;
  body.headHitRow = row;
}

function isColumnBlocked(body: PhysicsBody, grid: TileGrid, column: number): boolean {
  const firstRow = cellOf(body.y + EPSILON);
  const lastRow = cellOf(body.y + body.height - EPSILON);

  for (let row = firstRow; row <= lastRow; row += 1) {
    if (grid.isSolidCell(column, row)) {
      return true;
    }
  }

  return false;
}

function keepInside(body: PhysicsBody, worldWidth: number): void {
  if (body.x < 0) {
    body.x = 0;
    body.vx = Math.max(0, body.vx);
    body.blockedLeft = true;
  } else if (body.x + body.width > worldWidth) {
    body.x = worldWidth - body.width;
    body.vx = Math.min(0, body.vx);
    body.blockedRight = true;
  }
}

function overlapsHorizontally(body: PhysicsBody, left: number, width: number): boolean {
  return body.x < left + width && body.x + body.width > left;
}
