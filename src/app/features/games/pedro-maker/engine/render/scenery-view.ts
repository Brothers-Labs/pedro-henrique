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

/**
 * O mundo em volta da fase: morros, árvores ao longe, nuvens e estrelas.
 *
 * Tudo é gerado a partir do nome da fase — a mesma fase tem sempre a mesma
 * paisagem — e montado em poucas malhas grandes, porque o fundo não se mexe
 * e não precisa ser descartado pela câmera pedaço a pedaço.
 */
export class SceneryView {
  readonly root = new Group();

  private readonly clouds: Object3D[] = [];
  private readonly cloudSpan: number;

  constructor(
    private readonly grid: TileGrid,
    private readonly palette: ThemePalette,
    seed: number,
  ) {
    this.root.name = 'cenario';
    this.cloudSpan = grid.width + 40;

    const random = new SeededRandom(seed);
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });

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
  }

  dispose(): void {
    disposeTree(this.root);
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
