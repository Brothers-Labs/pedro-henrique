import { BufferAttribute, BufferGeometry, Color } from 'three';

/** Caixa colorida de um modelo, com o centro em (x, y, z) e medidas em blocos. */
export interface VoxelBox {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly color: string;
}

/** Atalho para escrever modelos: centro, medidas e cor numa linha só. */
export function box(x: number, y: number, z: number, width: number, height: number, depth: number, color: string): VoxelBox {
  return { x, y, z, width, height, depth, color };
}

type Axis = 0 | 1 | 2;

interface BoxFace {
  readonly axis: Axis;
  readonly sign: 1 | -1;
  /** Eixos do quadrado da face, escolhidos para os triângulos virarem para fora. */
  readonly u: Axis;
  readonly v: Axis;
}

const BOX_FACES: readonly BoxFace[] = [
  { axis: 0, sign: 1, u: 1, v: 2 },
  { axis: 0, sign: -1, u: 2, v: 1 },
  { axis: 1, sign: 1, u: 2, v: 0 },
  { axis: 1, sign: -1, u: 0, v: 2 },
  { axis: 2, sign: 1, u: 0, v: 1 },
  { axis: 2, sign: -1, u: 1, v: 0 },
];

const CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/**
 * Várias caixas coloridas numa geometria só.
 *
 * Um personagem de cubos tem dezenas de caixas; desenhar cada uma separada
 * custaria dezenas de chamadas à placa de vídeo por personagem. Juntas, com a
 * cor gravada em cada vértice, custam uma.
 */
export function buildBoxesGeometry(boxes: readonly VoxelBox[]): BufferGeometry {
  const vertexCount = boxes.length * 24;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(boxes.length * 36);
  const color = new Color();
  let vertex = 0;
  let index = 0;

  for (const part of boxes) {
    const center = [part.x, part.y, part.z] as const;
    const half = [part.width / 2, part.height / 2, part.depth / 2] as const;

    // A cor vem em sRGB (como no CSS); o Three guarda em linear para a luz ficar certa.
    color.set(part.color);

    for (const face of BOX_FACES) {
      const first = vertex;

      for (const [du, dv] of CORNERS) {
        const point = [0, 0, 0];

        point[face.axis] = face.sign;
        point[face.u] = du;
        point[face.v] = dv;

        for (let axis = 0; axis < 3; axis += 1) {
          positions[vertex * 3 + axis] = center[axis] + point[axis] * half[axis];
          normals[vertex * 3 + axis] = axis === face.axis ? face.sign : 0;
        }

        colors[vertex * 3] = color.r;
        colors[vertex * 3 + 1] = color.g;
        colors[vertex * 3 + 2] = color.b;
        vertex += 1;
      }

      indices.set([first, first + 1, first + 2, first, first + 2, first + 3], index);
      index += 6;
    }
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  return geometry;
}

/** Região de uma face no atlas. */
export interface TileRegion {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
}

/** Qual face do atlas vai em cada lado da caixa; `top` diz se o lado é o de cima. */
export type TileForSide = (side: { readonly isTop: boolean; readonly isBottom: boolean }) => TileRegion;

/**
 * Caixa com as faces do atlas, centrada na origem.
 *
 * É a peça dos blocos soltos — tijolo, surpresa, mola, tábuas —, que vivem em
 * malhas instanciadas: centenas de blocos iguais numa chamada só.
 */
export function buildTexturedBoxGeometry(width: number, height: number, depth: number, tileFor: TileForSide): BufferGeometry {
  const half = [width / 2, height / 2, depth / 2] as const;
  const positions = new Float32Array(24 * 3);
  const normals = new Float32Array(24 * 3);
  const uvs = new Float32Array(24 * 2);
  const indices = new Uint16Array(36);
  let vertex = 0;
  let index = 0;

  for (const face of BOX_FACES) {
    const first = vertex;
    const region = tileFor({ isTop: face.axis === 1 && face.sign === 1, isBottom: face.axis === 1 && face.sign === -1 });

    for (const [du, dv] of CORNERS) {
      const point = [0, 0, 0];

      point[face.axis] = face.sign;
      point[face.u] = du;
      point[face.v] = dv;

      for (let axis = 0; axis < 3; axis += 1) {
        positions[vertex * 3 + axis] = point[axis] * half[axis];
        normals[vertex * 3 + axis] = axis === face.axis ? face.sign : 0;
      }

      const [across, up] = textureDirections(face, du, dv);

      uvs[vertex * 2] = across < 0 ? region.u0 : region.u1;
      uvs[vertex * 2 + 1] = up < 0 ? region.v0 : region.v1;
      vertex += 1;
    }

    indices.set([first, first + 1, first + 2, first, first + 2, first + 3], index);
    index += 6;
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Para onde apontam a largura e a altura da textura num canto da face.
 *
 * Nas laterais, o alto da textura é o alto do mundo (a grama fica em cima);
 * no topo, é o fundo da cena, como quem olha o bloco de frente e de cima.
 */
function textureDirections(face: BoxFace, du: number, dv: number): readonly [number, number] {
  if (face.axis === 1) {
    return face.sign === 1 ? [dv, -du] : [du, dv];
  }

  return face.u === 1 ? [-dv, du] : [du, dv];
}
