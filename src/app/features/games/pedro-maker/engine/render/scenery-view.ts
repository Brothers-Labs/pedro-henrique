import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
} from 'three';

import { darken, lighten } from '../../art/canvas';
import type { ThemePalette } from '../../art/palettes';
import { SeededRandom } from '../../levels/seeded-random';
import type { TileGrid } from '../simulation/tile-grid';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry, type VoxelBox } from './voxel-geometry';

interface HillLayer {
  readonly z: number;
  readonly depth: number;
  /** Largura de cada coluna: o fundo usa cubos maiores, que pesam menos. */
  readonly step: number;
  readonly baseHeight: number;
  readonly variation: number;
  readonly margin: number;
  readonly color: string;
  readonly treeChance: number;
}

const CLOUD_SPEED = 0.35;
const STAR_COUNT = 320;

/** Altura de cada degrau dos morros redondos: curva suave, mas ainda de cubos. */
const DOME_STEP = 0.5;

/**
 * O mar da praia: começa logo atrás das dunas e vai até a neblina do
 * horizonte apagar. A altura fica abaixo do topo das dunas, que viram a
 * beira da praia.
 */
const SEA = {
  level: 1,
  nearZ: -5.5,
  farZ: -80,
  /** Tamanho de cada pedaço da superfície: ondas de cubo, sem pesar no celular. */
  cell: 3,
  waveHeight: 0.22,
  foamCount: 70,
} as const;

/** Matriz de rascunho da espuma: reaproveitada a cada quadro, sem lixo para o coletor. */
const foamMatrix = new Matrix4();

/** Superfície do mar e o que boia nela, animados a cada quadro. */
interface SeaSurface {
  readonly geometry: BufferGeometry;
  readonly foam: InstancedMesh;
  readonly foamSpots: readonly { readonly x: number; readonly z: number }[];
}

/**
 * O mundo em volta da fase: morros, árvores ao longe, nuvens, estrelas, o mar
 * na praia e os morros redondos no tema clássico.
 *
 * Tudo é gerado a partir do nome da fase — a mesma fase tem sempre a mesma
 * paisagem — e montado em poucas malhas grandes, porque o fundo não se mexe
 * e não precisa ser descartado pela câmera pedaço a pedaço.
 */
export class SceneryView {
  readonly root = new Group();

  private readonly clouds: Object3D[] = [];
  private readonly cloudSpan: number;
  private readonly sea: SeaSurface | null = null;
  private seaClock = 0;

  constructor(
    private readonly grid: TileGrid,
    private readonly palette: ThemePalette,
    seed: number,
  ) {
    this.root.name = 'cenario';
    this.cloudSpan = grid.width + 40;

    const random = new SeededRandom(seed);
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });

    if (palette.sea) {
      this.sea = this.buildBeach(random, material, palette.sea);
    } else if (palette.hasRoundHills) {
      this.root.add(this.buildRoundHills(random, material));
    } else {
      this.root.add(
        this.buildHills(random, material, {
          z: -5.5,
          depth: 2,
          step: 1,
          baseHeight: 3.5,
          variation: 5,
          margin: 12,
          color: palette.mid,
          treeChance: 0.07,
        }),
        this.buildHills(random, material, {
          z: -14,
          depth: 4,
          step: 2,
          baseHeight: 6,
          variation: 8,
          margin: 24,
          color: palette.far,
          treeChance: 0,
        }),
      );
    }

    this.addTufts(random);

    if (palette.hasClouds) {
      this.addClouds(random, material);
    }

    if (palette.isDark || new Color(palette.skyTop).getHSL({ h: 0, s: 0, l: 0 }).l < 0.2) {
      this.addStars(random);
    }
  }

  update(deltaSeconds: number): void {
    for (const cloud of this.clouds) {
      cloud.position.x += CLOUD_SPEED * deltaSeconds;

      if (cloud.position.x > this.grid.width + 20) {
        cloud.position.x -= this.cloudSpan;
      }
    }

    if (this.sea) {
      this.seaClock += deltaSeconds;
      this.moveWaves(this.sea, this.seaClock);
    }
  }

  dispose(): void {
    disposeTree(this.root);
  }

  /**
   * A praia: dunas baixas de areia na frente, o mar atrás e ilhas lá longe.
   *
   * As ilhas são morros que mal passam da água; o que fica abaixo do mar
   * simplesmente some embaixo dele.
   */
  private buildBeach(random: SeededRandom, material: MeshStandardMaterial, seaColor: string): SeaSurface {
    const dunes = this.buildHills(random, material, {
      z: -4.5,
      depth: 2,
      step: 1,
      baseHeight: 1.5,
      variation: 1.5,
      margin: 12,
      color: this.palette.mid,
      treeChance: 0,
    });
    const islands = this.buildHills(random, material, {
      z: -42,
      depth: 6,
      step: 2,
      baseHeight: -2,
      variation: 9,
      margin: 40,
      color: this.palette.far,
      treeChance: 0,
    });

    const width = this.grid.width + 120;
    const depth = SEA.nearZ - SEA.farZ;
    const geometry = new PlaneGeometry(width, depth, Math.ceil(width / SEA.cell), Math.ceil(depth / SEA.cell));

    // A rotação vai para dentro da geometria: assim a onda mexe direto na altura (y).
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(this.grid.width / 2, SEA.level, (SEA.nearZ + SEA.farZ) / 2);

    const water = new Mesh(
      geometry,
      new MeshStandardMaterial({ color: seaColor, roughness: 0.35, metalness: 0.05, flatShading: true }),
    );
    water.receiveShadow = true;

    const foamSpots = Array.from({ length: SEA.foamCount }, () => ({
      x: -40 + random.next() * width,
      z: SEA.nearZ - 2 - random.next() * 30,
    }));
    const foam = new InstancedMesh(
      buildBoxesGeometry([box(0, 0, 0, 1.4, 0.12, 0.5, '#ffffff'), box(0.5, 0.05, 0.1, 0.6, 0.1, 0.4, lighten(seaColor, 0.7))]),
      material,
      foamSpots.length,
    );

    this.root.add(dunes, islands, water, foam);

    const sea: SeaSurface = { geometry, foam, foamSpots };
    this.moveWaves(sea, 0);

    return sea;
  }

  /** Ondas que andam devagar para a praia, e a espuma subindo e descendo junto. */
  private moveWaves(sea: SeaSurface, seconds: number): void {
    const positions = sea.geometry.getAttribute('position');

    for (let index = 0; index < positions.count; index += 1) {
      positions.setY(index, SEA.level + waveHeight(positions.getX(index), positions.getZ(index), seconds));
    }

    positions.needsUpdate = true;

    sea.foamSpots.forEach((spot, index) => {
      foamMatrix.makeTranslation(spot.x, SEA.level + 0.08 + waveHeight(spot.x, spot.z, seconds), spot.z);
      sea.foam.setMatrixAt(index, foamMatrix);
    });

    sea.foam.instanceMatrix.needsUpdate = true;
  }

  /**
   * Morros redondos em duas fileiras: os da frente mais baixos e com pintinhas
   * escuras, os de trás maiores e mais claros, sumindo na neblina.
   */
  private buildRoundHills(random: SeededRandom, material: MeshStandardMaterial): Mesh {
    const boxes: VoxelBox[] = [];
    const rows = [
      { z: -13, depth: 3, minRadius: 7, maxRadius: 10, color: this.palette.far, spot: null },
      { z: -6.5, depth: 2, minRadius: 4, maxRadius: 6, color: this.palette.mid, spot: darken(this.palette.mid, 0.3) },
    ] as const;

    for (const row of rows) {
      let x = -12 + random.next() * 6;

      while (x < this.grid.width + 12) {
        const radius = row.minRadius + random.next() * (row.maxRadius - row.minRadius);

        boxes.push(...dome(random, x, row.z, radius, row.depth, row.color, row.spot));
        x += radius * 1.6 + random.next() * 8;
      }
    }

    const mesh = new Mesh(buildBoxesGeometry(boxes), material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;

    return mesh;
  }

  /** Morros de cubos em colunas, com a altura variando suave de uma para a outra. */
  private buildHills(random: SeededRandom, material: MeshStandardMaterial, layer: HillLayer): Mesh {
    const boxes: VoxelBox[] = [];
    const heightAt = smoothNoise(random, 7);
    const cap = lighten(layer.color, 0.14);
    const foliage = this.palette.foliage;
    const bottom = -3;

    for (let x = -layer.margin; x < this.grid.width + layer.margin; x += layer.step) {
      const height = Math.round((layer.baseHeight + heightAt(x / layer.step) * layer.variation) / layer.step) * layer.step;
      const centerX = x + layer.step / 2;

      boxes.push(box(centerX, (bottom + height - layer.step) / 2, layer.z, layer.step, height - layer.step - bottom, layer.depth, layer.color));
      boxes.push(box(centerX, height - layer.step / 2, layer.z, layer.step, layer.step, layer.depth, cap));

      if (random.chance(layer.treeChance)) {
        boxes.push(box(centerX, height + 0.9, layer.z, 0.35, 1.8, 0.35, this.palette.trunk));
        boxes.push(box(centerX, height + 2, layer.z, 1.5, 1.1, 1.5, foliage));
        boxes.push(box(centerX, height + 2.8, layer.z, 0.9, 0.6, 0.9, darken(foliage, 0.12)));
      }
    }

    const mesh = new Mesh(buildBoxesGeometry(boxes), material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;

    return mesh;
  }

  /** Tufos de grama e flores nas camadas de trás do chão: o mundo parece vivo. */
  private addTufts(random: SeededRandom): void {
    const spots: { readonly x: number; readonly y: number; readonly z: number; readonly flower: boolean }[] = [];

    for (let cellX = 0; cellX < this.grid.width; cellX += 1) {
      for (let cellY = 1; cellY < this.grid.height; cellY += 1) {
        const isGrassTop = this.grid.materialAt(cellX, cellY) === 'ground' && this.grid.materialAt(cellX, cellY - 1) === null;

        if (isGrassTop && random.chance(0.35)) {
          spots.push({
            x: cellX + 0.2 + random.next() * 0.6,
            y: this.grid.height - cellY,
            z: -1.4 + random.next() * 0.9,
            flower: random.chance(0.25),
          });
        }
      }
    }

    if (spots.length === 0) {
      return;
    }

    const grass = this.palette.surfaceLight;
    const tuft = buildBoxesGeometry([
      box(-0.08, 0.12, 0, 0.05, 0.24, 0.05, grass),
      box(0.04, 0.16, 0.04, 0.05, 0.32, 0.05, grass),
      box(0.1, 0.1, -0.05, 0.05, 0.2, 0.05, grass),
    ]);
    const flower = buildBoxesGeometry([
      box(0, 0.15, 0, 0.04, 0.3, 0.04, this.palette.foliageDark),
      box(0, 0.33, 0, 0.16, 0.1, 0.16, this.palette.flower),
      box(0, 0.34, 0, 0.07, 0.11, 0.07, '#ffe066'),
    ]);
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const flowerSpots = spots.filter((spot) => spot.flower);
    const grassSpots = spots.filter((spot) => !spot.flower);

    this.root.add(instances(tuft, material, grassSpots), instances(flower, material, flowerSpots));
  }

  private addClouds(random: SeededRandom, material: MeshStandardMaterial): void {
    const count = Math.max(6, Math.round(this.grid.width / 12));

    for (let index = 0; index < count; index += 1) {
      const pieces: VoxelBox[] = [];
      const width = 3 + random.integer(0, 3);

      for (let part = 0; part < width; part += 1) {
        const lift = part === 0 || part === width - 1 ? 0 : random.integer(0, 1) * 0.6;

        pieces.push(box(part * 0.9, lift / 2, 0, 1.1, 0.9 + lift, 1.2, part % 2 === 0 ? '#ffffff' : '#f3f8ff'));
      }

      const cloud = new Mesh(buildBoxesGeometry(pieces), material);
      cloud.position.set(-20 + random.next() * this.cloudSpan, 11 + random.next() * 5, -9 - random.next() * 8);
      this.clouds.push(cloud);
      this.root.add(cloud);
    }
  }

  private addStars(random: SeededRandom): void {
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let index = 0; index < STAR_COUNT; index += 1) {
      positions[index * 3] = -30 + random.next() * (this.grid.width + 60);
      positions[index * 3 + 1] = 4 + random.next() * 30;
      positions[index * 3 + 2] = -45 - random.next() * 10;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    // Estrela não some na neblina: ela está além de tudo.
    this.root.add(new Points(geometry, new PointsMaterial({ color: '#ffffff', size: 0.28, fog: false })));
  }
}

/** Meia esfera achatada em degraus, com pintinhas opcionais na face da frente. */
function dome(
  random: SeededRandom,
  centerX: number,
  z: number,
  radius: number,
  depth: number,
  color: string,
  spotColor: string | null,
): VoxelBox[] {
  const boxes: VoxelBox[] = [];

  for (let y = 0; y < radius; y += DOME_STEP) {
    const halfWidth = Math.sqrt(radius * radius - y * y);

    boxes.push(box(centerX, y + DOME_STEP / 2, z, halfWidth * 2, DOME_STEP, depth, color));
  }

  if (!spotColor) {
    return boxes;
  }

  const front = z + depth / 2 + 0.02;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const spotX = (random.next() - 0.5) * radius * 1.4;
    const spotY = 1 + random.next() * radius * 0.6;

    if (spotX * spotX + spotY * spotY < (radius - 1) * (radius - 1)) {
      boxes.push(box(centerX + spotX, spotY, front, 0.35, 0.9, 0.04, spotColor));
    }
  }

  return boxes;
}

function waveHeight(x: number, z: number, seconds: number): number {
  return SEA.waveHeight * (Math.sin(x * 0.35 + seconds * 1.1) + Math.sin(z * 0.55 + seconds * 1.6) * 0.8);
}

function instances(
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  spots: readonly { readonly x: number; readonly y: number; readonly z: number }[],
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, Math.max(1, spots.length));
  const matrix = new Matrix4();

  mesh.count = spots.length;
  spots.forEach((spot, index) => {
    matrix.makeTranslation(spot.x, spot.y, spot.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.computeBoundingSphere();

  return mesh;
}

/**
 * Ruído suave de uma dimensão: valores sorteados a cada `spacing` colunas e
 * curvas entre eles. Devolve números entre 0 e 1.
 */
function smoothNoise(random: SeededRandom, spacing: number): (x: number) => number {
  const knots = new Map<number, number>();
  const knot = (index: number): number => {
    let value = knots.get(index);

    if (value === undefined) {
      value = random.next();
      knots.set(index, value);
    }

    return value;
  };

  return (x) => {
    const position = x / spacing;
    const left = Math.floor(position);
    const blend = (1 - Math.cos((position - left) * Math.PI)) / 2;

    return knot(left) * (1 - blend) + knot(left + 1) * blend;
  };
}
