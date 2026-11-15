import { type BufferGeometry, Group, Mesh, MeshBasicMaterial, type Scene } from 'three';

import { DEFAULT_LOOK, paletteFor } from '../../../pedro-maker/config/character.config';
import { characterParts } from '../../../pedro-maker/engine/render/models/character-parts';
import { buildBoxesGeometry, type VoxelBox } from '../../../pedro-maker/engine/render/voxel-geometry';
import type { HeroId } from '../../../pedro-maker/models/progress.model';
import { HERO_PHYSICS } from '../../config/craft-physics.config';
import { shadeFaces } from './creatures-view';
import type { DaylightUniform } from './voxel-material';

/** Quanto braços e pernas balançam a cada passo, em radianos. */
const SWING = 0.8;
/** Passos por bloco andado: o balanço acompanha a velocidade. */
const STRIDES_PER_BLOCK = 2.4;
/** Abaixo disto o herói está parado e os membros voltam ao lugar. */
const STILL_SPEED = 0.2;

/**
 * O corpo inteiro de um jogador, como o outro jogador o vê na tela dividida:
 * o herói do Pedro Maker em cubos, da altura do herói do PedroCraft, virado
 * para onde o jogador olha e balançando braços e pernas enquanto anda.
 *
 * Fica numa camada que só a câmera do outro jogador desenha: ninguém vê o
 * próprio corpo por dentro.
 */
export class AvatarView {
  private readonly root = new Group();
  private readonly arms: readonly Group[];
  private readonly legs: readonly Group[];
  private readonly material = new MeshBasicMaterial({ vertexColors: true });
  private readonly geometries: BufferGeometry[] = [];
  private stride = 0;
  private lastX: number | null = null;
  private lastZ = 0;

  constructor(
    scene: Scene,
    heroId: HeroId,
    layer: number,
    private readonly daylight: DaylightUniform,
  ) {
    const parts = characterParts(paletteFor(DEFAULT_LOOK, heroId));
    const whole = [...parts.upperBody, ...parts.leg.map((part) => ({ ...part, y: part.y + parts.hipY }))];
    const lowest = Math.min(...whole.map((part) => part.y - part.height / 2));
    const highest = Math.max(...parts.upperBody.map((part) => part.y + part.height / 2));
    const scale = HERO_PHYSICS.height / (highest - lowest);
    const body = new Group();

    body.add(this.mesh(parts.upperBody));
    this.arms = [-1, 1].map((side) => this.limb(body, parts.arm, side * parts.shoulderX, parts.shoulderY));
    this.legs = [-1, 1].map((side) => this.limb(body, parts.leg, side * parts.hipX, parts.hipY));
    // Os pés do Maker ficam em `lowest`; aqui eles pisam em y = 0.
    body.position.y = -lowest;
    this.root.add(body);
    this.root.scale.setScalar(scale);
    this.root.traverse((object) => object.layers.set(layer));
    scene.add(this.root);
  }

  /** Pés em (x, y, z), olhando para `yaw` (o mesmo ângulo da câmera do jogador). */
  update(x: number, y: number, z: number, yaw: number, frameMs: number): void {
    const seconds = frameMs / 1000;
    const moved = this.lastX === null ? 0 : Math.hypot(x - this.lastX, z - this.lastZ);
    const speed = seconds > 0 ? moved / seconds : 0;

    this.lastX = x;
    this.lastZ = z;
    this.material.color.copy(this.daylight.value);
    this.root.position.set(x, y, z);
    // O herói do Maker olha para +z; a câmera do PedroCraft, para -z.
    this.root.rotation.y = yaw + Math.PI;

    if (speed > STILL_SPEED) {
      this.stride += moved * STRIDES_PER_BLOCK * Math.PI;
    } else {
      this.stride = 0;
    }

    const swing = Math.sin(this.stride) * SWING;

    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing;
    this.arms[1].rotation.x = swing;
  }

  dispose(): void {
    for (const geometry of this.geometries) {
      geometry.dispose();
    }

    this.material.dispose();
    this.root.removeFromParent();
  }

  private limb(body: Group, parts: readonly VoxelBox[], x: number, y: number): Group {
    const pivot = new Group();

    pivot.position.set(x, y, 0);
    pivot.add(this.mesh(parts));
    body.add(pivot);

    return pivot;
  }

  private mesh(parts: readonly VoxelBox[]): Mesh {
    const geometry = buildBoxesGeometry(parts);

    shadeFaces(geometry);
    this.geometries.push(geometry);

    return new Mesh(geometry, this.material);
  }
}
