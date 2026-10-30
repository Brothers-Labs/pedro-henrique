import { OBJECT_BEHAVIOR } from '../../config/object-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import type { LevelBlueprint, LevelObjectType, TerrainType } from '../../models/level.model';

/** Como uma célula reage a quem encosta nela. */
export const COLLISION = {
  empty: 0,
  solid: 1,
  /** Segura quem cai de cima e deixa passar por baixo e pelos lados. */
  oneWay: 2,
} as const;

export type Collision = (typeof COLLISION)[keyof typeof COLLISION];

/** Blocos fixos desenhados como parte do terreno. */
export type TerrainMaterial = TerrainType | 'platform' | 'cloud';

const TERRAIN_MATERIAL_LIST: readonly TerrainMaterial[] = ['ground', 'stone', 'ice', 'sand', 'wood', 'pipe', 'platform', 'cloud'];

const TERRAIN_MATERIALS: ReadonlySet<LevelObjectType> = new Set<LevelObjectType>(TERRAIN_MATERIAL_LIST);

export function isTerrainMaterial(type: LevelObjectType): type is TerrainMaterial {
  return TERRAIN_MATERIALS.has(type);
}

/**
 * A fase como uma grade de colisão.
 *
 * Uma consulta por célula é muito mais barata que comparar o Pedro com
 * centenas de caixas, e não deixa emenda onde ele possa enroscar entre dois
 * blocos vizinhos. Blocos que mudam (tijolo que quebra, plataforma que some)
 * escrevem aqui a própria colisão; o terreno fixo guarda também o material,
 * que é o que o desenho em 3D precisa.
 */
export class TileGrid {
  private readonly collision: Uint8Array;
  private readonly materials: (TerrainMaterial | null)[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.collision = new Uint8Array(width * height);
    this.materials = Array.from({ length: width * height }, () => null);
  }

  static fromBlueprint(blueprint: LevelBlueprint): TileGrid {
    const grid = new TileGrid(blueprint.width, blueprint.height);

    for (const object of blueprint.objects) {
      if (object.type === 'cannon') grid.setCollision(object.x, object.y, COLLISION.solid);
      if (isTerrainMaterial(object.type) && grid.contains(object.x, object.y)) {
        const index = grid.index(object.x, object.y);

        grid.materials[index] = object.type;
        grid.collision[index] = OBJECT_BEHAVIOR[object.type].surface === 'solid' ? COLLISION.solid : COLLISION.oneWay;
      }
    }

    return grid;
  }

  get widthPx(): number {
    return this.width * TILE_SIZE;
  }

  get heightPx(): number {
    return this.height * TILE_SIZE;
  }

  contains(cellX: number, cellY: number): boolean {
    return cellX >= 0 && cellY >= 0 && cellX < this.width && cellY < this.height;
  }

  /** Fora da fase não há nada: cair num buraco é cair de verdade. */
  collisionAt(cellX: number, cellY: number): Collision {
    return this.contains(cellX, cellY) ? (this.collision[this.index(cellX, cellY)] as Collision) : COLLISION.empty;
  }

  setCollision(cellX: number, cellY: number, value: Collision): void {
    if (this.contains(cellX, cellY)) {
      this.collision[this.index(cellX, cellY)] = value;
    }
  }

  materialAt(cellX: number, cellY: number): TerrainMaterial | null {
    return this.contains(cellX, cellY) ? (this.materials[this.index(cellX, cellY)] ?? null) : null;
  }

  isSolidCell(cellX: number, cellY: number): boolean {
    return this.collisionAt(cellX, cellY) === COLLISION.solid;
  }

  /** Há algo em que pisar neste ponto? Usado pelos inimigos para não cair da beirada. */
  isGroundAtPoint(worldX: number, worldY: number): boolean {
    return this.collisionAt(cellOf(worldX), cellOf(worldY)) !== COLLISION.empty;
  }

  isIceAtPoint(worldX: number, worldY: number): boolean {
    return this.materialAt(cellOf(worldX), cellOf(worldY)) === 'ice';
  }

  private index(cellX: number, cellY: number): number {
    return cellY * this.width + cellX;
  }
}

export function cellOf(worldCoordinate: number): number {
  return Math.floor(worldCoordinate / TILE_SIZE);
}
