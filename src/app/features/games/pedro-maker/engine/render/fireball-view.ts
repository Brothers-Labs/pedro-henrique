import { Group, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';

import { BUBBLE_PHYSICS, FIREBALL_PHYSICS } from '../../config/physics.config';
import type { BallElement, FireballSystem } from '../simulation/fireballs';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry } from './voxel-geometry';
import type { WorldSpace } from './world-space';

const SPIN_RATE = 1 / 70;
/** A bolha deixa ver através dela. */
const BUBBLE_OPACITY = 0.6;

interface BallLook {
  readonly shell: string;
  readonly core: string;
  readonly emissive: string;
}

const LOOKS: Readonly<Record<BallElement, BallLook>> = {
  fire: { shell: '#ff6a1f', core: '#ffd23f', emissive: '#ff8a1f' },
  ice: { shell: '#7fd8ff', core: '#ffffff', emissive: '#3fb8ff' },
  bubble: { shell: '#bdf3ff', core: '#ffffff', emissive: '#5fd4ff' },
};

const ELEMENTS: readonly BallElement[] = ['fire', 'ice', 'bubble'];

/**
 * Bolas de fogo, de gelo e bolhas em 3D: um cubinho brilhante girando, numa
 * malha instanciada por elemento, do tamanho do máximo de bolas no ar. A bolha
 * é meio transparente e bem maior.
 */
export class FireballView {
  readonly root = new Group();

  private readonly meshes: Readonly<Record<BallElement, InstancedMesh>>;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly spinAxis = new Vector3(0, 0, 1);

  constructor(
    private readonly system: FireballSystem,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'bolas-de-fogo-e-gelo';

    const size = space.length(FIREBALL_PHYSICS.size);

    this.meshes = {
      fire: this.ballMesh(LOOKS.fire, size),
      ice: this.ballMesh(LOOKS.ice, size),
      bubble: this.ballMesh(LOOKS.bubble, space.length(BUBBLE_PHYSICS.size), BUBBLE_OPACITY),
    };
  }

  update(now: number, alpha: number): void {
    this.rotation.setFromAxisAngle(this.spinAxis, -now * SPIN_RATE);

    for (const element of ELEMENTS) {
      this.meshes[element].count = 0;
    }

    for (const fireball of this.system.fireballs) {
      const mesh = this.meshes[fireball.element];
      const body = fireball.body;
      const x = body.previousX + (body.x - body.previousX) * alpha + body.width / 2;
      const y = body.previousY + (body.y - body.previousY) * alpha + body.height / 2;

      this.position.set(this.space.x(x), this.space.y(y), 0.2);
      this.matrix.compose(this.position, this.rotation, this.scale);
      mesh.setMatrixAt(mesh.count, this.matrix);
      mesh.count += 1;
    }

    for (const element of ELEMENTS) {
      this.meshes[element].instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    disposeTree(this.root);
  }

  private ballMesh(look: BallLook, size: number, opacity = 1): InstancedMesh {
    const geometry = buildBoxesGeometry([
      box(0, 0, 0, size, size, size, look.shell),
      box(0, 0, 0, size * 0.6, size * 0.6, size * 1.05, look.core),
    ]);
    const material = new MeshStandardMaterial({
      vertexColors: true,
      emissive: look.emissive,
      emissiveIntensity: 0.9,
      transparent: opacity < 1,
      opacity,
    });
    const mesh = new InstancedMesh(geometry, material, FIREBALL_PHYSICS.maxAlive);

    mesh.count = 0;
    mesh.frustumCulled = false;
    this.root.add(mesh);

    return mesh;
  }
}
