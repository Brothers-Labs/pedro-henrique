import type { VoxelTile } from '../../art/voxel-tiles';
import type { TerrainMaterial } from '../simulation/tile-grid';

/** O que o gerador de malha precisa saber do terreno. A grade de colisão serve. */
export interface TerrainSource {
  readonly width: number;
  readonly height: number;
  /** Linha zero no topo, como na planta da fase. */
  materialAt(cellX: number, cellY: number): TerrainMaterial | null;
}

/** Profundidade do terreno, em blocos: uma faixa de três, como um corte no mundo. */
export const TERRAIN_DEPTH = 3;

/** Frente da faixa de terreno; o Pedro anda no meio dela, em z = 0. */
export const TERRAIN_FRONT_Z = TERRAIN_DEPTH / 2;

/** Colunas por pedaço de malha: a câmera descarta os pedaços fora da tela. */
export const CHUNK_COLUMNS = 16;

export type FaceDirection = 'front' | 'top' | 'bottom' | 'left' | 'right';

/** Onde fica cada face no atlas, em coordenadas de textura já normalizadas. */
export type TileLookup = (tile: VoxelTile) => { readonly u0: number; readonly v0: number; readonly u1: number; readonly v1: number };

export interface MeshData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  /** Brilho por vértice (a sombra dos cantos), repetido nos três canais de cor. */
  readonly colors: Float32Array;
  readonly indices: Uint32Array;
}

type Vector = readonly [number, number, number];

interface FaceSpec {
  readonly normal: Vector;
  readonly u: Vector;
  readonly v: Vector;
}

const FACES: Readonly<Record<FaceDirection, FaceSpec>> = {
  front: { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  top: { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  bottom: { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  right: { normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  left: { normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
};

/** Ordem dos cantos de cada face: baixo-esquerda, baixo-direita, cima-direita, cima-esquerda. */
const CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/** Brilho do canto pelo número de blocos vizinhos que o escondem (0 a 3). */
const OCCLUSION_LIGHT = [1, 0.84, 0.7, 0.56] as const;

/**
 * Malha de um pedaço do terreno, no jeito dos jogos de cubos.
 *
 * Só as faces que dão para o vazio viram triângulos — a face entre dois
 * blocos vizinhos nunca aparece e não é desenhada. Cada canto ganha uma
 * sombrinha conforme os blocos em volta (oclusão de ambiente), o que dá volume
 * às quinas sem custo de luz em tempo real.
 *
 * Coordenadas de saída já no mundo 3D: um bloco vale 1, y para cima, a fase
 * começando em x = 0 e o chão da fase em y = 0.
 */
export function meshTerrainChunk(source: TerrainSource, firstColumn: number, tileLookup: TileLookup): MeshData {
  const writer = new MeshWriter();
  const lastColumn = Math.min(source.width, firstColumn + CHUNK_COLUMNS) - 1;

  for (let cellX = firstColumn; cellX <= lastColumn; cellX += 1) {
    for (let cellY = 0; cellY < source.height; cellY += 1) {
      const material = source.materialAt(cellX, cellY);

      if (material !== null && isFullCube(material)) {
        emitCell(writer, source, material, cellX, cellY, tileLookup);
      }
    }
  }

  return writer.build();
}

/** A plataforma de madeira é uma tábua fina, desenhada à parte; o resto é cubo inteiro. */
export function isFullCube(material: TerrainMaterial): boolean {
  return material !== 'platform';
}

export function tileFor(material: TerrainMaterial, face: FaceDirection, isTopExposed: boolean): VoxelTile {
  switch (material) {
    case 'ground':
      if (face === 'top') {
        return 'grass-top';
      }

      return face === 'bottom' || !isTopExposed ? 'dirt' : 'grass-side';
    case 'pipe':
      return face === 'top' ? 'pipe-top' : 'pipe-side';
    case 'desert-mountain':
      return face === 'top' ? 'mesa-top' : 'mesa-side';
    case 'platform':
      return 'platform';
    case 'stone':
    case 'ice':
    case 'sand':
    case 'wood':
    case 'cloud':
    case 'rainbow-block':
    case 'rainbow-bridge':
      return material;
  }
}

function emitCell(
  writer: MeshWriter,
  source: TerrainSource,
  material: TerrainMaterial,
  cellX: number,
  cellY: number,
  tileLookup: TileLookup,
): void {
  const isSolid = (x: number, y: number): boolean => {
    // Além das bordas laterais o chão continua: nada de parede falsa no fim da fase.
    if (x < 0 || x >= source.width) {
      return y >= 0 && y < source.height && isSolid(Math.min(source.width - 1, Math.max(0, x)), y);
    }

    const neighbor = source.materialAt(x, y);

    return neighbor !== null && isFullCube(neighbor);
  };

  const isTopExposed = cellY === 0 || !isSolid(cellX, cellY - 1);
  const worldY = source.height - 1 - cellY;
  // Ocupação em 3D para a sombra dos cantos: grade da fase por todas as camadas da faixa.
  const occupied = (x: number, y: number, z: number): boolean =>
    z >= 0 && z < TERRAIN_DEPTH && isSolid(x, source.height - 1 - y);

  for (let layer = 0; layer < TERRAIN_DEPTH; layer += 1) {
    const voxel: Vector = [cellX, worldY, layer];
    const faces: FaceDirection[] = [];

    if (layer === TERRAIN_DEPTH - 1) {
      faces.push('front');
    }

    if (isTopExposed) {
      faces.push('top');
    }

    if (cellY < source.height - 1 && !isSolid(cellX, cellY + 1)) {
      faces.push('bottom');
    }

    if (!isSolid(cellX - 1, cellY)) {
      faces.push('left');
    }

    if (!isSolid(cellX + 1, cellY)) {
      faces.push('right');
    }

    for (const face of faces) {
      writer.face(voxel, FACES[face], tileLookup(tileFor(material, face, isTopExposed)), occupied);
    }
  }
}

class MeshWriter {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];

  face(
    voxel: Vector,
    spec: FaceSpec,
    uv: ReturnType<TileLookup>,
    occupied: (x: number, y: number, z: number) => boolean,
  ): void {
    const [n0, n1, n2] = spec.normal;
    const base = this.positions.length / 3;
    const outsideX = voxel[0] + n0;
    const outsideY = voxel[1] + n1;
    const outsideZ = voxel[2] + n2;
    const light: number[] = [];

    for (const [du, dv] of CORNERS) {
      const offsetX = spec.u[0] * du + spec.v[0] * dv;
      const offsetY = spec.u[1] * du + spec.v[1] * dv;
      const offsetZ = spec.u[2] * du + spec.v[2] * dv;

      this.positions.push(
        voxel[0] + 0.5 + (n0 + offsetX) * 0.5,
        voxel[1] + 0.5 + (n1 + offsetY) * 0.5,
        voxel[2] - TERRAIN_FRONT_Z + 0.5 + (n2 + offsetZ) * 0.5,
      );
      this.normals.push(n0, n1, n2);
      this.uvs.push(du < 0 ? uv.u0 : uv.u1, dv < 0 ? uv.v0 : uv.v1);

      const sideA = occupied(outsideX + spec.u[0] * du, outsideY + spec.u[1] * du, outsideZ + spec.u[2] * du);
      const sideB = occupied(outsideX + spec.v[0] * dv, outsideY + spec.v[1] * dv, outsideZ + spec.v[2] * dv);
      const corner = occupied(outsideX + offsetX, outsideY + offsetY, outsideZ + offsetZ);
      const occlusion = sideA && sideB ? 3 : Number(sideA) + Number(sideB) + Number(corner);
      const brightness = OCCLUSION_LIGHT[occlusion as 0 | 1 | 2 | 3];

      light.push(brightness);
      this.colors.push(brightness, brightness, brightness);
    }

    // Vira a diagonal do quadrado quando a sombra é desigual: evita a faixa escura torta.
    if (light[0] + light[2] < light[1] + light[3]) {
      this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    } else {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  build(): MeshData {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      colors: new Float32Array(this.colors),
      indices: new Uint32Array(this.indices),
    };
  }
}
