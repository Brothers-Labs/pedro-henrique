import { BufferAttribute, BufferGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial } from 'three';

import type { TileGrid } from '../simulation/tile-grid';
import { disposeTree } from './dispose';
import type { VoxelAtlasTexture } from './voxel-atlas-texture';
import { buildTexturedBoxGeometry } from './voxel-geometry';
import { CHUNK_COLUMNS, meshTerrainChunk } from './voxel-mesher';

const PLANK_HEIGHT = 0.28;
const PLANK_DEPTH = 1.4;

/**
 * O terreno fixo da fase em 3D.
 *
 * Montado em pedaços de 16 colunas: a câmera só desenha os pedaços que
 * aparecem, e a montagem pode ser fatiada entre quadros para a barra de
 * carregamento andar em vez de a tela congelar.
 */
export class TerrainView {
  readonly root = new Group();
  readonly chunkCount: number;

  private readonly material: MeshStandardMaterial;

  constructor(
    private readonly grid: TileGrid,
    private readonly atlas: VoxelAtlasTexture,
    private readonly castsShadows: boolean,
  ) {
    this.root.name = 'terreno';
    this.chunkCount = Math.ceil(grid.width / CHUNK_COLUMNS);
    this.material = new MeshStandardMaterial({ map: atlas.texture, vertexColors: true, roughness: 0.92, metalness: 0 });
  }

  buildChunk(index: number): void {
    const data = meshTerrainChunk(this.grid, index * CHUNK_COLUMNS, this.atlas.lookup);

    if (data.indices.length === 0) {
      return;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(data.normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(data.uvs, 2));
    geometry.setAttribute('color', new BufferAttribute(data.colors, 3));
    geometry.setIndex(new BufferAttribute(data.indices, 1));
    geometry.computeBoundingSphere();

    const mesh = new Mesh(geometry, this.material);
    mesh.receiveShadow = true;
    mesh.castShadow = this.castsShadows;
    mesh.matrixAutoUpdate = false;
    this.root.add(mesh);
  }

  /** Tábuas de madeira (plataforma de mão única): finas, no alto da célula. */
  buildPlanks(): void {
    const cells: { readonly x: number; readonly y: number }[] = [];

    for (let cellX = 0; cellX < this.grid.width; cellX += 1) {
      for (let cellY = 0; cellY < this.grid.height; cellY += 1) {
        if (this.grid.materialAt(cellX, cellY) === 'platform') {
          cells.push({ x: cellX, y: cellY });
        }
      }
    }

    if (cells.length === 0) {
      return;
    }

    const region = this.atlas.lookup('platform');
    const geometry = buildTexturedBoxGeometry(1, PLANK_HEIGHT, PLANK_DEPTH, () => region);
    const material = new MeshStandardMaterial({ map: this.atlas.texture, roughness: 0.85 });
    const planks = new InstancedMesh(geometry, material, cells.length);
    const matrix = new Matrix4();

    cells.forEach((cell, index) => {
      matrix.makeTranslation(cell.x + 0.5, this.grid.height - cell.y - PLANK_HEIGHT / 2, 0);
      planks.setMatrixAt(index, matrix);
    });

    planks.castShadow = true;
    planks.receiveShadow = true;
    planks.computeBoundingSphere();
    this.root.add(planks);
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
  }
}
