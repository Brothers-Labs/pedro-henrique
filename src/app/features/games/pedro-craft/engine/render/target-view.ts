import { BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, type Scene } from 'three';

import type { RayHit } from '../simulation/raycast';

/** Quanto a rachadura escurece o bloco no fim da quebra. */
const MAX_CRACK_OPACITY = 0.55;

/**
 * Contorno do bloco mirado e a sombra que cresce enquanto ele quebra.
 *
 * O contorno diz "é este bloco"; a sombra diz "falta pouco". As duas coisas
 * respondem ao dedo na hora, sem esperar o bloco sumir.
 */
export class TargetView {
  private readonly outline: LineSegments<EdgesGeometry, LineBasicMaterial>;
  private readonly crack: Mesh<BoxGeometry, MeshBasicMaterial>;

  constructor(scene: Scene) {
    const edges = new EdgesGeometry(new BoxGeometry(1.004, 1.004, 1.004));

    this.outline = new LineSegments(edges, new LineBasicMaterial({ color: '#1b1730', transparent: true, opacity: 0.7 }));
    this.crack = new Mesh(
      new BoxGeometry(1.008, 1.008, 1.008),
      new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthWrite: false }),
    );
    this.outline.visible = false;
    this.crack.visible = false;
    scene.add(this.outline, this.crack);
  }

  update(target: RayHit | null, progress: number): void {
    this.outline.visible = target !== null;
    this.crack.visible = target !== null && progress > 0;

    if (!target) {
      return;
    }

    this.outline.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    this.crack.position.copy(this.outline.position);
    this.crack.material.opacity = progress * MAX_CRACK_OPACITY;
  }

  dispose(): void {
    this.outline.geometry.dispose();
    this.outline.material.dispose();
    this.crack.geometry.dispose();
    this.crack.material.dispose();
    this.outline.removeFromParent();
    this.crack.removeFromParent();
  }
}
