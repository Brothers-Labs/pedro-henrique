import { Group, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';

import { FIREBALL_PHYSICS } from '../../config/physics.config';
import type { FireballSystem } from '../simulation/fireballs';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry } from './voxel-geometry';
import type { WorldSpace } from './world-space';

const SPIN_RATE = 1 / 70;

/**
 * Bolas de fogo em 3D: um cubinho em brasa girando, numa malha instanciada
 * do tamanho do máximo de bolas no ar.
 */
export class FireballView {
  readonly root = new Group();

  private readonly mesh: InstancedMesh;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly spinAxis = new Vector3(0, 0, 1);

  constructor(
    private readonly system: FireballSystem,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'bolas-de-fogo';

    const size = space.length(FIREBALL_PHYSICS.size);
    const geometry = buildBoxesGeometry([
      box(0, 0, 0, size, size, size, '#ff6a1f'),
      box(0, 0, 0, size * 0.6, size * 0.6, size * 1.05, '#ffd23f'),
    ]);
    const material = new MeshStandardMaterial({ vertexColors: true, emissive: '#ff8a1f', emissiveIntensity: 0.9 });

    this.mesh = new InstancedMesh(geometry, material, FIREBALL_PHYSICS.maxAlive);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
  }

  update(now: number, alpha: number): void {
    const fireballs = this.system.fireballs;

    this.rotation.setFromAxisAngle(this.spinAxis, -now * SPIN_RATE);

    fireballs.forEach((fireball, index) => {
      const body = fireball.body;
      const x = body.previousX + (body.x - body.previousX) * alpha + body.width / 2;
      const y = body.previousY + (body.y - body.previousY) * alpha + body.height / 2;

      this.position.set(this.space.x(x), this.space.y(y), 0.2);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(index, this.matrix);
    });

    this.mesh.count = fireballs.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    disposeTree(this.root);
  }
}
