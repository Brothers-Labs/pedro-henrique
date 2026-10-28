import type { PhysicsTerrain } from '../block-properties';

/** Folga mínima entre a caixa e a parede: evita que o arredondamento cole o corpo nela. */
const SKIN = 1e-4;

type Axis = 0 | 1 | 2;

export interface MoveResult {
  readonly blockedX: boolean;
  readonly blockedZ: boolean;
  /** Estava caindo e tocou o chão neste movimento. */
  readonly landed: boolean;
  readonly hitCeiling: boolean;
}

/**
 * Caixa que anda pelo mundo de blocos sem atravessar nada.
 *
 * Serve ao herói e às criaturas. A posição é o centro dos pés. O movimento é
 * feito um eixo de cada vez (y, depois x, depois z): é o jeito clássico dos
 * jogos de cubos, que desliza na parede em vez de grudar nela.
 */
export class PhysicsBody {
  x: number;
  y: number;
  z: number;
  velocityX = 0;
  velocityY = 0;
  velocityZ = 0;
  isOnGround = false;
  isInWater = false;

  constructor(
    x: number,
    y: number,
    z: number,
    readonly halfWidth: number,
    readonly height: number,
  ) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  teleport(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityZ = 0;
  }

  /** O corpo invade a caixa? Um bloco novo ou uma árvore que cresce ali o prenderiam. */
  occupies(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): boolean {
    return (
      this.x + this.halfWidth > minX &&
      this.x - this.halfWidth < maxX &&
      this.z + this.halfWidth > minZ &&
      this.z - this.halfWidth < maxZ &&
      this.y + this.height > minY &&
      this.y < maxY
    );
  }

  /** Anda o quanto der em cada eixo e conta o que bateu. */
  move(terrain: PhysicsTerrain, deltaX: number, deltaY: number, deltaZ: number): MoveResult {
    const movedY = this.sweep(terrain, 1, deltaY);
    this.y += movedY;

    const movedX = this.sweep(terrain, 0, deltaX);
    this.x += movedX;

    const movedZ = this.sweep(terrain, 2, deltaZ);
    this.z += movedZ;

    const landed = deltaY < 0 && movedY > deltaY + SKIN;
    const hitCeiling = deltaY > 0 && movedY < deltaY - SKIN;

    if (landed || hitCeiling) {
      this.velocityY = 0;
    }

    this.isOnGround = landed || (deltaY === 0 && this.isOnGround);

    return {
      blockedX: Math.abs(movedX - deltaX) > SKIN,
      blockedZ: Math.abs(movedZ - deltaZ) > SKIN,
      landed,
      hitCeiling,
    };
  }

  /** A caixa, deslocada, encostaria em algo sólido? */
  collidesAt(terrain: PhysicsTerrain, offsetX: number, offsetY: number, offsetZ: number): boolean {
    const min = [this.x - this.halfWidth + offsetX, this.y + offsetY, this.z - this.halfWidth + offsetZ];
    const max = [this.x + this.halfWidth + offsetX, this.y + this.height + offsetY, this.z + this.halfWidth + offsetZ];
    let found = false;

    forEachCell(min, max, (cellX, cellY, cellZ) => {
      const top = terrain.collisionHeight(cellX, cellY, cellZ);

      if (top > 0 && overlaps(min, max, [cellX, cellY, cellZ], [cellX + 1, cellY + top, cellZ + 1])) {
        found = true;
      }
    });

    return found;
  }

  /** Há líquido na altura da cintura? */
  touchesLiquid(terrain: PhysicsTerrain): boolean {
    return terrain.isLiquid(Math.floor(this.x), Math.floor(this.y + this.height * 0.4), Math.floor(this.z));
  }

  /**
   * Quanto dá para andar num eixo sem entrar em bloco sólido.
   *
   * Só conta blocos que a caixa já cruza nos outros dois eixos e que estão à
   * frente no sentido do movimento: um bloco onde a caixa já está presa (o
   * herói nasceu dentro dele) não segura ninguém, e ele consegue sair.
   */
  private sweep(terrain: PhysicsTerrain, axis: Axis, delta: number): number {
    if (delta === 0) {
      return 0;
    }

    const min = [this.x - this.halfWidth, this.y, this.z - this.halfWidth];
    const max = [this.x + this.halfWidth, this.y + this.height, this.z + this.halfWidth];
    const reachMin = [...min];
    const reachMax = [...max];
    let allowed = delta;

    reachMin[axis] = Math.min(min[axis], min[axis] + delta);
    reachMax[axis] = Math.max(max[axis], max[axis] + delta);

    forEachCell(reachMin, reachMax, (cellX, cellY, cellZ) => {
      const top = terrain.collisionHeight(cellX, cellY, cellZ);

      if (top <= 0) {
        return;
      }

      const cellMin = [cellX, cellY, cellZ];
      const cellMax = [cellX + 1, cellY + top, cellZ + 1];

      if (!overlapsOnOtherAxes(min, max, cellMin, cellMax, axis)) {
        return;
      }

      if (delta > 0 && cellMin[axis] >= max[axis] - SKIN) {
        allowed = Math.min(allowed, cellMin[axis] - max[axis] - SKIN);
      } else if (delta < 0 && cellMax[axis] <= min[axis] + SKIN) {
        allowed = Math.max(allowed, cellMax[axis] - min[axis] + SKIN);
      }
    });

    return delta > 0 ? Math.max(0, allowed) : Math.min(0, allowed);
  }
}

/** Percorre as células tocadas pela caixa; olha uma célula abaixo para pegar a cerca, que passa de 1 bloco. */
function forEachCell(
  min: readonly number[],
  max: readonly number[],
  visit: (x: number, y: number, z: number) => void,
): void {
  for (let y = Math.floor(min[1]) - 1; y <= Math.floor(max[1] - SKIN); y += 1) {
    for (let z = Math.floor(min[2]); z <= Math.floor(max[2] - SKIN); z += 1) {
      for (let x = Math.floor(min[0]); x <= Math.floor(max[0] - SKIN); x += 1) {
        visit(x, y, z);
      }
    }
  }
}

function overlaps(min: readonly number[], max: readonly number[], otherMin: readonly number[], otherMax: readonly number[]): boolean {
  return [0, 1, 2].every((axis) => min[axis] < otherMax[axis] - SKIN && max[axis] > otherMin[axis] + SKIN);
}

function overlapsOnOtherAxes(
  min: readonly number[],
  max: readonly number[],
  otherMin: readonly number[],
  otherMax: readonly number[],
  axis: Axis,
): boolean {
  return ([0, 1, 2] as const).every(
    (other) => other === axis || (min[other] < otherMax[other] - SKIN && max[other] > otherMin[other] + SKIN),
  );
}
