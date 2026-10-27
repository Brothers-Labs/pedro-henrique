import { BufferAttribute, BufferGeometry, Group, type Material, Mesh, type Scene } from 'three';

import type { VoxelWorld } from '../../world/voxel-world';
import type { BlockProperties } from '../block-properties';
import type { BlockAtlas } from './block-atlas';
import { type ChunkMeshData, type ChunkMeshes, type LightSource, meshChunk } from './chunk-mesher';
import { createVoxelMaterial, type DaylightUniform, type VoxelPass } from './voxel-material';

/** O brilho 15 vira um raio de 7,5 blocos: a tocha clareia um quarto inteiro. */
const LIGHT_RADIUS_PER_LEVEL = 0.5;

/** Chunks refeitos por quadro depois da carga: quebrar um bloco nunca engasga a tela. */
const REBUILDS_PER_FRAME = 2;

const PASSES: readonly VoxelPass[] = ['opaque', 'cutout', 'water'];

interface ChunkMeshesView {
  readonly meshes: Map<VoxelPass, Mesh>;
}

/**
 * O mundo desenhado: uma malha por chunk e por passe.
 *
 * Escuta o mundo e marca para refazer só o chunk do bloco trocado — e o
 * vizinho, quando o bloco fica na borda, porque a face entre os dois muda.
 * Uma tocha marca todos os chunks que a luz dela alcança.
 */
export class WorldView {
  readonly root = new Group();

  private readonly materials: ReadonlyMap<VoxelPass, Material>;
  private readonly chunks = new Map<number, ChunkMeshesView>();
  private readonly dirty = new Set<number>();
  private readonly lightSources = new Map<number, LightSource>();
  private readonly chunksX: number;
  private readonly chunksZ: number;
  private readonly stopListening: () => void;

  constructor(
    scene: Scene,
    private readonly world: VoxelWorld,
    private readonly properties: BlockProperties,
    private readonly atlas: BlockAtlas,
    daylight: DaylightUniform,
    private readonly chunkSize: number,
    private readonly stageAt: (x: number, y: number, z: number) => number,
  ) {
    this.chunksX = Math.ceil(world.width / chunkSize);
    this.chunksZ = Math.ceil(world.depth / chunkSize);
    this.materials = new Map(PASSES.map((pass) => [pass, createVoxelMaterial(pass, atlas.texture, daylight)]));
    this.findLightSources();
    this.stopListening = world.listen((x, y, z, previous, next) => this.onBlockChanged(x, y, z, previous, next));
    scene.add(this.root);

    for (let index = 0; index < this.chunksX * this.chunksZ; index += 1) {
      this.dirty.add(index);
    }
  }

  get chunkCount(): number {
    return this.chunksX * this.chunksZ;
  }

  get pendingChunks(): number {
    return this.dirty.size;
  }

  /** Refaz até `limit` chunks marcados. Devolve quantos ainda faltam. */
  rebuild(limit = REBUILDS_PER_FRAME): number {
    for (const index of this.dirty) {
      if (limit <= 0) {
        break;
      }

      this.dirty.delete(index);
      this.rebuildChunk(index);
      limit -= 1;
    }

    return this.dirty.size;
  }

  /** Marca a célula para refazer; usado também quando muda algo que não é bloco (estágio da plantação). */
  markCell(x: number, y: number, z: number): void {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    const localX = x - chunkX * this.chunkSize;
    const localZ = z - chunkZ * this.chunkSize;
    const neighborX = localX === 0 ? -1 : localX === this.chunkSize - 1 ? 1 : 0;
    const neighborZ = localZ === 0 ? -1 : localZ === this.chunkSize - 1 ? 1 : 0;

    this.markChunk(chunkX, chunkZ);

    // Na borda do chunk, a face entre os dois vizinhos muda: os dois refazem.
    if (neighborX !== 0) {
      this.markChunk(chunkX + neighborX, chunkZ);
    }

    if (neighborZ !== 0) {
      this.markChunk(chunkX, chunkZ + neighborZ);
    }
  }

  dispose(): void {
    this.stopListening();

    for (const chunk of this.chunks.values()) {
      for (const mesh of chunk.meshes.values()) {
        mesh.geometry.dispose();
      }
    }

    for (const material of this.materials.values()) {
      material.dispose();
    }

    this.chunks.clear();
    this.root.removeFromParent();
  }

  private onBlockChanged(x: number, y: number, z: number, previous: number, next: number): void {
    this.markCell(x, y, z);

    const previousLight = this.properties.light[previous];
    const nextLight = this.properties.light[next];

    if (previousLight === 0 && nextLight === 0) {
      return;
    }

    const index = this.world.indexOf(x, y, z);

    if (nextLight > 0) {
      this.lightSources.set(index, { x, y, z, radius: nextLight * LIGHT_RADIUS_PER_LEVEL });
    } else {
      this.lightSources.delete(index);
    }

    this.markAround(x, z, Math.max(previousLight, nextLight) * LIGHT_RADIUS_PER_LEVEL);
  }

  private markAround(x: number, z: number, radius: number): void {
    const fromX = Math.floor((x - radius) / this.chunkSize);
    const toX = Math.floor((x + radius) / this.chunkSize);
    const fromZ = Math.floor((z - radius) / this.chunkSize);
    const toZ = Math.floor((z + radius) / this.chunkSize);

    for (let chunkZ = fromZ; chunkZ <= toZ; chunkZ += 1) {
      for (let chunkX = fromX; chunkX <= toX; chunkX += 1) {
        this.markChunk(chunkX, chunkZ);
      }
    }
  }

  private markChunk(chunkX: number, chunkZ: number): void {
    if (chunkX >= 0 && chunkZ >= 0 && chunkX < this.chunksX && chunkZ < this.chunksZ) {
      this.dirty.add(chunkZ * this.chunksX + chunkX);
    }
  }

  private findLightSources(): void {
    const { world, properties } = this;

    for (let y = 0; y < world.height; y += 1) {
      for (let z = 0; z < world.depth; z += 1) {
        for (let x = 0; x < world.width; x += 1) {
          const light = properties.light[world.get(x, y, z)];

          if (light > 0) {
            this.lightSources.set(world.indexOf(x, y, z), { x, y, z, radius: light * LIGHT_RADIUS_PER_LEVEL });
          }
        }
      }
    }
  }

  private rebuildChunk(index: number): void {
    const chunkX = index % this.chunksX;
    const chunkZ = Math.floor(index / this.chunksX);
    const meshes = meshChunk(
      {
        world: this.world,
        properties: this.properties,
        tiles: this.atlas,
        chunkSize: this.chunkSize,
        lights: this.lightsNear(chunkX, chunkZ),
        stageAt: this.stageAt,
      },
      chunkX,
      chunkZ,
    );

    this.replaceChunk(index, meshes);
  }

  private lightsNear(chunkX: number, chunkZ: number): readonly LightSource[] {
    const minX = chunkX * this.chunkSize;
    const minZ = chunkZ * this.chunkSize;
    const maxX = minX + this.chunkSize;
    const maxZ = minZ + this.chunkSize;

    return [...this.lightSources.values()].filter(
      (light) =>
        light.x + light.radius >= minX && light.x - light.radius <= maxX && light.z + light.radius >= minZ && light.z - light.radius <= maxZ,
    );
  }

  private replaceChunk(index: number, data: ChunkMeshes): void {
    const view = this.chunks.get(index) ?? { meshes: new Map<VoxelPass, Mesh>() };

    this.chunks.set(index, view);

    for (const pass of PASSES) {
      const previous = view.meshes.get(pass);
      const mesh = data[pass].indices.length > 0 ? this.createMesh(data[pass], pass) : null;

      if (previous) {
        previous.geometry.dispose();
        previous.removeFromParent();
        view.meshes.delete(pass);
      }

      if (mesh) {
        view.meshes.set(pass, mesh);
        this.root.add(mesh);
      }
    }
  }

  private createMesh(data: ChunkMeshData, pass: VoxelPass): Mesh {
    const geometry = new BufferGeometry();
    const material = this.materials.get(pass);

    if (!material) {
      throw new Error(`PedroCraft: material do passe "${pass}" não existe.`);
    }

    geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(data.uvs, 2));
    geometry.setAttribute('color', new BufferAttribute(data.colors, 3));
    geometry.setAttribute('blockLight', new BufferAttribute(data.lights, 1));
    geometry.setIndex(new BufferAttribute(data.indices, 1));
    geometry.computeBoundingSphere();

    const mesh = new Mesh(geometry, material);

    // A água desenha depois do resto: é transparente e precisa ver o que está atrás.
    mesh.renderOrder = pass === 'water' ? 2 : pass === 'cutout' ? 1 : 0;
    mesh.matrixAutoUpdate = false;

    return mesh;
  }
}
