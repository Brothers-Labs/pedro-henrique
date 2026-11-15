import { Group, Mesh, MeshStandardMaterial } from 'three';

import { TILE_SIZE } from '../../config/physics.config';
import type { PSwitchSystem } from '../simulation/p-switch';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry, type VoxelBox } from './voxel-geometry';
import type { WorldSpace } from './world-space';

/** Quanto o botão amassa: fica uma lasquinha no chão. */
const PRESSED_HEIGHT = 0.28;
/** Tempo da amassada, para o aperto ser visto e não só acontecer. */
const PRESS_MS = 160;
/** Com o efeito valendo, o botão amassado pisca no ritmo do relógio. */
const BLINK_PERIOD_MS = 260;

const BLUE = '#2f7de1';
const LIGHT_BLUE = '#79b8ff';
const WHITE = '#ffffff';

/** A letra P em pixels de 5 por 7, de cima para baixo. */
const LETTER_P = ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'];

/** Botão P de cubos: base escura, corpo azul com tampa clara e a letra branca na frente. Os pés ficam em y = 0. */
function buttonParts(): readonly VoxelBox[] {
  const pixel = 0.06;
  const letter: VoxelBox[] = [];

  LETTER_P.forEach((row, line) => {
    [...row].forEach((cell, column) => {
      if (cell === '1') {
        letter.push(box((column - 2) * pixel, 0.5 - line * pixel, 0.29, pixel, pixel, 0.02, WHITE));
      }
    });
  });

  return [
    box(0, 0.05, 0, 0.86, 0.1, 0.62, '#1d3f73'),
    box(0, 0.36, 0, 0.7, 0.52, 0.56, BLUE),
    box(0, 0.66, 0, 0.6, 0.08, 0.48, LIGHT_BLUE),
    box(-0.24, 0.42, 0.285, 0.06, 0.3, 0.01, LIGHT_BLUE),
    ...letter,
  ];
}

/**
 * Os botões P em 3D. Apertado, o botão amassa e fica no chão; enquanto o
 * efeito vale, ele pisca devagar para lembrar de onde veio a troca.
 */
export class PSwitchView {
  readonly root = new Group();

  private readonly models = new Map<number, Group>();
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });

  constructor(
    private readonly system: PSwitchSystem,
    space: WorldSpace,
  ) {
    this.root.name = 'botoes-p';

    if (system.buttons.length === 0) {
      return;
    }

    const geometry = buildBoxesGeometry(buttonParts());

    for (const button of system.buttons) {
      const group = new Group();
      const mesh = new Mesh(geometry, this.material);

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      group.position.set(space.x((button.cellX + 0.5) * TILE_SIZE), space.y((button.cellY + 1) * TILE_SIZE), 0);
      this.root.add(group);
      this.models.set(button.id, group);
    }
  }

  update(now: number): void {
    const isActive = this.system.isActive;

    for (const button of this.system.buttons) {
      const group = this.models.get(button.id);

      if (!group) {
        continue;
      }

      const press = button.isPressed ? Math.min(1, (now - button.pressedAt) / PRESS_MS) : 0;
      const height = 1 - press * (1 - PRESSED_HEIGHT);
      const blink = isActive && button.isPressed ? 1 + Math.abs(Math.sin(now / BLINK_PERIOD_MS)) * 0.06 : 1;

      group.scale.set(blink * (1 + press * 0.12), height, blink);
    }
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
  }
}
