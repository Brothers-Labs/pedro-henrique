import type { GridPoint } from '../models/level.model';
import { isSolidTerrain, type TerrainKind } from '../levels/level-layout';

/**
 * Corpo que anda pelo cenário: o Pedro, as pedrinhas e os corredores.
 *
 * É mutável de propósito: a simulação mexe nele sessenta vezes por segundo e
 * criar um objeto novo a cada passo só daria trabalho ao coletor de lixo. Ele
 * nunca sai da simulação; a tela recebe só cópias.
 */
export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly width: number;
  readonly height: number;
}

export interface MoveResult {
  /** O piso em que o corpo pousou neste passo, ou `null` se ele continua no ar. */
  readonly landedOn: TerrainKind | null;
  readonly hitWall: boolean;
  readonly bumpedHead: boolean;
}

export type TerrainLookup = (column: number, row: number) => TerrainKind;

/** Folga para a borda de um bloco não contar como dentro do bloco ao lado. */
const EDGE = 1e-6;

/**
 * Move o corpo um passo, um eixo de cada vez, sem atravessar blocos sólidos.
 *
 * Um eixo por vez é o que faz o Pedro deslizar pela parede em vez de grudar
 * nela. A velocidade máxima anda menos de um bloco por passo, então nenhum
 * bloco é pulado entre um passo e outro.
 */
export function moveBody(body: Body, terrainAt: TerrainLookup, seconds: number): MoveResult {
  const hitWall = moveHorizontally(body, terrainAt, seconds);

  body.y += body.vy * seconds;

  if (body.vy > 0) {
    const row = Math.floor(body.y + body.height - EDGE);
    const floor = solidAcross(body, row, terrainAt);

    if (floor) {
      body.y = row - body.height;
      body.vy = 0;

      return { landedOn: floor, hitWall, bumpedHead: false };
    }
  } else if (body.vy < 0) {
    const row = Math.floor(body.y);

    if (solidAcross(body, row, terrainAt)) {
      body.y = row + 1;
      body.vy = 0;

      return { landedOn: null, hitWall, bumpedHead: true };
    }
  }

  return { landedOn: null, hitWall, bumpedHead: false };
}

export function overlaps(first: Body, second: Body): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

/** Se o corpo encosta no bloco da grade, com uma margem para o toque não precisar ser exato. */
export function touchesTile(body: Body, point: GridPoint, margin = 0): boolean {
  return (
    body.x < point.column + 1 - margin &&
    body.x + body.width > point.column + margin &&
    body.y < point.row + 1 - margin &&
    body.y + body.height > point.row + margin
  );
}

function moveHorizontally(body: Body, terrainAt: TerrainLookup, seconds: number): boolean {
  body.x += body.vx * seconds;

  if (body.vx === 0) {
    return false;
  }

  const column = body.vx > 0 ? Math.floor(body.x + body.width - EDGE) : Math.floor(body.x);
  const firstRow = Math.floor(body.y);
  const lastRow = Math.floor(body.y + body.height - EDGE);

  for (let row = firstRow; row <= lastRow; row += 1) {
    if (isSolidTerrain(terrainAt(column, row))) {
      body.x = body.vx > 0 ? column - body.width : column + 1;
      body.vx = 0;

      return true;
    }
  }

  return false;
}

/**
 * O bloco sólido embaixo (ou em cima) do corpo naquela fileira.
 *
 * Quando o corpo pisa ao mesmo tempo num pula-pula e no chão, o pula-pula
 * vence: a criança vê que pisou nele e espera o pulo.
 */
function solidAcross(body: Body, row: number, terrainAt: TerrainLookup): TerrainKind | null {
  let found: TerrainKind | null = null;
  const firstColumn = Math.floor(body.x);
  const lastColumn = Math.floor(body.x + body.width - EDGE);

  for (let column = firstColumn; column <= lastColumn; column += 1) {
    const kind = terrainAt(column, row);

    if (kind === 'trampoline') {
      return kind;
    }

    if (isSolidTerrain(kind)) {
      found = kind;
    }
  }

  return found;
}
