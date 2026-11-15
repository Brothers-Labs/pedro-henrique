import { Group, Mesh, MeshStandardMaterial } from 'three';

import type { TalkingFlower } from '../simulation/triggers';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry, type VoxelBox } from './voxel-geometry';
import type { WorldSpace } from './world-space';

/** A flor balança devagarinho sempre; com o herói perto, ela dança e fala. */
const IDLE_SWAY = 0.05;
const TALK_SWAY = 0.2;
const IDLE_PERIOD_MS = 900;
const TALK_PERIOD_MS = 140;

/** Flor de cubos com carinha: pétalas rosa em volta do rosto, olhos e sorriso. Os pés ficam em y = 0. */
function flowerParts(): readonly VoxelBox[] {
  const petal = '#ff6fae';
  const face = '#fff4c2';

  return [
    box(0, 0.3, 0, 0.08, 0.6, 0.08, '#3b9c3b'),
    box(-0.13, 0.26, 0, 0.18, 0.06, 0.08, '#4fbf4a'),
    box(0.13, 0.36, 0, 0.18, 0.06, 0.08, '#4fbf4a'),
    box(0, 1.04, 0, 0.24, 0.16, 0.12, petal),
    box(0, 0.56, 0, 0.24, 0.16, 0.12, petal),
    box(-0.24, 0.8, 0, 0.16, 0.24, 0.12, petal),
    box(0.24, 0.8, 0, 0.16, 0.24, 0.12, petal),
    box(0, 0.8, 0, 0.36, 0.36, 0.16, face),
    box(-0.07, 0.85, 0.085, 0.05, 0.09, 0.01, '#2a2350'),
    box(0.07, 0.85, 0.085, 0.05, 0.09, 0.01, '#2a2350'),
    box(0, 0.72, 0.085, 0.14, 0.03, 0.01, '#c2185b'),
  ];
}

/**
 * As Flores Falantes em 3D. Cada uma é um grupo próprio — e não parte da
 * malha parada dos enfeites — para poder balançar e dançar quando fala.
 */
export class TalkingFlowerView {
  readonly root = new Group();

  private readonly heads = new Map<number, Group>();

  constructor(
    private readonly flowers: readonly TalkingFlower[],
    space: WorldSpace,
  ) {
    this.root.name = 'flores-falantes';

    if (flowers.length === 0) {
      return;
    }

    const geometry = buildBoxesGeometry(flowerParts());
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });

    for (const flower of flowers) {
      const group = new Group();
      const mesh = new Mesh(geometry, material);

      mesh.castShadow = true;
      group.add(mesh);
      // Na frente dos enfeites e atrás do herói, como as placas.
      group.position.set(space.x(flower.x), space.y(flower.y), -0.3);
      this.root.add(group);
      this.heads.set(flower.id, group);
    }
  }

  update(now: number): void {
    for (const flower of this.flowers) {
      const group = this.heads.get(flower.id);

      if (!group) {
        continue;
      }

      const sway = flower.isNear ? TALK_SWAY : IDLE_SWAY;
      const period = flower.isNear ? TALK_PERIOD_MS : IDLE_PERIOD_MS;

      group.rotation.z = Math.sin(now / period) * sway;
      group.scale.setScalar(flower.isNear ? 1 + Math.abs(Math.sin(now / period)) * 0.08 : 1);
    }
  }

  dispose(): void {
    disposeTree(this.root);
  }
}
