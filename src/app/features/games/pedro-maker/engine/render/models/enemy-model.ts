import { Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';

import type { EnemyKind } from '../../../models/level.model';
import { ENEMY_DEFEAT_MS } from '../../simulation/enemy';
import { box, buildBoxesGeometry, type VoxelBox } from '../voxel-geometry';

const EYE_WHITE = '#ffffff';
const PUPIL = '#2a2350';

/** Estado do inimigo que o modelo precisa para se mexer. */
export interface EnemyPose {
  readonly kind: EnemyKind;
  readonly direction: 1 | -1;
  readonly isDefeated: boolean;
  readonly defeatedAt: number;
  readonly isFaded: boolean;
  readonly isMoving: boolean;
}

/**
 * Materiais dos inimigos, um conjunto só para a fase inteira.
 *
 * Com vinte slimes na tela, vinte cópias do mesmo material só gastariam
 * memória; o fantasma tem o seu, porque some e aparece.
 */
export class EnemyMaterials {
  readonly solid = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  readonly glow = new MeshStandardMaterial({ vertexColors: true, emissive: '#6ff3ff', emissiveIntensity: 1.2, roughness: 0.3 });

  ghost(): MeshStandardMaterial {
    return new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, transparent: true, opacity: 0.9, depthWrite: false });
  }

  dispose(): void {
    this.solid.dispose();
    this.glow.dispose();
  }
}

/**
 * Um inimigo de cubos, com o jeito de se mexer do seu tipo.
 *
 * O slime quica amassando, o morcego bate as asas, o robô balança a antena e
 * o fantasma flutua e fica transparente quando some. Derrotado, achata e some.
 */
export class EnemyModel {
  readonly root = new Group();

  private readonly body = new Group();
  private readonly wings: readonly Group[] = [];
  private readonly ghostMaterial: MeshStandardMaterial | null = null;
  private heading: number;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    private readonly kind: EnemyKind,
    materials: EnemyMaterials,
    scale: number,
  ) {
    this.root.name = `inimigo-${kind}`;
    this.root.scale.setScalar(scale);
    this.heading = -Math.PI / 2 + 0.5;

    if (kind === 'ghost') {
      this.ghostMaterial = materials.ghost();
    }

    const material = this.ghostMaterial ?? materials.solid;

    this.body.add(this.mesh(PARTS[kind], material));

    if (kind === 'robot') {
      this.body.add(this.mesh([box(0, 0.5, 0.26, 0.4, 0.1, 0.02, '#6ff3ff')], materials.glow));
    }

    if (kind === 'bat') {
      this.wings = [-1, 1].map((side) => {
        const wing = new Group();

        wing.position.set(side * 0.18, 0.02, 0);
        wing.add(this.mesh([box(side * 0.22, 0, 0, 0.44, 0.06, 0.26, '#5b3aa8'), box(side * 0.36, -0.06, 0, 0.18, 0.06, 0.2, '#4a2e8c')], material));
        this.body.add(wing);

        return wing;
      });
    }

    this.root.add(this.body);
  }

  update(pose: EnemyPose, deltaSeconds: number, now: number): void {
    const target = pose.direction * (Math.PI / 2 - 0.5);
    this.heading = MathUtils.lerp(this.heading, target, 1 - Math.exp(-10 * deltaSeconds));
    this.body.rotation.y = this.heading;

    if (pose.isDefeated) {
      const progress = Math.min(1, (now - pose.defeatedAt) / ENEMY_DEFEAT_MS);

      this.body.scale.set(1 + progress * 0.4, Math.max(0.05, 1 - progress * 0.85), 1 + progress * 0.4);
      this.body.position.y = 0;
      return;
    }

    const time = now / 1000 + this.phase;

    switch (this.kind) {
      case 'slime': {
        const hop = Math.abs(Math.sin(time * 6));

        this.body.scale.set(1 + (1 - hop) * 0.12, 0.88 + hop * 0.2, 1 + (1 - hop) * 0.12);
        this.body.position.y = pose.isMoving ? hop * 0.06 : 0;
        return;
      }
      case 'spiky':
        this.body.position.y = Math.abs(Math.sin(time * 9)) * 0.03;
        return;
      case 'robot':
        this.body.rotation.z = pose.isMoving ? Math.sin(time * 10) * 0.05 : 0;
        return;
      case 'bat':
        this.wings.forEach((wing, index) => {
          wing.rotation.z = (index === 0 ? 1 : -1) * Math.sin(time * 18) * 0.7;
        });
        return;
      case 'ghost':
        this.body.position.y = Math.sin(time * 2.4) * 0.08;

        if (this.ghostMaterial) {
          this.ghostMaterial.opacity = MathUtils.lerp(this.ghostMaterial.opacity, pose.isFaded ? 0.2 : 0.9, 1 - Math.exp(-8 * deltaSeconds));
        }

        return;
    }
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
      }
    });
    this.ghostMaterial?.dispose();
    this.root.removeFromParent();
  }

  private mesh(parts: readonly VoxelBox[], material: MeshStandardMaterial): Mesh {
    const mesh = new Mesh(buildBoxesGeometry(parts), material);

    mesh.castShadow = true;

    return mesh;
  }
}

/** Olhos na frente do corpo, na altura e distância pedidas. */
function eyes(y: number, z: number, spread: number, size: number): readonly VoxelBox[] {
  return [
    box(-spread, y, z, size, size * 1.2, 0.02, EYE_WHITE),
    box(spread, y, z, size, size * 1.2, 0.02, EYE_WHITE),
    box(-spread + size * 0.18, y - size * 0.1, z + 0.012, size * 0.5, size * 0.7, 0.01, PUPIL),
    box(spread + size * 0.18, y - size * 0.1, z + 0.012, size * 0.5, size * 0.7, 0.01, PUPIL),
  ];
}

/** Os modelos têm a base no chão (y = 0) e a frente virada para +z. */
const PARTS: Readonly<Record<EnemyKind, readonly VoxelBox[]>> = {
  slime: [
    box(0, 0.17, 0, 0.8, 0.34, 0.66, '#5fd35a'),
    box(0, 0.4, 0, 0.62, 0.14, 0.52, '#76e36b'),
    box(0, 0.51, 0, 0.36, 0.08, 0.32, '#8ff07f'),
    box(0.2, 0.36, 0.2, 0.1, 0.06, 0.1, '#c9ffc0'),
    ...eyes(0.3, 0.335, 0.15, 0.13),
  ],
  spiky: [
    box(0, 0.08, 0.05, 0.62, 0.12, 0.5, '#ffd08a'),
    box(0, 0.32, -0.02, 0.72, 0.36, 0.56, '#e8505b'),
    box(0, 0.54, -0.02, 0.5, 0.1, 0.4, '#f06a73'),
    ...[-0.24, 0, 0.24].flatMap((x) => [box(x, 0.64, -0.02, 0.12, 0.12, 0.12, '#fff3bf'), box(x, 0.73, -0.02, 0.06, 0.08, 0.06, '#ffffff')]),
    box(-0.18, 0.02, 0.1, 0.16, 0.04, 0.2, '#8a4b20'),
    box(0.18, 0.02, 0.1, 0.16, 0.04, 0.2, '#8a4b20'),
    ...eyes(0.24, 0.265, 0.13, 0.12),
  ],
  robot: [
    box(-0.2, 0.08, 0, 0.14, 0.16, 0.4, '#3d4254'),
    box(0.2, 0.08, 0, 0.14, 0.16, 0.4, '#3d4254'),
    box(0, 0.42, 0, 0.6, 0.52, 0.48, '#9aa3b5'),
    box(0, 0.5, 0.245, 0.46, 0.18, 0.02, '#2a2350'),
    box(0, 0.3, 0.245, 0.3, 0.1, 0.02, '#c9d2e3'),
    box(0, 0.76, 0, 0.04, 0.16, 0.04, '#6f788c'),
    box(0, 0.87, 0, 0.1, 0.1, 0.1, '#ff5a5a'),
    box(-0.33, 0.42, 0, 0.06, 0.2, 0.2, '#6f788c'),
    box(0.33, 0.42, 0, 0.06, 0.2, 0.2, '#6f788c'),
  ],
  bat: [
    box(0, 0, 0, 0.36, 0.34, 0.3, '#7b52d3'),
    box(-0.1, 0.22, 0, 0.08, 0.12, 0.08, '#7b52d3'),
    box(0.1, 0.22, 0, 0.08, 0.12, 0.08, '#7b52d3'),
    box(0, -0.1, 0.155, 0.12, 0.04, 0.01, '#ffffff'),
    ...eyes(0.04, 0.155, 0.08, 0.09),
  ],
  ghost: [
    box(0, 0.36, 0, 0.62, 0.44, 0.5, '#f4f1ff'),
    box(0, 0.62, 0, 0.46, 0.12, 0.4, '#f4f1ff'),
    box(-0.2, 0.1, 0, 0.18, 0.12, 0.46, '#e6e0ff'),
    box(0.02, 0.08, 0, 0.18, 0.16, 0.46, '#e6e0ff'),
    box(0.22, 0.11, 0, 0.16, 0.1, 0.46, '#e6e0ff'),
    box(0, 0.26, 0.255, 0.14, 0.12, 0.01, '#2a2350'),
    ...eyes(0.44, 0.255, 0.12, 0.11),
  ],
};
