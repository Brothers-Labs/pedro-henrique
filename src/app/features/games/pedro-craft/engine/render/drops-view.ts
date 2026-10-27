import { Group, type Scene, Sprite, SpriteMaterial } from 'three';

import type { ItemDrop } from '../simulation/item-drops';
import type { ItemTextures } from './item-textures';

const DROP_SCALE = 0.36;
const BOB_HEIGHT = 0.08;
const BOB_SPEED = 0.004;

interface DropSprite {
  readonly sprite: Sprite;
  item: string;
}

/**
 * Itens caídos no chão: um ícone que flutua e balança de leve.
 *
 * Sempre de frente para a câmera (sprite): o ícone da barra é reconhecido de
 * qualquer ângulo, sem precisar de um modelo 3D por item.
 */
export class DropsView {
  private readonly root = new Group();
  private readonly sprites = new Map<number, DropSprite>();

  constructor(
    scene: Scene,
    private readonly textures: ItemTextures,
  ) {
    scene.add(this.root);
  }

  update(drops: readonly ItemDrop[]): void {
    const alive = new Set<number>();

    for (const drop of drops) {
      alive.add(drop.id);

      const view = this.sprites.get(drop.id) ?? this.create(drop);

      if (view.item !== drop.stack.item) {
        view.sprite.material.map = this.textures.texture(drop.stack.item);
        view.item = drop.stack.item;
      }

      const bob = Math.sin(drop.ageMs * BOB_SPEED + drop.id) * BOB_HEIGHT;

      view.sprite.position.set(drop.body.x, drop.body.y + DROP_SCALE / 2 + BOB_HEIGHT + bob, drop.body.z);
    }

    for (const [id, view] of this.sprites) {
      if (!alive.has(id)) {
        view.sprite.material.dispose();
        view.sprite.removeFromParent();
        this.sprites.delete(id);
      }
    }
  }

  dispose(): void {
    for (const view of this.sprites.values()) {
      view.sprite.material.dispose();
    }

    this.sprites.clear();
    this.root.removeFromParent();
  }

  private create(drop: ItemDrop): DropSprite {
    const sprite = new Sprite(new SpriteMaterial({ map: this.textures.texture(drop.stack.item), alphaTest: 0.5 }));
    const view = { sprite, item: drop.stack.item };

    sprite.scale.setScalar(DROP_SCALE);
    this.root.add(sprite);
    this.sprites.set(drop.id, view);

    return view;
  }
}
