import { Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';

import { TILE_SIZE } from '../../config/physics.config';
import { FIRE_BAR, type FireBarSystem } from '../simulation/fire-bars';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry } from './voxel-geometry';
import type { WorldSpace } from './world-space';

const SPIN_RATE = 1 / 90;
/** O desenho da bola é um pouco maior que a área que machuca: o toque fica justo para a criança. */
const BALL_DRAWN_DIAMETER = FIRE_BAR.ballRadius * 2.6;

/**
 * Bastões de fogo em 3D: o bloco de pedra queimada com um parafuso no meio e
 * as bolas de fogo girando em volta dele, numa malha instanciada só.
 */
export class FireBarView {
  readonly root = new Group();

  private readonly balls: InstancedMesh | null = null;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly spinAxis = new Vector3(0, 0, 1);

  constructor(
    private readonly system: FireBarSystem,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'bastoes-de-fogo';

    const total = system.bars.reduce((sum, bar) => sum + bar.length, 0);

    if (total === 0) {
      return;
    }

    const tile = space.length(TILE_SIZE);
    const anchorGeometry = buildBoxesGeometry([
      box(0, 0, 0, tile, tile, tile, '#7a4a2a'),
      box(0, 0, tile * 0.5, tile * 0.86, tile * 0.86, 0.01, '#9c6236'),
      box(0, 0, tile * 0.51, tile * 0.24, tile * 0.24, 0.02, '#3a2416'),
    ]);
    const anchorMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });

    for (const bar of system.bars) {
      const anchor = new Mesh(anchorGeometry, anchorMaterial);

      anchor.position.set(space.x(bar.x), space.y(bar.y), 0);
      anchor.castShadow = true;
      anchor.receiveShadow = true;
      this.root.add(anchor);
    }

    const size = space.length(BALL_DRAWN_DIAMETER);
    const ballGeometry = buildBoxesGeometry([
      box(0, 0, 0, size, size, size, '#ff6a1f'),
      box(0, 0, 0, size * 0.6, size * 0.6, size * 1.05, '#ffd23f'),
    ]);
    const ballMaterial = new MeshStandardMaterial({ vertexColors: true, emissive: '#ff8a1f', emissiveIntensity: 0.9 });

    this.balls = new InstancedMesh(ballGeometry, ballMaterial, total);
    this.balls.frustumCulled = false;
    this.root.add(this.balls);
  }

  update(now: number): void {
    const balls = this.balls;

    if (!balls) {
      return;
    }

    this.rotation.setFromAxisAngle(this.spinAxis, -now * SPIN_RATE);
    balls.count = 0;

    for (const bar of this.system.bars) {
      for (const ball of this.system.ballsOf(bar, now)) {
        // Um pouco à frente do bloco, para as bolas nunca sumirem dentro dele.
        this.position.set(this.space.x(ball.x), this.space.y(ball.y), 0.6);
        this.matrix.compose(this.position, this.rotation, this.scale);
        balls.setMatrixAt(balls.count, this.matrix);
        balls.count += 1;
      }
    }

    balls.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    disposeTree(this.root);
  }
}
