import { InstancedMesh, type Material, Mesh, type Object3D, Points } from 'three';

/**
 * Tira um pedaço da cena e devolve à placa de vídeo o que ele ocupava.
 *
 * Geometrias e materiais são liberados; texturas não, porque são
 * compartilhadas entre várias peças e têm dono próprio (o atlas, o céu).
 */
export function disposeTree(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof Points)) {
      return;
    }

    object.geometry.dispose();

    const materials: readonly Material[] = Array.isArray(object.material) ? object.material : [object.material];

    for (const material of materials) {
      material.dispose();
    }

    if (object instanceof InstancedMesh) {
      object.dispose();
    }
  });

  root.removeFromParent();
}
