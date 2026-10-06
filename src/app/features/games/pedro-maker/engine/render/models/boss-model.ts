import { Color, Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';

import { darken, lighten } from '../../../art/canvas';
import type { BossDefinition } from '../../../models/level.model';
import { BOSS_DEFEAT_MS, type BossMode } from '../../simulation/boss';
import { disposeTree } from '../dispose';
import { box, buildBoxesGeometry, type VoxelBox } from '../voxel-geometry';

const PUPIL = '#2a2350';

export interface BossPose {
  readonly mode: BossMode;
  readonly modeStartedAt: number;
  readonly direction: 1 | -1;
  readonly isGrounded: boolean;
}

/**
 * O chefão de cubos, com o visual do mundo dele.
 *
 * Os olhos contam a história da luta: abertos quando ele ataca, em espiral
 * quando cansa — a hora do pisão. Treme antes de investir, pisca vermelho ao
 * levar o pisão e gira sumindo quando é derrotado.
 */
export class BossModel {
  readonly root = new Group();

  private readonly body = new Group();
  private readonly awakeEyes: Mesh;
  private readonly tiredEyes: Mesh;
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: new Color('#000000') });
  private readonly glowMaterial: MeshStandardMaterial;
  private heading = -Math.PI / 2 + 0.45;
  private squash = 0;
  private wasGrounded = true;

  constructor(definition: BossDefinition) {
    this.root.name = 'chefao';
    this.glowMaterial = new MeshStandardMaterial({
      vertexColors: true,
      emissive: new Color(definition.accent),
      emissiveIntensity: definition.look === 'magma' || definition.look === 'comet' ? 1.4 : 0.25,
    });

    this.body.add(this.mesh(bodyParts(definition), this.material), this.mesh(decorations(definition), this.glowMaterial));
    this.awakeEyes = this.mesh(awakeEyes(FACE_Z[definition.look]), this.material);
    this.tiredEyes = this.mesh(tiredEyes(FACE_Z[definition.look]), this.material);
    this.body.add(this.awakeEyes, this.tiredEyes);
    this.root.add(this.body);
  }

  update(pose: BossPose, deltaSeconds: number, now: number): void {
    const facesCamera = pose.mode === 'waiting' || pose.mode === 'defeated';
    const target = facesCamera ? 0 : pose.direction * (Math.PI / 2 - 0.45);

    this.heading = MathUtils.lerp(this.heading, target, 1 - Math.exp(-6 * deltaSeconds));
    this.body.rotation.set(0, this.heading, 0);
    this.body.position.set(0, 0, 0);

    const isTired = pose.mode === 'tired' || pose.mode === 'hurt';
    this.awakeEyes.visible = !isTired;
    this.tiredEyes.visible = isTired;

    const elapsed = now - pose.modeStartedAt;
    const hurtFlash = pose.mode === 'hurt' && Math.floor(elapsed / 90) % 2 === 0;
    this.material.emissive.set(hurtFlash ? '#ff2a2a' : '#000000');

    if (!this.wasGrounded && pose.isGrounded) {
      this.squash = 0.3;
    }

    this.wasGrounded = pose.isGrounded;
    this.squash = MathUtils.lerp(this.squash, 0, 1 - Math.exp(-8 * deltaSeconds));

    switch (pose.mode) {
      case 'windup':
        // Tremidinha antes da investida: o aviso de que ele vai correr.
        this.body.position.x = Math.sin(now / 25) * 0.05;
        this.squash = 0.12;
        break;
      case 'summon':
        this.squash = 0.18 * Math.sin(Math.min(1, elapsed / 300) * Math.PI);
        break;
      case 'waiting':
      case 'idle':
        this.body.position.y = Math.abs(Math.sin(now / 380)) * 0.05;
        break;
      case 'defeated': {
        const progress = Math.min(1, elapsed / BOSS_DEFEAT_MS);

        this.body.rotation.y = progress * Math.PI * 4;
        this.root.scale.setScalar(Math.max(0.05, 1 - progress * progress));
        return;
      }
      default:
        break;
    }

    this.root.scale.setScalar(1);
    this.body.scale.set(1 + this.squash * 0.5, 1 - this.squash, 1 + this.squash * 0.5);
  }

  dispose(): void {
    disposeTree(this.root);
  }

  private mesh(parts: readonly VoxelBox[], material: MeshStandardMaterial): Mesh {
    const mesh = new Mesh(buildBoxesGeometry(parts), material);

    mesh.castShadow = true;

    return mesh;
  }
}

/** Corpo em camadas, mais largo embaixo: parece pesado e fofo ao mesmo tempo. */
function bodyParts(definition: BossDefinition): readonly VoxelBox[] {
  const color = definition.color;
  const light = lighten(color, 0.18);
  const dark = darken(color, 0.2);

  switch (definition.look) {
    case 'cactus':
      return [
        box(0, 0.9, 0, 1.3, 1.8, 1.1, color),
        box(0, 1.95, 0, 1.0, 0.3, 0.9, light),
        box(-0.95, 1.1, 0, 0.5, 0.36, 0.5, color),
        box(-1.1, 1.45, 0, 0.36, 0.7, 0.4, color),
        box(0.95, 0.9, 0, 0.5, 0.36, 0.5, color),
        box(1.1, 1.2, 0, 0.36, 0.6, 0.4, color),
        box(0, 0.1, 0, 1.5, 0.2, 1.3, dark),
      ];
    case 'ice':
      return [
        box(0, 0.8, 0, 2.2, 1.6, 1.6, color),
        box(0, 1.75, 0, 1.6, 0.3, 1.2, light),
        box(0, 0.08, 0, 2.3, 0.16, 1.7, dark),
      ];
    case 'comet':
      return [
        box(0, 0.9, 0, 1.9, 1.5, 1.5, color),
        box(0, 1.8, 0, 1.3, 0.35, 1.1, light),
        box(0, 0.12, 0, 1.4, 0.24, 1.1, dark),
      ];
    case 'magma':
    case 'slime':
      return [
        box(0, 0.45, 0, 2.6, 0.9, 1.9, color),
        box(0, 1.15, 0, 2.1, 0.5, 1.6, color),
        box(0, 1.55, 0, 1.4, 0.3, 1.1, light),
        box(0.6, 1.0, 0.8, 0.3, 0.2, 0.2, light),
      ];
  }
}

/** Detalhes na cor de destaque: coroa, espinhos, rachaduras que brilham, cauda. */
function decorations(definition: BossDefinition): readonly VoxelBox[] {
  const accent = definition.accent;

  switch (definition.look) {
    case 'slime':
      return [
        box(0, 1.85, 0, 0.9, 0.2, 0.7, accent),
        ...[-0.35, 0, 0.35].map((x) => box(x, 2.05, 0, 0.18, 0.24, 0.18, accent)),
      ];
    case 'cactus':
      return [-0.4, 0, 0.4].flatMap((x) => [box(x, 1.2, 0.56, 0.08, 0.08, 0.08, accent), box(x, 0.6, 0.56, 0.08, 0.08, 0.08, accent)]);
    case 'ice':
      return [-0.7, 0, 0.7].map((x, index) => box(x, 2.0 + (index % 2) * 0.25, 0, 0.3, 0.5 + (index % 2) * 0.3, 0.3, accent));
    case 'magma':
      return [
        box(-0.7, 0.5, 0.96, 0.5, 0.08, 0.02, accent),
        box(0.5, 0.75, 0.96, 0.6, 0.08, 0.02, accent),
        box(0.1, 0.3, 0.96, 0.08, 0.3, 0.02, accent),
        box(0, 1.8, 0, 0.4, 0.2, 0.4, accent),
      ];
    case 'comet':
      return [
        box(-1.3, 1.2, -0.2, 0.8, 0.8, 0.8, accent),
        box(-2.0, 1.4, -0.3, 0.6, 0.5, 0.5, lighten(accent, 0.2)),
        box(-2.6, 1.55, -0.4, 0.4, 0.3, 0.3, lighten(accent, 0.4)),
      ];
  }
}

/** Frente do corpo na altura dos olhos, por formato: o rosto fica colado nela. */
const FACE_Z: Readonly<Record<BossDefinition['look'], number>> = {
  slime: 0.8,
  magma: 0.8,
  ice: 0.8,
  comet: 0.75,
  cactus: 0.55,
};

function awakeEyes(face: number): readonly VoxelBox[] {
  const spread = face < 0.7 ? 0.3 : 0.42;

  return [
    box(-spread, 1.2, face + 0.02, 0.3, 0.4, 0.03, '#ffffff'),
    box(spread, 1.2, face + 0.02, 0.3, 0.4, 0.03, '#ffffff'),
    box(-spread + 0.06, 1.14, face + 0.04, 0.15, 0.22, 0.02, PUPIL),
    box(spread + 0.06, 1.14, face + 0.04, 0.15, 0.22, 0.02, PUPIL),
    // Sobrancelhas bravas.
    box(-spread, 1.46, face + 0.03, 0.36, 0.07, 0.03, PUPIL),
    box(spread, 1.46, face + 0.03, 0.36, 0.07, 0.03, PUPIL),
  ];
}

/** Olhos de "tonto": um X em cada lado, o sinal para pisar. */
function tiredEyes(face: number): readonly VoxelBox[] {
  const spread = face < 0.7 ? 0.3 : 0.42;

  return [-spread, spread].flatMap((x) => [
    box(x, 1.2, face + 0.03, 0.34, 0.08, 0.03, PUPIL),
    box(x, 1.2, face + 0.03, 0.08, 0.34, 0.03, PUPIL),
    box(x, 1.2, face + 0.02, 0.3, 0.3, 0.02, '#ffffff'),
  ]);
}
