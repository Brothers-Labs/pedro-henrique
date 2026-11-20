import { Color, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';

import type { VoxelTile } from '../../art/voxel-tiles';
import { TILE_SIZE } from '../../config/physics.config';
import {
  type BlockSystem,
  type InteractiveBlock,
  MOVING_PLATFORM_HEIGHT,
  MOVING_PLATFORM_WIDTH,
  type MovingPlatform,
  type MovingPlatformKind,
} from '../simulation/blocks';
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
/** A água da superfície fica um pouco abaixo do topo da célula, e ondula. */
const WATER_TOP = 0.86;
const WATER_OPACITY = 0.62;
const BLOCK_SIZE = 0.98;
/** O tremido da ponte de esqueletos antes de se desmanchar, como o da tábua frágil. */
const SKELETON_SHAKE = 0.05;
/** Bloco colorido apagado: dá para ver onde ele volta, mas fica claro que se atravessa. */
const GHOST_OPACITY = 0.28;

/** Faces de um bloco: a de cima pode ter desenho próprio, como a grama. */
interface BlockTiles {
  readonly side: VoxelTile;
  readonly top: VoxelTile;
  readonly bottom: VoxelTile;
}

interface BlockMesh {
  readonly mesh: InstancedMesh;
  readonly blocks: readonly InteractiveBlock[];
}

interface PlatformMesh {
  readonly mesh: InstancedMesh;
  readonly platforms: readonly MovingPlatform[];
}

/** A de vai e volta é de madeira com laterais de mola; a de esqueleto, toda de osso. */
const PLATFORM_TILES: Readonly<Record<MovingPlatformKind, { readonly top: VoxelTile; readonly side: VoxelTile }>> = {
  shuttle: { top: 'platform', side: 'spring' },
  skeleton: { top: 'bone', side: 'bone' },
};

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
  private readonly luckyBlocks: BlockMesh;
  private readonly multiCoinBlocks: BlockMesh;
  private readonly usedSurprises: BlockMesh;
  private readonly springs: BlockMesh;
  private readonly ceilingSprings: BlockMesh;
  private readonly notes: BlockMesh;
  private readonly crumbles: BlockMesh;
  private readonly invisibleGrass: BlockMesh;
  private readonly switchesOn: BlockMesh;
  private readonly switchesOff: BlockMesh;
  private readonly redBlocks: BlockMesh;
  private readonly redGhosts: BlockMesh;
  private readonly blueBlocks: BlockMesh;
  private readonly blueGhosts: BlockMesh;
  private readonly lava: InstancedMesh | null;
  private readonly water: InstancedMesh | null;
  /** Para cada célula de água, se ela é a de cima (a que ondula). */
  private readonly waterSurface: readonly boolean[];
  private readonly platforms: readonly PlatformMesh[];

  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();

  constructor(
    private readonly system: BlockSystem,
    private readonly atlas: VoxelAtlasTexture,
    private readonly space: WorldSpace,
    /** Tijolos em que as moedas viram com o botão P; escondidos até ele ser apertado. */
    coinBricks: readonly InteractiveBlock[] = [],
  ) {
    this.root.name = 'blocos';

    const byKind = (kind: InteractiveBlock['kind']): InteractiveBlock[] => system.interactive.filter((block) => block.kind === kind);
    const surpriseBlocks = byKind('surprise');
    const isLucky = (block: InteractiveBlock): boolean => block.contents === 'lucky';
    // O bloco de moedas se disfarça de tijolo até esvaziar.
    const isMultiCoin = (block: InteractiveBlock): boolean => block.contents === 'multi-coins';
    const isPlainSurprise = (block: InteractiveBlock): boolean => !isLucky(block) && !isMultiCoin(block);

    this.bricks = this.blockMesh([...byKind('brick'), ...coinBricks], 'brick', BLOCK_SIZE);
    this.surprises = this.blockMesh(surpriseBlocks.filter(isPlainSurprise), 'surprise', BLOCK_SIZE);
    this.luckyBlocks = this.blockMesh(surpriseBlocks.filter(isLucky), 'lucky', BLOCK_SIZE);
    this.multiCoinBlocks = this.blockMesh(surpriseBlocks.filter(isMultiCoin), 'brick', BLOCK_SIZE);
    this.usedSurprises = this.blockMesh(surpriseBlocks, 'surprise-used', BLOCK_SIZE);
    this.springs = this.blockMesh(byKind('spring'), 'spring', 0.9);
    this.ceilingSprings = this.blockMesh(byKind('ceiling-spring'), 'spring', 0.9);
    this.notes = this.blockMesh(byKind('note'), 'note', BLOCK_SIZE);
    this.crumbles = this.blockMesh(byKind('crumble'), 'crumble', BLOCK_SIZE, 0.45);
    // Revelada, a grama invisível vira um bloco de grama igual ao do terreno.
    this.invisibleGrass = this.blockMesh(byKind('invisible-grass'), { side: 'grass-side', top: 'grass-top', bottom: 'dirt' }, BLOCK_SIZE);
    // O interruptor tem uma cara para cada estado; só a do estado atual aparece.
    this.switchesOn = this.blockMesh(byKind('on-off-switch'), 'switch-on', BLOCK_SIZE);
    this.switchesOff = this.blockMesh(byKind('on-off-switch'), 'switch-off', BLOCK_SIZE);
    this.redBlocks = this.blockMesh(byKind('red-block'), 'red-block', BLOCK_SIZE);
    this.redGhosts = this.ghostMesh(byKind('red-block'), 'red-block');
    this.blueBlocks = this.blockMesh(byKind('blue-block'), 'blue-block', BLOCK_SIZE);
    this.blueGhosts = this.ghostMesh(byKind('blue-block'), 'blue-block');
    this.lava = this.buildLava();
    this.waterSurface = this.findWaterSurface();
    this.water = this.buildWater();
    this.platforms = (['shuttle', 'skeleton'] as const).flatMap((kind) => this.buildPlatforms(kind));
  }

  update(now: number, alpha: number): void {
    // Escondido, o tijolo virou moeda do botão P (ou é uma moeda que ainda não virou tijolo).
    this.updateBlocks(this.bricks, now, (block) => !block.isBroken && !block.isHidden);
    this.updateBlocks(this.surprises, now, (block) => !block.isUsed);
    this.updateBlocks(this.luckyBlocks, now, (block) => !block.isUsed);
    this.updateBlocks(this.multiCoinBlocks, now, (block) => !block.isUsed);
    this.updateBlocks(this.usedSurprises, now, (block) => block.isUsed);
    this.updateBlocks(this.springs, now, () => true);
    this.updateBlocks(this.ceilingSprings, now, () => true);
    this.updateBlocks(this.notes, now, () => true);
    this.updateBlocks(this.crumbles, now, (block) => !block.isHidden);
    this.updateBlocks(this.invisibleGrass, now, (block) => block.isUsed);
    this.updateBlocks(this.switchesOn, now, () => this.system.isSwitchOn);
    this.updateBlocks(this.switchesOff, now, () => !this.system.isSwitchOn);
    this.updateBlocks(this.redBlocks, now, (block) => !block.isHidden);
    this.updateBlocks(this.redGhosts, now, (block) => block.isHidden);
    this.updateBlocks(this.blueBlocks, now, (block) => !block.isHidden);
    this.updateBlocks(this.blueGhosts, now, (block) => block.isHidden);
    this.updateLava(now);
    this.updateWater(now);
    this.updatePlatforms(now, alpha);
  }

  dispose(): void {
    disposeTree(this.root);
  }

  private blockMesh(
    blocks: readonly InteractiveBlock[],
    tile: VoxelTile | BlockTiles,
    size: number,
    height = size,
    material = new MeshStandardMaterial({ map: this.atlas.texture, roughness: 0.7 }),
  ): BlockMesh {
    const tiles: BlockTiles = typeof tile === 'string' ? { side: tile, top: tile, bottom: tile } : tile;
    const side = this.atlas.lookup(tiles.side);
    const top = this.atlas.lookup(tiles.top);
    const bottom = this.atlas.lookup(tiles.bottom);
    const geometry = buildTexturedBoxGeometry(size, height, size, ({ isTop, isBottom }) => (isTop ? top : isBottom ? bottom : side));
    const mesh = new InstancedMesh(geometry, material, Math.max(1, blocks.length));

    mesh.count = blocks.length;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);

    return { mesh, blocks };
  }

  /** O bloco colorido apagado: translúcido e sem sombra, desenhado depois dos sólidos. */
  private ghostMesh(blocks: readonly InteractiveBlock[], tile: VoxelTile): BlockMesh {
    const material = new MeshStandardMaterial({
      map: this.atlas.texture,
      roughness: 0.7,
      transparent: true,
      opacity: GHOST_OPACITY,
      depthWrite: false,
    });
    const ghost = this.blockMesh(blocks, tile, BLOCK_SIZE, BLOCK_SIZE, material);

    ghost.mesh.castShadow = false;
    ghost.mesh.receiveShadow = false;
    ghost.mesh.renderOrder = 1;

    return ghost;
  }

  private updateBlocks(target: BlockMesh, now: number, isVisible: (block: InteractiveBlock) => boolean): void {
    if (target.blocks.length === 0) {
      return;
    }

    target.blocks.forEach((block, index) => {
      const visible = isVisible(block);
      const bump = pulse(now - block.bumpedAt, BUMP_MS);
      const isSpring = block.kind === 'spring' || block.kind === 'ceiling-spring';
      // A mola do teto amassa para cima, presa pela base lá em cima.
      const squashTowards = block.kind === 'ceiling-spring' ? -1 : 1;
      const isCrumble = block.kind === 'crumble';
      const shake = isCrumble && block.isUsed && !block.isHidden ? Math.sin(now / 22) * 0.05 : 0;
      const squash = isSpring ? 1 - pulse(now - block.bumpedAt, SPRING_SQUASH_MS) * 0.4 : 1;
      const lift = isSpring ? 0 : bump * BUMP_HEIGHT;
      // A tábua frágil fica no alto da célula; os demais, no meio dela.
      const baseY = this.space.y((block.cellY + (isCrumble ? 0.23 : 0.5)) * TILE_SIZE);
      const springDrop = isSpring ? (1 - squash) * 0.45 : 0;

      this.position.set(block.cellX + 0.5 + shake, baseY + lift - springDrop * squashTowards, 0);
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

  private findWaterSurface(): readonly boolean[] {
    const cells = this.system.waterCells;
    const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));

    return cells.map((cell) => !keys.has(`${cell.x},${cell.y - 1}`));
  }

  /** Água meio transparente: dá para ver o Pedro nadando lá dentro. */
  private buildWater(): InstancedMesh | null {
    const cells = this.system.waterCells;

    if (cells.length === 0) {
      return null;
    }

    const region = this.atlas.lookup('water');
    const geometry = buildTexturedBoxGeometry(1, 1, TERRAIN_DEPTH, () => region);
    const material = new MeshStandardMaterial({
      map: this.atlas.texture,
      transparent: true,
      opacity: WATER_OPACITY,
      depthWrite: false,
      roughness: 0.25,
    });
    const mesh = new InstancedMesh(geometry, material, cells.length);

    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    this.root.add(mesh);

    return mesh;
  }

  private updateWater(now: number): void {
    const water = this.water;

    if (!water) {
      return;
    }

    this.system.waterCells.forEach((cell, index) => {
      const isSurface = this.waterSurface[index] ?? false;
      const height = isSurface ? WATER_TOP + Math.sin(now / 520 + cell.x * 0.8) * 0.05 : 1;

      this.position.set(cell.x + 0.5, this.space.y((cell.y + 1) * TILE_SIZE) + height / 2, 0);
      this.scale.set(1, height, 1);
      this.matrix.compose(this.position, this.rotation, this.scale);
      water.setMatrixAt(index, this.matrix);
    });

    water.instanceMatrix.needsUpdate = true;
  }

  private buildPlatforms(kind: MovingPlatformKind): readonly PlatformMesh[] {
    const platforms = this.system.platforms.filter((platform) => platform.kind === kind);

    if (platforms.length === 0) {
      return [];
    }

    const top = this.atlas.lookup(PLATFORM_TILES[kind].top);
    const side = this.atlas.lookup(PLATFORM_TILES[kind].side);
    const geometry = buildTexturedBoxGeometry(
      this.space.length(MOVING_PLATFORM_WIDTH),
      this.space.length(MOVING_PLATFORM_HEIGHT),
      1.5,
      ({ isTop }) => (isTop ? top : side),
    );
    const material = new MeshStandardMaterial({ map: this.atlas.texture, roughness: 0.6, metalness: 0.2 });
    const segmentCount = platforms.reduce((total, platform) => total + segmentsOf(platform), 0);
    const mesh = new InstancedMesh(geometry, material, segmentCount);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);

    return [{ mesh, platforms }];
  }

  private updatePlatforms(now: number, alpha: number): void {
    const halfWidth = this.space.length(MOVING_PLATFORM_WIDTH) / 2;
    const halfHeight = this.space.length(MOVING_PLATFORM_HEIGHT) / 2;

    for (const { mesh, platforms } of this.platforms) {
      this.placePlatforms(mesh, platforms, now, alpha, halfWidth, halfHeight);
    }
  }

  /**
   * Cada pedaço do tamanho de uma plataforma comum é uma cópia: a ponte de
   * esqueletos repete o osso em vez de esticá-lo. Prestes a se desmanchar, cada
   * osso treme no seu tempo; desmanchada, some.
   */
  private placePlatforms(
    mesh: InstancedMesh,
    platforms: readonly MovingPlatform[],
    now: number,
    alpha: number,
    halfWidth: number,
    halfHeight: number,
  ): void {
    let index = 0;

    for (const platform of platforms) {
      const x = platform.previousX + (platform.x - platform.previousX) * alpha;
      const y = platform.previousY + (platform.y - platform.previousY) * alpha;
      const isShaking = !platform.isHidden && platform.vanishCountdown > 0;
      const size = platform.isHidden ? 0 : 1;

      for (let segment = 0; segment < segmentsOf(platform); segment += 1) {
        const shake = isShaking ? Math.sin(now / 22 + segment * 1.7) * SKELETON_SHAKE : 0;

        this.position.set(this.space.x(x + segment * MOVING_PLATFORM_WIDTH) + halfWidth + shake, this.space.y(y) - halfHeight, 0);
        this.scale.set(size, size, size);
        this.matrix.compose(this.position, this.rotation, this.scale);
        mesh.setMatrixAt(index, this.matrix);
        index += 1;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
  }
}

function segmentsOf(platform: MovingPlatform): number {
  return Math.max(1, Math.round(platform.width / MOVING_PLATFORM_WIDTH));
}
