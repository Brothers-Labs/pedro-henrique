import { BoxGeometry, Group, Mesh, MeshBasicMaterial, type PerspectiveCamera, Sprite, SpriteMaterial } from 'three';

import type { ItemTextures } from './item-textures';

/** Onde a mão fica na tela: embaixo, à direita, um pouco à frente dos olhos. */
const REST = { x: 0.42, y: -0.36, z: -0.7 } as const;

const SWING_MS = 260;
const ITEM_SCALE = 0.34;
const SKIN = '#f2c49b';
/** A manga na cor da camiseta do herói escolhido; a mão fica na ponta, na cor da pele. */
const HAND_LENGTH = 0.12;

/**
 * A mão do herói em primeira pessoa, com o item escolhido.
 *
 * Presa à câmera e desenhada por cima de tudo: nunca entra dentro da parede
 * quando o herói encosta nela. Balança ao bater e ao colocar, que é o jeito
 * de a criança sentir que o toque funcionou.
 */
export class HandView {
  private readonly root = new Group();
  private readonly arm: Mesh<BoxGeometry, MeshBasicMaterial>;
  private readonly hand: Mesh<BoxGeometry, MeshBasicMaterial>;
  private readonly item: Sprite;
  private heldItem: string | null = null;
  private swingLeftMs = 0;

  /**
   * `sleeve`: a cor da camiseta do herói do jogador. `layer`: a camada que só a
   * câmera dele desenha — na tela dividida, um não vê a mão do outro flutuando.
   */
  constructor(
    camera: PerspectiveCamera,
    private readonly textures: ItemTextures,
    sleeve: string = SKIN,
    layer = 0,
  ) {
    this.arm = new Mesh(new BoxGeometry(0.13, 0.13, 0.42 - HAND_LENGTH), new MeshBasicMaterial({ color: sleeve, depthTest: false }));
    this.arm.position.set(0.06, -0.08, 0.12 + HAND_LENGTH / 2);
    this.arm.renderOrder = 10;
    this.hand = new Mesh(new BoxGeometry(0.12, 0.12, HAND_LENGTH), new MeshBasicMaterial({ color: SKIN, depthTest: false }));
    this.hand.position.set(0.06, -0.08, 0.12 - (0.42 - HAND_LENGTH) / 2);
    this.hand.renderOrder = 10;

    this.item = new Sprite(new SpriteMaterial({ depthTest: false, alphaTest: 0.5 }));
    this.item.scale.setScalar(ITEM_SCALE);
    this.item.renderOrder = 11;
    this.item.visible = false;

    this.root.add(this.arm, this.hand, this.item);
    this.root.position.set(REST.x, REST.y, REST.z);
    this.root.traverse((object) => object.layers.set(layer));
    camera.add(this.root);
  }

  swing(): void {
    this.swingLeftMs = SWING_MS;
  }

  /** `isBusy`: quebrando um bloco, a mão segue balançando até o botão soltar. */
  update(heldItem: string | null, isBusy: boolean, frameMs: number): void {
    if (heldItem !== this.heldItem) {
      this.heldItem = heldItem;
      this.item.visible = heldItem !== null;

      if (heldItem) {
        this.item.material.map = this.textures.texture(heldItem);
        this.item.material.needsUpdate = true;
      }
    }

    if (isBusy && this.swingLeftMs <= 0) {
      this.swing();
    }

    this.swingLeftMs = Math.max(0, this.swingLeftMs - frameMs);

    const phase = Math.sin((1 - this.swingLeftMs / SWING_MS) * Math.PI);
    const swing = this.swingLeftMs > 0 ? phase : 0;

    this.root.position.set(REST.x - swing * 0.08, REST.y + swing * 0.06, REST.z - swing * 0.12);
    this.root.rotation.set(-swing * 0.7, 0, swing * 0.2);
  }

  dispose(): void {
    this.arm.geometry.dispose();
    this.arm.material.dispose();
    this.hand.geometry.dispose();
    this.hand.material.dispose();
    this.item.material.dispose();
    this.root.removeFromParent();
  }
}
