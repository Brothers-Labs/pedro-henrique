import { Group, Mesh, MeshStandardMaterial } from 'three';

import { TILE_SIZE } from '../../config/physics.config';
import type { ClimbChainSystem } from '../simulation/climb-chains';
import type { CrusherSystem } from '../simulation/crushers';
import type { TileGrid } from '../simulation/tile-grid';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry, type VoxelBox } from './voxel-geometry';
import type { WorldSpace } from './world-space';

const IRON = '#4a5163';
const DARK_IRON = '#2f3442';
const STEEL = '#8d96a8';
const LIGHT_STEEL = '#b9c0cf';
const HAZARD_YELLOW = '#ffc629';
/** Sem teto em cima, a haste da prensa sobe este tanto acima da casa dela. */
const OPEN_SKY_SHAFT_CELLS = 1.5;
/** O teto mais alto que a haste procura, em blocos acima da casa. */
const MAX_SHAFT_CELLS = 8;

/**
 * Cabeça da prensa: bloco de ferro com faixa amarela e preta de "cuidado",
 * rebites e dentes embaixo. Pés (os dentes) em y = 0, um bloco de altura.
 */
function crusherHeadParts(): readonly VoxelBox[] {
  const parts: VoxelBox[] = [
    box(0, 0.56, 0, 0.96, 0.8, 0.8, IRON),
    box(0, 0.98, 0, 0.7, 0.06, 0.6, DARK_IRON),
    // Olhos bravos, para a criança entender que é perigo.
    box(-0.2, 0.66, 0.41, 0.16, 0.12, 0.02, '#ffffff'),
    box(0.2, 0.66, 0.41, 0.16, 0.12, 0.02, '#ffffff'),
    box(-0.18, 0.64, 0.425, 0.07, 0.07, 0.01, '#1a1a2e'),
    box(0.18, 0.64, 0.425, 0.07, 0.07, 0.01, '#1a1a2e'),
    box(-0.2, 0.77, 0.42, 0.2, 0.04, 0.02, '#1a1a2e'),
    box(0.2, 0.77, 0.42, 0.2, 0.04, 0.02, '#1a1a2e'),
  ];

  // Faixa de cuidado, amarela e preta, logo acima dos dentes.
  for (let stripe = 0; stripe < 6; stripe += 1) {
    parts.push(box(-0.4 + stripe * 0.16, 0.26, 0.405, 0.16, 0.14, 0.02, stripe % 2 === 0 ? HAZARD_YELLOW : '#1a1a2e'));
  }

  // Rebites nos cantos.
  for (const x of [-0.38, 0.38]) {
    for (const y of [0.42, 0.88]) {
      parts.push(box(x, y, 0.41, 0.07, 0.07, 0.03, LIGHT_STEEL));
    }
  }

  // Dentes de aço embaixo.
  for (let tooth = 0; tooth < 5; tooth += 1) {
    parts.push(box(-0.38 + tooth * 0.19, 0.08, 0, 0.12, 0.16, 0.7, STEEL));
  }

  return parts;
}

/** Haste da prensa: um bloco de altura 1 que a tela estica até o teto. Base em y = 0. */
function crusherShaftParts(): readonly VoxelBox[] {
  return [box(0, 0.5, 0, 0.22, 1, 0.22, STEEL), box(-0.07, 0.5, 0.11, 0.04, 1, 0.01, LIGHT_STEEL)];
}

/** Elos pendurados de uma célula da Corrente de Subir, com o centro da célula em (cx, cy). */
function climbChainLinkParts(cx: number, cy: number, isTop: boolean): VoxelBox[] {
  const parts: VoxelBox[] = [];

  for (let link = 0; link < 4; link += 1) {
    const y = cy + 0.375 - link * 0.25;

    if (link % 2 === 0) {
      // Elo de frente: um aro achatado.
      parts.push(box(cx - 0.08, y, 0.35, 0.05, 0.26, 0.08, STEEL));
      parts.push(box(cx + 0.08, y, 0.35, 0.05, 0.26, 0.08, STEEL));
      parts.push(box(cx, y + 0.11, 0.35, 0.2, 0.05, 0.08, STEEL));
      parts.push(box(cx, y - 0.11, 0.35, 0.2, 0.05, 0.08, STEEL));
    } else {
      // Elo de lado: a lâmina fina de quem vê o elo de perfil.
      parts.push(box(cx, y, 0.35, 0.05, 0.28, 0.2, LIGHT_STEEL));
    }
  }

  if (isTop) {
    // Gancho no alto: a corrente pendurada numa argola presa à barra.
    parts.push(box(cx, cy + 0.52, 0.35, 0.6, 0.08, 0.22, IRON));
    parts.push(box(cx, cy + 0.46, 0.35, 0.12, 0.06, 0.12, DARK_IRON));
  }

  return parts;
}

interface CrusherModel {
  readonly head: Group;
  readonly shaft: Mesh;
  /** Onde a haste começa: o teto acima da prensa, em blocos do mundo 3D. */
  readonly ceilingY: number;
}

/**
 * Prensas esmagadoras e correntes de subir em 3D.
 *
 * A prensa é a cabeça de ferro presa a uma haste que desce do teto: a cabeça
 * segue a posição da simulação e a haste estica junto. As correntes de subir
 * não mexem: todas viram uma malha só.
 */
export class MachineView {
  readonly root = new Group();

  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 });
  private readonly crusherModels = new Map<number, CrusherModel>();

  constructor(
    private readonly crushers: CrusherSystem,
    climbChains: ClimbChainSystem,
    grid: TileGrid,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'maquinas';

    if (crushers.crushers.length > 0) {
      const headGeometry = buildBoxesGeometry(crusherHeadParts());
      const shaftGeometry = buildBoxesGeometry(crusherShaftParts());

      for (const crusher of crushers.crushers) {
        const head = new Group();
        const headMesh = new Mesh(headGeometry, this.material);
        const shaft = new Mesh(shaftGeometry, this.material);

        headMesh.castShadow = true;
        headMesh.receiveShadow = true;
        shaft.castShadow = true;
        head.add(headMesh);
        head.position.x = space.x((crusher.cellX + 0.5) * TILE_SIZE);
        shaft.position.x = head.position.x;
        this.root.add(head, shaft);
        this.crusherModels.set(crusher.id, { head, shaft, ceilingY: space.y(ceilingRow(grid, crusher.cellX, crusher.cellY) * TILE_SIZE) });
      }
    }

    if (climbChains.links.length > 0) {
      const parts = climbChains.links.flatMap((link) =>
        climbChainLinkParts(
          space.x((link.cellX + 0.5) * TILE_SIZE),
          space.y((link.cellY + 0.5) * TILE_SIZE),
          climbChains.isTop(link.cellX, link.cellY),
        ),
      );
      const mesh = new Mesh(buildBoxesGeometry(parts), this.material);

      mesh.castShadow = true;
      mesh.name = 'correntes-de-subir';
      this.root.add(mesh);
    }
  }

  update(now: number): void {
    for (const crusher of this.crushers.crushers) {
      const model = this.crusherModels.get(crusher.id);

      if (!model) {
        continue;
      }

      const { offsetPx } = this.crushers.stateOf(crusher, now);
      const feetY = this.space.y((crusher.cellY + 1) * TILE_SIZE + offsetPx);
      const headTop = feetY + 1;
      const shaftLength = Math.max(0.001, model.ceilingY - headTop);

      model.head.position.y = feetY;
      model.shaft.position.y = headTop;
      model.shaft.scale.y = shaftLength;
      model.shaft.visible = model.ceilingY > headTop;
    }
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
  }
}

/**
 * Linha (em pixels de célula) onde a haste se prende: o pé do primeiro bloco
 * firme acima da prensa. Sem teto, ela sobe só um pouquinho.
 */
function ceilingRow(grid: TileGrid, cellX: number, cellY: number): number {
  for (let row = cellY - 1; row >= Math.max(0, cellY - MAX_SHAFT_CELLS); row -= 1) {
    if (grid.isSolidCell(cellX, row)) {
      return row + 1;
    }
  }

  return cellY - OPEN_SKY_SHAFT_CELLS;
}
