import { Mesh, MeshBasicMaterial, type Scene } from 'three';

import { buildBoxesGeometry } from '../../../pedro-maker/engine/render/voxel-geometry';
import { TRAIN_BOXES } from '../../art/train-model';
import type { TrainRide } from '../simulation/train-ride';
import { shadeFaces } from './creatures-view';
import type { DaylightUniform } from './voxel-material';

/** As rodas ficam apoiadas nos dormentes, um fio acima do bloco do trilho. */
const WHEEL_LIFT = 1 / 16;

/**
 * O trem embaixo do herói enquanto ele passeia.
 *
 * Um modelo só, montado uma vez e escondido a pé. Fica entre a posição do
 * passo anterior e a do atual, como a câmera, para o trem e a vista andarem juntos.
 */
export class TrainView {
  private readonly material = new MeshBasicMaterial({ vertexColors: true });
  private readonly mesh: Mesh;

  constructor(
    scene: Scene,
    private readonly daylight: DaylightUniform,
  ) {
    const geometry = buildBoxesGeometry(TRAIN_BOXES);

    shadeFaces(geometry);
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  update(train: TrainRide | null, alpha: number): void {
    this.mesh.visible = train !== null;

    if (!train) {
      return;
    }

    this.material.color.copy(this.daylight.value);
    this.mesh.position.set(lerp(train.previousX, train.x, alpha), train.y + WHEEL_LIFT, lerp(train.previousZ, train.z, alpha));
    this.mesh.rotation.y = train.yaw;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
