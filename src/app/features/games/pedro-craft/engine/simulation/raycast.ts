/** Bloco atingido pelo olhar e a face por onde o raio entrou. */
export interface RayHit {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Normal da face atingida: somada à célula, dá onde um bloco novo seria colocado. */
  readonly normalX: number;
  readonly normalY: number;
  readonly normalZ: number;
  readonly distance: number;
}

export interface RayOrigin {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RayDirection {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Primeira célula que o raio acerta, até `reach` blocos.
 *
 * Percorre a grade célula a célula (DDA de Amanatides e Woo): nenhum bloco é
 * pulado, nem quando o olhar passa raspando numa quina. `isTarget` decide o
 * que conta — a água não conta para quebrar, mas conta para o balde.
 */
export function castRay(
  origin: RayOrigin,
  direction: RayDirection,
  reach: number,
  isTarget: (x: number, y: number, z: number) => boolean,
): RayHit | null {
  let cellX = Math.floor(origin.x);
  let cellY = Math.floor(origin.y);
  let cellZ = Math.floor(origin.z);
  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);
  const deltaX = stepX === 0 ? Infinity : Math.abs(1 / direction.x);
  const deltaY = stepY === 0 ? Infinity : Math.abs(1 / direction.y);
  const deltaZ = stepZ === 0 ? Infinity : Math.abs(1 / direction.z);
  let nextX = stepX === 0 ? Infinity : (stepX > 0 ? cellX + 1 - origin.x : origin.x - cellX) * deltaX;
  let nextY = stepY === 0 ? Infinity : (stepY > 0 ? cellY + 1 - origin.y : origin.y - cellY) * deltaY;
  let nextZ = stepZ === 0 ? Infinity : (stepZ > 0 ? cellZ + 1 - origin.z : origin.z - cellZ) * deltaZ;
  let normalX = 0;
  let normalY = 0;
  let normalZ = 0;
  let distance = 0;

  while (distance <= reach) {
    if (isTarget(cellX, cellY, cellZ)) {
      return { x: cellX, y: cellY, z: cellZ, normalX, normalY, normalZ, distance };
    }

    if (nextX <= nextY && nextX <= nextZ) {
      cellX += stepX;
      distance = nextX;
      nextX += deltaX;
      [normalX, normalY, normalZ] = [-stepX, 0, 0];
    } else if (nextY <= nextZ) {
      cellY += stepY;
      distance = nextY;
      nextY += deltaY;
      [normalX, normalY, normalZ] = [0, -stepY, 0];
    } else {
      cellZ += stepZ;
      distance = nextZ;
      nextZ += deltaZ;
      [normalX, normalY, normalZ] = [0, 0, -stepZ];
    }
  }

  return null;
}
