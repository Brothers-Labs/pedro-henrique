import { Color, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';

import type { VoxelTile } from '../../art/voxel-tiles';
import { TILE_SIZE } from '../../config/physics.config';
import { type BlockSystem, type InteractiveBlock, MOVING_PLATFORM_HEIGHT, MOVING_PLATFORM_WIDTH } from '../simulation/blocks';
import { disposeTree } from './dispose';
import { pulse } from './easing';
import type { VoxelAtlasTexture } from './voxel-atlas-texture';
import { buildTexturedBoxGeometry } from './voxel-geometry';
import { TERRAIN_DEPTH } from './voxel-mesher';
import type { WorldSpace } from './world-space';

const BUMP_MS = 150;
const BUMP_HEIGHT = 0.2;
const SPRING_SQUASH_MS = 220;
const LAVA_TOP = 0.82;
const BLOCK_SIZE = 0.98;

interface BlockMesh {
  readonly mesh: InstancedMesh;
  readonly blocks: readonly InteractiveBlock[];
}

/**
 * Blocos que reagem ao Pedro, em malhas instanciadas.
 *
 * Cada tipo de bloco é uma malha com centenas de cópias — uma chamada à placa
 * de vídeo por tipo. A animação (pulinho da cabeçada, mola amassando, tábua
 * tremendo) muda só a matriz da cópia, a cada quadro.
 */
export class BlockView {
  readonly root = new Group();

  private readonly bricks: BlockMesh;
  private readonly surprises: BlockMesh;
  private readonly usedSurprises: BlockMesh;
  private readonly springs: BlockMesh;
  private readonly crumbles: BlockMesh;
  private readonly lava: InstancedMesh | null;
  private readonly platforms: InstancedMesh | null;

  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();

  constructor(
    private readonly system: BlockSystem,
    private readonly atlas: VoxelAtlasTexture,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'blocos';

    const byKind = (kind: InteractiveBlock['kind']): InteractiveBlock[] => system.interactive.filter((block) => block.kind === kind);
    const surpriseBlocks = byKind('surprise');

    this.bricks = this.blockMesh(byKind('brick'), 'brick', BLOCK_SIZE);
    this.surprises = this.blockMesh(surpriseBlocks, 'surprise', BLOCK_SIZE);
    this.usedSurprises = this.blockMesh(surpriseBlocks, 'surprise-used', BLOCK_SIZE);
    this.springs = this.blockMesh(byKind('spring'), 'spring', 0.9);
    this.crumbles = this.blockMesh(byKind('crumble'), 'crumble', BLOCK_SIZE, 0.45);
    this.lava = this.buildLava();
    this.platforms = this.buildPlatforms();
  }

  update(now: number, alpha: number): void {
    this.updateBlocks(this.bricks, now, (block) => !block.isBroken);
    this.updateBlocks(this.surprises, now, (block) => !block.isUsed);
    this.updateBlocks(this.usedSurprises, now, (block) => block.isUsed);
    this.updateBlocks(this.springs, now, () => true);
    this.updateBlocks(this.crumbles, now, (block) => !block.isHidden);
    this.updateLava(now);
    this.updatePlatforms(alpha);
  }

  dispose(): void {
    disposeTree(this.root);
  }

  private blockMesh(blocks: readonly InteractiveBlock[], tile: VoxelTile, size: number, height = size): BlockMesh {
    const region = this.atlas.lookup(tile);
    const geometry = buildTexturedBoxGeometry(size, height, size, () => region);
    const material = new MeshStandardMaterial({ map: this.atlas.texture, roughness: 0.7 });
    const mesh = new InstancedMesh(geometry, material, Math.max(1, blocks.length));

    mesh.count = blocks.length;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);

    return { mesh, blocks };
  }

  private updateBlocks(target: BlockMesh, now: number, isVisible: (block: InteractiveBlock) => boolean): void {
    if (target.blocks.length === 0) {
      return;
    }

    target.blocks.forEach((block, index) => {
      const visible = isVisible(block);
      const bump = pulse(now - block.bumpedAt, BUMP_MS);
      const isSpring = block.kind === 'spring';
      const isCrumble = block.kind === 'crumble';
      const shake = isCrumble && block.isUsed && !block.isHidden ? Math.sin(now / 22) * 0.05 : 0;
      const squash = isSpring ? 1 - pulse(now - block.bumpedAt, SPRING_SQUASH_MS) * 0.4 : 1;
      const lift = isSpring ? 0 : bump * BUMP_HEIGHT;
      // A tábua frágil fica no alto da célula; os demais, no meio dela.
      const baseY = this.space.y((block.cellY + (isCrumble ? 0.23 : 0.5)) * TILE_SIZE);
      const springDrop = isSpring ? (1 - squash) * 0.45 : 0;

      this.position.set(block.cellX + 0.5 + shake, baseY + lift - springDrop, 0);
      this.scale.set(visible ? 1 : 0, visible ? squash : 0, visible ? 1 : 0);
      this.matrix.compose(this.position, this.rotation, this.scale);
      target.mesh.setMatrixAt(index, this.matrix);
    });

    target.mesh.instanceMatrix.needsUpdate = true;
  }

  private buildLava(): InstancedMesh | null {
    const cells = this.system.lavaCells;

    if (cells.length === 0) {
      return null;
    }

    const region = this.atlas.lookup('lava');
    const geometry = buildTexturedBoxGeometry(1, LAVA_TOP, TERRAIN_DEPTH, () => region);
    const material = new MeshStandardMaterial({
      map: this.atlas.texture,
      emissiveMap: this.atlas.texture,
      emissive: new Color('#ffffff'),
      emissiveIntensity: 0.9,
      roughness: 0.4,
    });
    const mesh = new InstancedMesh(geometry, material, cells.length);

    mesh.frustumCulled = false;
    this.root.add(mesh);

    return mesh;
  }

  private updateLava(now: number): void {
    const lava = this.lava;

    if (!lava) {
      return;
    }

    this.system.lavaCells.forEach((cell, index) => {
      // A superfície ondula, cada célula num tempo: parece líquido de verdade.
      const wave = Math.sin(now / 420 + cell.x * 0.9) * 0.04;

      this.position.set(cell.x + 0.5, this.space.y((cell.y + 1) * TILE_SIZE) + LAVA_TOP / 2 + wave, 0);
      this.scale.set(1, 1, 1);
      this.matrix.compose(this.position, this.rotation, this.scale);
      lava.setMatrixAt(index, this.matrix);
    });

    lava.instanceMatrix.needsUpdate = true;
  }

  private buildPlatforms(): InstancedMesh | null {
    const platforms = this.system.platforms;

    if (platforms.length === 0) {
      return null;
    }

    const top = this.atlas.lookup('platform');
    const side = this.atlas.lookup('spring');
    const geometry = buildTexturedBoxGeometry(
      this.space.length(MOVING_PLATFORM_WIDTH),
      this.space.length(MOVING_PLATFORM_HEIGHT),
      1.5,
      ({ isTop }) => (isTop ? top : side),
    );
    const material = new MeshStandardMaterial({ map: this.atlas.texture, roughness: 0.6, metalness: 0.2 });
    const mesh = new InstancedMesh(geometry, material, platforms.length);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);

    return mesh;
  }

  private updatePlatforms(alpha: number): void {
    const mesh = this.platforms;

    if (!mesh) {
      return;
    }

    const halfWidth = this.space.length(MOVING_PLATFORM_WIDTH) / 2;
    const halfHeight = this.space.length(MOVING_PLATFORM_HEIGHT) / 2;

    this.system.platforms.forEach((platform, index) => {
      const x = platform.previousX + (platform.x - platform.previousX) * alpha;
      const y = platform.previousY + (platform.y - platform.previousY) * alpha;

      this.position.set(this.space.x(x) + halfWidth, this.space.y(y) - halfHeight, 0);
      this.scale.set(1, 1, 1);
      this.matrix.compose(this.position, this.rotation, this.scale);
      mesh.setMatrixAt(index, this.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }
}
