import { Group, Mesh, MeshStandardMaterial } from 'three';

import { TILE_SIZE } from '../../config/physics.config';
import type { FireTrap, FireTrapSystem } from '../simulation/fire-traps';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry } from './voxel-geometry';
import type { WorldSpace } from './world-space';

/** Altura da chama do aviso, em blocos: uma brasinha tremendo na boca antes do fogo subir. */
const WARNING_FLAME_CELLS = 0.18;
/** Quanto a chama tremula na largura, para parecer fogo e não uma coluna parada. */
const FLICKER = 0.08;

interface FireTrapModel {
  readonly trap: FireTrap;
  readonly flame: Mesh;
}

/**
 * Armadilhas de fogo em 3D: o bloco de pedra escura com a grade de ferro em
 * cima e a coluna de fogo que sai dela. A chama é um bloco só, de altura 1,
 * que a tela estica até a altura que a simulação manda.
 */
export class FireTrapView {
  readonly root = new Group();

  private readonly models: readonly FireTrapModel[] = [];
  private readonly flameMaterial = new MeshStandardMaterial({ vertexColors: true, emissive: '#ff6a1f', emissiveIntensity: 1, transparent: true, opacity: 0.92 });

  constructor(
    private readonly system: FireTrapSystem,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'armadilhas-de-fogo';

    if (!system.hasTraps) {
      return;
    }

    const tile = space.length(TILE_SIZE);
    const baseGeometry = buildBoxesGeometry([
      box(0, 0, 0, tile, tile, tile, '#4a3a36'),
      box(0, 0, tile * 0.5, tile * 0.86, tile * 0.86, 0.01, '#5d4a44'),
      // Boca de ferro em cima, com as barras da grade.
      box(0, tile * 0.47, 0, tile * 0.7, tile * 0.08, tile * 0.7, '#2b2d42'),
      ...[-0.2, 0, 0.2].map((x) => box(tile * x, tile * 0.52, 0, tile * 0.06, tile * 0.04, tile * 0.66, '#8d96a8')),
      // Brasas no fundo da boca.
      box(0, tile * 0.5, 0, tile * 0.5, tile * 0.02, tile * 0.5, '#ff6a1f'),
    ]);
    const baseMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const flameGeometry = buildBoxesGeometry([
      box(0, 0.5, 0, tile * 0.7, 1, tile * 0.6, '#ff6a1f'),
      box(0, 0.5, 0, tile * 0.42, 1.02, tile * 0.66, '#ffd23f'),
    ]);

    this.models = system.traps.map((trap) => {
      const base = new Mesh(baseGeometry, baseMaterial);
      const flame = new Mesh(flameGeometry, this.flameMaterial);
      const x = space.x((trap.cellX + 0.5) * TILE_SIZE);

      base.position.set(x, space.y((trap.cellY + 0.5) * TILE_SIZE), 0);
      base.castShadow = true;
      base.receiveShadow = true;
      flame.position.set(x, space.y(trap.cellY * TILE_SIZE), 0.05);
      flame.visible = false;
      this.root.add(base, flame);

      return { trap, flame };
    });
  }

  update(now: number): void {
    for (const { trap, flame } of this.models) {
      const phase = this.system.phaseOf(trap, now);
      const height = phase === 'warn' ? WARNING_FLAME_CELLS * TILE_SIZE : this.system.flameHeight(trap, now);

      flame.visible = height > 0;

      if (!flame.visible) {
        continue;
      }

      const flicker = 1 + Math.sin(now / 45 + trap.cellX) * FLICKER;

      flame.scale.set(flicker, Math.max(0.001, this.space.length(height)), flicker);
    }
  }

  dispose(): void {
    disposeTree(this.root);
    this.flameMaterial.dispose();
  }
}
