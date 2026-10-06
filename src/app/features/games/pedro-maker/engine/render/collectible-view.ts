import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  OctahedronGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';

import { context2d, createCanvas } from '../../art/canvas';
import { POWER_UP_LABELS } from '../../config/object-catalog';
import type { PowerUpKind } from '../../models/level.model';
import type { Collectible, CollectibleSystem } from '../simulation/collectibles';
import { disposeTree } from './dispose';
import { backOut } from './easing';
import { box, buildBoxesGeometry, type VoxelBox } from './voxel-geometry';
import type { WorldSpace } from './world-space';

const POP_MS = 260;
const FOUNTAIN_MS = 520;
const FOUNTAIN_POOL = 30;

const POWER_UP_COLORS: Readonly<Record<PowerUpKind, string>> = {
  'super-jump': '#4cc94a',
  shield: '#3fa3f5',
  turbo: '#ffb703',
  magnet: '#ff5a5a',
  wings: '#b39cff',
};

interface Fountain {
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly startedAt: number;
}

/**
 * Moedas, cristais, corações e power-ups em 3D.
 *
 * As moedas são muitas — centenas numa fase longa — e vivem numa malha
 * instanciada só, todas girando juntas. O resto é pouco e ganha peça própria,
 * criada quando o item aparece e descartada quando é pego.
 */
export class CollectibleView {
  readonly root = new Group();

  private readonly coins: InstancedMesh;
  private readonly coinSlots = new Map<number, number>();
  private readonly fountainCoins: InstancedMesh;
  private readonly fountains: Fountain[] = [];
  private readonly others = new Map<number, Object3D>();
  private readonly coinMaterial = new MeshStandardMaterial({
    color: '#ffc629',
    metalness: 0.65,
    roughness: 0.3,
    emissive: '#8a5a00',
    emissiveIntensity: 0.4,
  });
  private readonly crystalMaterial = new MeshStandardMaterial({
    color: '#7fe8ff',
    emissive: '#2fb8ff',
    emissiveIntensity: 0.8,
    roughness: 0.15,
    flatShading: true,
  });
  private readonly voxelMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
  private readonly powerUpTextures = new Map<PowerUpKind, CanvasTexture>();
  private readonly powerUpMaterials = new Map<PowerUpKind, readonly Material[]>();
  /** Itens vistos neste quadro; reaproveitado para não criar lixo 60 vezes por segundo. */
  private readonly present = new Set<number>();

  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3();
  private readonly spinAxis = new Vector3(0, 1, 0);

  constructor(
    private readonly system: CollectibleSystem,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'itens';

    const coinGeometry = new CylinderGeometry(0.3, 0.3, 0.08, 20).rotateX(Math.PI / 2);
    const initialCoins = system.items.filter((item) => item.kind === 'coin');

    this.coins = new InstancedMesh(coinGeometry, this.coinMaterial, Math.max(1, initialCoins.length));
    this.coins.count = initialCoins.length;
    this.coins.castShadow = true;
    this.coins.frustumCulled = false;
    initialCoins.forEach((coin, index) => this.coinSlots.set(coin.id, index));

    this.fountainCoins = new InstancedMesh(coinGeometry.clone(), this.coinMaterial, FOUNTAIN_POOL);
    this.fountainCoins.frustumCulled = false;
    this.fountainCoins.count = 0;

    this.root.add(this.coins, this.fountainCoins);
  }

  /** Moedas que saltam do bloco surpresa e somem no ar. */
  addFountain(x: number, y: number, count: number, now: number): void {
    this.fountains.push({ x, y, count, startedAt: now });
  }

  update(now: number): void {
    const spin = now / 260;
    const bob = Math.sin(now / 350) * 0.05;
    const present = this.present;

    present.clear();
    this.rotation.setFromAxisAngle(this.spinAxis, spin);

    for (const item of this.system.items) {
      present.add(item.id);

      if (item.kind === 'coin') {
        this.placeCoin(item, bob);
      } else {
        this.placeOther(item, now, bob);
      }
    }

    this.hideCollectedCoins(present);
    this.removeCollectedOthers(present);
    this.coins.instanceMatrix.needsUpdate = true;
    this.updateFountains(now);
  }

  dispose(): void {
    disposeTree(this.root);
    this.coinMaterial.dispose();
    this.crystalMaterial.dispose();
    this.voxelMaterial.dispose();

    for (const materials of this.powerUpMaterials.values()) {
      materials.forEach((material) => material.dispose());
    }

    for (const texture of this.powerUpTextures.values()) {
      texture.dispose();
    }
  }

  private placeCoin(item: Collectible, bob: number): void {
    const slot = this.coinSlots.get(item.id);

    if (slot === undefined) {
      return;
    }

    this.position.set(this.space.x(item.x), this.space.y(item.y) + bob, 0);
    this.scale.set(1, 1, 1);
    this.matrix.compose(this.position, this.rotation, this.scale);
    this.coins.setMatrixAt(slot, this.matrix);
  }

  private hideCollectedCoins(present: ReadonlySet<number>): void {
    for (const [id, slot] of this.coinSlots) {
      if (!present.has(id)) {
        this.matrix.makeScale(0, 0, 0);
        this.coins.setMatrixAt(slot, this.matrix);
        this.coinSlots.delete(id);
      }
    }
  }

  private placeOther(item: Collectible, now: number, bob: number): void {
    let model = this.others.get(item.id);

    if (!model) {
      model = this.createModel(item);
      this.others.set(item.id, model);
      this.root.add(model);
    }

    // Saído de um bloco surpresa, o item cresce com um pulinho, como quem salta dele.
    const pop = item.spawnedAt === null ? 1 : backOut((now - item.spawnedAt) / POP_MS);

    model.position.set(this.space.x(item.x), this.space.y(item.y) + bob * 1.4, 0);
    model.rotation.y = item.kind === 'power-up' ? Math.sin(now / 700) * 0.5 : now / 500;
    model.scale.setScalar(pop);
  }

  private removeCollectedOthers(present: ReadonlySet<number>): void {
    for (const [id, model] of this.others) {
      if (!present.has(id)) {
        releaseGeometry(model);
        model.removeFromParent();
        this.others.delete(id);
      }
    }
  }

  private createModel(item: Collectible): Object3D {
    switch (item.kind) {
      case 'crystal': {
        const crystal = new Mesh(new OctahedronGeometry(0.27).scale(1, 1.45, 1), this.crystalMaterial);

        crystal.castShadow = true;

        return crystal;
      }
      case 'heart': {
        const heart = new Mesh(buildBoxesGeometry(heartParts()), this.voxelMaterial);

        heart.castShadow = true;

        return heart;
      }
      case 'power-up':
        return this.powerUpBox(item.powerUp ?? 'super-jump');
      case 'coin':
        return new Group();
    }
  }

  /** Caixa colorida com o emoji do poder na frente: a criança reconhece antes de pegar. */
  private powerUpBox(kind: PowerUpKind): Mesh {
    const mesh = new Mesh(new BoxGeometry(0.62, 0.62, 0.62), [...this.powerUpMaterialsFor(kind)]);

    mesh.castShadow = true;

    return mesh;
  }

  /** Laterais na cor do poder e o emoji na frente e atrás. */
  private powerUpMaterialsFor(kind: PowerUpKind): readonly Material[] {
    const cached = this.powerUpMaterials.get(kind);

    if (cached) {
      return cached;
    }

    const color = POWER_UP_COLORS[kind];
    const side = new MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 });
    const face = new MeshStandardMaterial({ map: this.powerUpTexture(kind), roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.15 });
    const materials: readonly Material[] = [side, side, side, side, face, face];

    this.powerUpMaterials.set(kind, materials);

    return materials;
  }

  private powerUpTexture(kind: PowerUpKind): CanvasTexture {
    const cached = this.powerUpTextures.get(kind);

    if (cached) {
      return cached;
    }

    const canvas = createCanvas(128, 128);
    const context = context2d(canvas);

    context.fillStyle = POWER_UP_COLORS[kind];
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = 'rgba(255, 255, 255, 0.85)';
    context.fillRect(10, 10, 108, 108);
    context.font = '76px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(POWER_UP_LABELS[kind].emoji, 64, 70);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.powerUpTextures.set(kind, texture);

    return texture;
  }

  private updateFountains(now: number): void {
    let slot = 0;

    for (let index = this.fountains.length - 1; index >= 0; index -= 1) {
      const fountain = this.fountains[index];
      const progress = (now - fountain.startedAt) / FOUNTAIN_MS;

      if (progress >= 1) {
        this.fountains.splice(index, 1);
        continue;
      }

      for (let coin = 0; coin < fountain.count && slot < FOUNTAIN_POOL; coin += 1) {
        const spread = (coin - (fountain.count - 1) / 2) * 0.38;
        const rise = Math.sin(progress * Math.PI) * (0.9 + (coin % 2) * 0.35);

        this.position.set(this.space.x(fountain.x) + spread * progress, this.space.y(fountain.y) + rise, 0.2);
        this.scale.setScalar(1 - progress * 0.6);
        this.matrix.compose(this.position, this.rotation, this.scale);
        this.fountainCoins.setMatrixAt(slot, this.matrix);
        slot += 1;
      }
    }

    this.fountainCoins.count = slot;
    this.fountainCoins.instanceMatrix.needsUpdate = true;
  }
}

function heartParts(): readonly VoxelBox[] {
  const red = '#ff4f6d';
  const shine = '#ffc2cc';

  return [
    box(-0.13, 0.08, 0, 0.22, 0.2, 0.16, red),
    box(0.13, 0.08, 0, 0.22, 0.2, 0.16, red),
    box(0, -0.06, 0, 0.44, 0.14, 0.16, red),
    box(0, -0.17, 0, 0.26, 0.1, 0.16, red),
    box(0, -0.25, 0, 0.1, 0.07, 0.16, red),
    box(-0.16, 0.13, 0.085, 0.07, 0.07, 0.01, shine),
  ];
}

/** Geometria própria do item; os materiais são compartilhados e ficam. */
function releaseGeometry(model: Object3D): void {
  model.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
    }
  });
}
