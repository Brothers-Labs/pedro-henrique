import { AIR } from '../../content/craft-catalog';
import type { VoxelWorld } from '../../world/voxel-world';
import { type BlockProperties, SHAPE_CODE } from '../block-properties';

/**
 * Malha de um chunk do mundo, no jeito dos jogos de cubos.
 *
 * Função pura: recebe o mundo e devolve vetores prontos para a placa de
 * vídeo, sem tocar no three.js — é o que deixa a malha ser testada sem
 * navegador de verdade.
 *
 * Só viram triângulos as faces que dão para algo que não esconde nada. Cada
 * vértice carrega três coisas além da posição: o canto da textura, a sombra
 * (direção da face × cantos fechados) e a luz das tochas por perto.
 */

export type FaceKind = 'top' | 'side' | 'bottom';

export interface TileUv {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
}

/** Onde fica a face de cada bloco no atlas; `stage` é o estágio da plantação. */
export interface TileSource {
  tile(block: number, face: FaceKind, stage: number): TileUv;
}

/** Bloco que emite luz, com o raio até onde ela chega. */
export interface LightSource {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
}

export interface ChunkMeshData {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  /** Sombra (direção da face × cantos fechados), repetida nos três canais. */
  readonly colors: Float32Array;
  /** Luz de tocha de 0 a 1, um valor por vértice. */
  readonly lights: Float32Array;
  readonly indices: Uint32Array;
}

/** Os três passes de desenho: opaco, recortado (folhas, plantas) e água. */
export interface ChunkMeshes {
  readonly opaque: ChunkMeshData;
  readonly cutout: ChunkMeshData;
  readonly water: ChunkMeshData;
}

export interface ChunkMesherContext {
  readonly world: VoxelWorld;
  readonly properties: BlockProperties;
  readonly tiles: TileSource;
  readonly chunkSize: number;
  readonly lights: readonly LightSource[];
  /** Estágio da plantação na célula; 0 para o que não é plantação. */
  stageAt(x: number, y: number, z: number): number;
}

type Vector = readonly [number, number, number];

interface FaceSpec {
  readonly normal: Vector;
  readonly u: Vector;
  readonly v: Vector;
  readonly kind: FaceKind;
  /** Brilho fixo da face: o sol vem de cima, então o topo é o mais claro. */
  readonly shade: number;
}

const FACES: readonly FaceSpec[] = [
  { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], kind: 'top', shade: 1 },
  { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], kind: 'bottom', shade: 0.5 },
  { normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], kind: 'side', shade: 0.8 },
  { normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], kind: 'side', shade: 0.8 },
  { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], kind: 'side', shade: 0.68 },
  { normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], kind: 'side', shade: 0.68 },
];

const CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/** Brilho do canto pelo número de blocos que o escondem (0 a 3). */
const OCCLUSION_LIGHT = [1, 0.8, 0.64, 0.5] as const;

/** Altura da água parada sem água em cima: um pouco abaixo da borda, como num copo. */
const WATER_SURFACE = 0.875;

const TORCH_BOX = { min: [7 / 16, 0, 7 / 16], max: [9 / 16, 13 / 16, 9 / 16] } as const;
const SLAB_HEIGHT = 9 / 16;
const FENCE_POST = { min: [6 / 16, 0, 6 / 16], max: [10 / 16, 1, 10 / 16] } as const;
const FENCE_RAILS = [
  [6 / 16, 9 / 16],
  [12 / 16, 15 / 16],
] as const;

const CROSS_INSET = 0.15;

interface Box {
  readonly min: Vector;
  readonly max: Vector;
}

export function meshChunk(context: ChunkMesherContext, chunkX: number, chunkZ: number): ChunkMeshes {
  const writers = { opaque: new MeshWriter(), cutout: new MeshWriter(), water: new MeshWriter() };
  const { world, properties, chunkSize } = context;
  const startX = chunkX * chunkSize;
  const startZ = chunkZ * chunkSize;
  const mesher = new CellMesher(context);

  for (let y = 0; y < world.height; y += 1) {
    for (let z = startZ; z < startZ + chunkSize; z += 1) {
      for (let x = startX; x < startX + chunkSize; x += 1) {
        const block = world.get(x, y, z);

        if (block === AIR) {
          continue;
        }

        const shape = properties.shape[block];
        const writer = shape === SHAPE_CODE.liquid ? writers.water : properties.isOpaqueCube[block] ? writers.opaque : writers.cutout;

        mesher.emit(writer, block, shape, x, y, z);
      }
    }
  }

  return { opaque: writers.opaque.build(), cutout: writers.cutout.build(), water: writers.water.build() };
}

/** Desenha uma célula conforme a forma do bloco. */
class CellMesher {
  constructor(private readonly context: ChunkMesherContext) {}

  emit(writer: MeshWriter, block: number, shape: number, x: number, y: number, z: number): void {
    switch (shape) {
      case SHAPE_CODE.cube:
        this.cube(writer, block, x, y, z);
        return;
      case SHAPE_CODE.liquid:
        this.liquid(writer, block, x, y, z);
        return;
      case SHAPE_CODE.cross:
        this.cross(writer, block, x, y, z);
        return;
      case SHAPE_CODE.torch:
        this.box(writer, block, x, y, z, { min: TORCH_BOX.min, max: TORCH_BOX.max }, () => true, 1);
        return;
      case SHAPE_CODE.slab:
        this.box(writer, block, x, y, z, { min: [0, 0, 0], max: [1, SLAB_HEIGHT, 1] }, (face) => this.isExposed(face, x, y, z, true));
        return;
      case SHAPE_CODE.fence:
        this.fence(writer, block, x, y, z);
        return;
    }
  }

  private cube(writer: MeshWriter, block: number, x: number, y: number, z: number): void {
    const { world, properties } = this.context;
    const isOpaque = properties.isOpaqueCube[block] === 1;

    for (const face of FACES) {
      const neighborX = x + face.normal[0];
      const neighborY = y + face.normal[1];
      const neighborZ = z + face.normal[2];

      if (neighborY < 0) {
        continue;
      }

      const neighbor = world.get(neighborX, neighborY, neighborZ);
      const isHidden = properties.isOpaqueCube[neighbor] === 1 || (!isOpaque && neighbor === block);

      if (isHidden) {
        continue;
      }

      const tile = this.context.tiles.tile(block, face.kind, 0);
      const occupied = (cellX: number, cellY: number, cellZ: number): boolean =>
        properties.isOpaqueCube[world.get(cellX, cellY, cellZ)] === 1;

      this.cubeFace(writer, face, tile, x, y, z, occupied);
    }
  }

  /** Face inteira de cubo, com sombra nos cantos fechados. */
  private cubeFace(
    writer: MeshWriter,
    face: FaceSpec,
    tile: TileUv,
    x: number,
    y: number,
    z: number,
    occupied: (x: number, y: number, z: number) => boolean,
  ): void {
    const [n0, n1, n2] = face.normal;
    const outsideX = x + n0;
    const outsideY = y + n1;
    const outsideZ = z + n2;
    const corners: Vector[] = [];
    const shades: number[] = [];

    for (const [du, dv] of CORNERS) {
      const offsetX = face.u[0] * du + face.v[0] * dv;
      const offsetY = face.u[1] * du + face.v[1] * dv;
      const offsetZ = face.u[2] * du + face.v[2] * dv;
      const sideA = occupied(outsideX + face.u[0] * du, outsideY + face.u[1] * du, outsideZ + face.u[2] * du);
      const sideB = occupied(outsideX + face.v[0] * dv, outsideY + face.v[1] * dv, outsideZ + face.v[2] * dv);
      const corner = occupied(outsideX + offsetX, outsideY + offsetY, outsideZ + offsetZ);
      const occlusion = sideA && sideB ? 3 : Number(sideA) + Number(sideB) + Number(corner);

      corners.push([x + 0.5 + (n0 + offsetX) * 0.5, y + 0.5 + (n1 + offsetY) * 0.5, z + 0.5 + (n2 + offsetZ) * 0.5]);
      shades.push(face.shade * OCCLUSION_LIGHT[occlusion as 0 | 1 | 2 | 3]);
    }

    this.quad(writer, face, corners, shades, tile, [x, y, z], 0);
  }

  private liquid(writer: MeshWriter, block: number, x: number, y: number, z: number): void {
    const { world, properties } = this.context;
    const isCovered = properties.isLiquid[world.get(x, y + 1, z)] === 1;
    const height = isCovered ? 1 : WATER_SURFACE;

    this.box(writer, block, x, y, z, { min: [0, 0, 0], max: [1, height, 1] }, (face) => {
      const neighbor = world.get(x + face.normal[0], y + face.normal[1], z + face.normal[2]);

      if (face.kind === 'top') {
        return !isCovered && properties.isOpaqueCube[neighbor] === 0;
      }

      return y + face.normal[1] >= 0 && properties.isLiquid[neighbor] === 0 && properties.isOpaqueCube[neighbor] === 0;
    });
  }

  /** Planta: dois quadrados em X, vistos dos dois lados. */
  private cross(writer: MeshWriter, block: number, x: number, y: number, z: number): void {
    const tile = this.context.tiles.tile(block, 'side', this.context.stageAt(x, y, z));
    const low = CROSS_INSET;
    const high = 1 - CROSS_INSET;
    const diagonals: readonly (readonly [number, number, number, number])[] = [
      [low, low, high, high],
      [high, low, low, high],
    ];

    for (const [fromX, fromZ, toX, toZ] of diagonals) {
      const corners: Vector[] = [
        [x + fromX, y, z + fromZ],
        [x + toX, y, z + toZ],
        [x + toX, y + 1, z + toZ],
        [x + fromX, y + 1, z + fromZ],
      ];

      writer.quad(corners, [tile.u0, tile.v0, tile.u1, tile.v0, tile.u1, tile.v1, tile.u0, tile.v1], [0.95, 0.95, 0.95, 0.95], corners.map((corner) => this.lightAt(corner)));
    }
  }

  /** Mourão no meio e travessas até os vizinhos que são cerca ou parede. */
  private fence(writer: MeshWriter, block: number, x: number, y: number, z: number): void {
    const { world, properties } = this.context;
    const connects = (dx: number, dz: number): boolean => {
      const neighbor = world.get(x + dx, y, z + dz);

      return neighbor === block || properties.isOpaqueCube[neighbor] === 1;
    };

    this.box(writer, block, x, y, z, FENCE_POST, () => true);

    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (!connects(dx, dz)) {
        continue;
      }

      for (const [bottom, top] of FENCE_RAILS) {
        const min: Vector = [dx > 0 ? 10 / 16 : dx < 0 ? 0 : 7 / 16, bottom, dz > 0 ? 10 / 16 : dz < 0 ? 0 : 7 / 16];
        const max: Vector = [dx > 0 ? 1 : dx < 0 ? 6 / 16 : 9 / 16, top, dz > 0 ? 1 : dz < 0 ? 6 / 16 : 9 / 16];

        this.box(writer, block, x, y, z, { min, max }, () => true);
      }
    }
  }

  /**
   * Caixa menor que o bloco (tocha, laje, cerca, água).
   *
   * O canto da textura sai da posição dentro da célula: uma tocha fina usa só
   * a faixa do meio da textura, que é onde o cabo foi pintado.
   */
  private box(
    writer: MeshWriter,
    block: number,
    x: number,
    y: number,
    z: number,
    box: Box,
    shows: (face: FaceSpec) => boolean,
    glow = 0,
  ): void {
    const center: Vector = [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2];
    const half: Vector = [(box.max[0] - box.min[0]) / 2, (box.max[1] - box.min[1]) / 2, (box.max[2] - box.min[2]) / 2];

    for (const face of FACES) {
      if (!shows(face)) {
        continue;
      }

      const corners: Vector[] = CORNERS.map(([du, dv]) => {
        const point = [0, 1, 2].map((axis) => center[axis] + (face.normal[axis] + face.u[axis] * du + face.v[axis] * dv) * half[axis]);

        return [x + point[0], y + point[1], z + point[2]] as const;
      });

      this.quad(writer, face, corners, [face.shade, face.shade, face.shade, face.shade], this.context.tiles.tile(block, face.kind, 0), [x, y, z], glow);
    }
  }

  /** A face da laje dá para algo que não a esconde? */
  private isExposed(face: FaceSpec, x: number, y: number, z: number, keepTop: boolean): boolean {
    if (keepTop && face.kind === 'top') {
      return true;
    }

    const neighborY = y + face.normal[1];

    return neighborY >= 0 && this.context.properties.isOpaqueCube[this.context.world.get(x + face.normal[0], neighborY, z + face.normal[2])] === 0;
  }

  /** Quadrado com o canto da textura calculado pela posição de cada canto dentro da célula. */
  private quad(
    writer: MeshWriter,
    face: FaceSpec,
    corners: readonly Vector[],
    shades: readonly number[],
    tile: TileUv,
    cell: Vector,
    glow: number,
  ): void {
    const uvs: number[] = [];

    for (const corner of corners) {
      const local: Vector = [corner[0] - cell[0], corner[1] - cell[1], corner[2] - cell[2]];
      const across = fraction(local, face.u);
      const up = fraction(local, face.v);

      uvs.push(tile.u0 + (tile.u1 - tile.u0) * across, tile.v0 + (tile.v1 - tile.v0) * up);
    }

    writer.quad(corners, uvs, shades, corners.map((corner) => Math.max(glow, this.lightAt(corner))));
  }

  /** Luz das tochas no ponto: cai em linha reta até o fim do raio de cada uma. */
  private lightAt(point: Vector): number {
    let light = 0;

    for (const source of this.context.lights) {
      const distance = Math.hypot(point[0] - source.x - 0.5, point[1] - source.y - 0.5, point[2] - source.z - 0.5);

      light = Math.max(light, 1 - distance / source.radius);
    }

    return Math.max(0, light);
  }
}

/** Posição ao longo de um eixo da face, de 0 a 1, contando do lado negativo do eixo. */
function fraction(local: Vector, axis: Vector): number {
  for (let index = 0; index < 3; index += 1) {
    if (axis[index] !== 0) {
      return axis[index] > 0 ? local[index] : 1 - local[index];
    }
  }

  return 0;
}

class MeshWriter {
  private readonly positions: number[] = [];
  private readonly uvs: number[] = [];
  private readonly colors: number[] = [];
  private readonly lights: number[] = [];
  private readonly indices: number[] = [];

  quad(corners: readonly Vector[], uvs: readonly number[], shades: readonly number[], lights: readonly number[]): void {
    const base = this.positions.length / 3;

    corners.forEach((corner, index) => {
      this.positions.push(corner[0], corner[1], corner[2]);
      this.colors.push(shades[index], shades[index], shades[index]);
      this.lights.push(lights[index]);
    });

    this.uvs.push(...uvs);

    // Vira a diagonal quando a sombra é desigual: evita a faixa escura torta no meio da face.
    if (shades[0] + shades[2] < shades[1] + shades[3]) {
      this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    } else {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  build(): ChunkMeshData {
    return {
      positions: new Float32Array(this.positions),
      uvs: new Float32Array(this.uvs),
      colors: new Float32Array(this.colors),
      lights: new Float32Array(this.lights),
      indices: new Uint32Array(this.indices),
    };
  }
}
