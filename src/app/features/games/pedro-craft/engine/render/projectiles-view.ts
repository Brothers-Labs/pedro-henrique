import { BoxGeometry, Group, Mesh, MeshBasicMaterial, type Scene, Vector3 } from 'three';

import type { Projectile } from '../simulation/projectiles';

const SHAFT_COLOR = '#8a5a32';
const SHAFT_LENGTH = 0.5;
const SHAFT_THICKNESS = 0.05;

/**
 * As flechas no ar: um palito apontado para onde a flecha vai.
 *
 * Uma geometria e um material para todas; cada flecha é só uma posição e uma
 * direção, entre o passo anterior e o atual.
 */
export class ProjectilesView {
  private readonly root = new Group();
  private readonly geometry = new BoxGeometry(SHAFT_THICKNESS, SHAFT_THICKNESS, SHAFT_LENGTH);
  private readonly material = new MeshBasicMaterial({ color: SHAFT_COLOR });
  private readonly meshes = new Map<number, Mesh>();
  private readonly ahead = new Vector3();

  constructor(scene: Scene) {
    scene.add(this.root);
  }

  update(projectiles: readonly Projectile[], alpha: number): void {
    const alive = new Set<number>();

    for (const projectile of projectiles) {
      alive.add(projectile.id);

      const mesh = this.meshes.get(projectile.id) ?? this.create(projectile.id);

      mesh.position.set(
        lerp(projectile.previousX, projectile.x, alpha),
        lerp(projectile.previousY, projectile.y, alpha),
        lerp(projectile.previousZ, projectile.z, alpha),
      );
      mesh.lookAt(this.ahead.copy(mesh.position).add({ x: projectile.velocityX, y: projectile.velocityY, z: projectile.velocityZ }));
    }

    for (const [id, mesh] of this.meshes) {
      if (!alive.has(id)) {
        mesh.removeFromParent();
        this.meshes.delete(id);
      }
    }
  }

  dispose(): void {
    this.meshes.clear();
    this.geometry.dispose();
    this.material.dispose();
    this.root.removeFromParent();
  }

  private create(id: number): Mesh {
    const mesh = new Mesh(this.geometry, this.material);

    this.root.add(mesh);
    this.meshes.set(id, mesh);

    return mesh;
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
