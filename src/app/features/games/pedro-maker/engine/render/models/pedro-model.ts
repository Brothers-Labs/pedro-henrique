import { Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';

import { darken, lighten } from '../../../art/canvas';
import type { CharacterPalette } from '../../../config/character.config';
import { BIG_PEDRO_SCALE } from '../../../config/physics.config';
import type { PlayerMode } from '../../simulation/player';
import { disposeTree } from '../dispose';
import { box, buildBoxesGeometry, type VoxelBox } from '../voxel-geometry';

const SKIN = '#f2c29b';
const HAIR = '#5a3a22';
const JEANS = '#3b5bdb';
const SHOE = '#2a2350';
const EYE = '#2a2350';

const HIP_Y = 0.42;
const SHOULDER_Y = 0.84;

/** Quanto o Pedro vira para a câmera ao olhar para os lados: dá para ver o rosto. */
const TURN_TOWARD_CAMERA = 0.5;
const TURN_RATE = 14;

/** Rapidez com que o Pedro cresce ou encolhe: dá para ver acontecendo. */
const GROW_RATE = 8;
const STAR_GLOW = 0.65;
const FIRE_GLOW = 0.22;
const FIRE_COLOR = '#ff5a1f';

/** Estado do Pedro que o modelo precisa para se mexer. */
export interface PedroPose {
  readonly mode: PlayerMode;
  readonly facing: 1 | -1;
  readonly speedX: number;
  readonly isGrounded: boolean;
  readonly isBlinking: boolean;
  readonly hasShield: boolean;
  readonly hasWings: boolean;
  readonly isBig: boolean;
  readonly hasStar: boolean;
  readonly hasFireFlower: boolean;
}

/**
 * O Pedro de cubos.
 *
 * Cinco peças que se mexem — tronco com cabeça, dois braços e duas pernas —,
 * cada uma uma malha só. A animação é feita em código: pernas e braços
 * balançam no ritmo da corrida, o corpo estica no pulo e amassa no pouso, e
 * ele gira de um lado para o outro em vez de "espelhar" como um desenho.
 */
export class PedroModel {
  readonly root = new Group();

  private readonly body = new Group();
  private readonly leftArm: Group;
  private readonly rightArm: Group;
  private readonly leftLeg: Group;
  private readonly rightLeg: Group;
  private readonly shield: Mesh;
  private readonly wings: Group;
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });

  private heading = Math.PI / 2 - TURN_TOWARD_CAMERA;
  private size = 1;
  private stride = 0;
  private squash = 0;
  private wasGrounded = true;
  private previousMode: PlayerMode = 'IDLE';

  constructor(palette: CharacterPalette) {
    this.root.name = 'pedro';
    this.body.add(this.mesh(pedroUpperBody(palette)));
    this.leftArm = this.limb(pedroArm(palette.shirt), -0.33, SHOULDER_Y);
    this.rightArm = this.limb(pedroArm(palette.shirt), 0.33, SHOULDER_Y);
    this.leftLeg = this.limb(pedroLeg(), -0.12, HIP_Y);
    this.rightLeg = this.limb(pedroLeg(), 0.12, HIP_Y);
    this.wings = this.buildWings();
    this.body.add(this.leftArm, this.rightArm, this.leftLeg, this.rightLeg, this.wings);

    this.shield = new Mesh(
      new SphereGeometry(0.95, 20, 14),
      new MeshStandardMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.28, emissive: '#3fb8ff', emissiveIntensity: 0.6, depthWrite: false }),
    );
    this.shield.position.y = 0.72;
    this.root.add(this.body, this.shield);
  }

  /** Pose do quadro. `deltaSeconds` é o tempo desde o último desenho. */
  update(pose: PedroPose, deltaSeconds: number, now: number): void {
    this.root.visible = !pose.isBlinking;
    this.shield.visible = pose.hasShield;
    this.wings.visible = pose.hasWings;
    this.shield.rotation.y = now / 600;

    this.turn(pose, deltaSeconds);
    this.grow(pose, deltaSeconds);
    this.glow(pose, now);
    this.reactToGround(pose);
    this.animateLimbs(pose, deltaSeconds, now);
    this.applySquash(deltaSeconds);

    this.previousMode = pose.mode;
  }

  /** Viagem de vitória para dentro do portal: encolhe girando. */
  celebrate(progress: number): void {
    const eased = progress * progress * progress;

    this.body.rotation.set(0, eased * Math.PI * 2, 0);
    this.root.scale.setScalar(1 - eased * 0.8);
    this.leftArm.rotation.set(0, 0, -2.6);
    this.rightArm.rotation.set(0, 0, 2.6);
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
  }

  private turn(pose: PedroPose, deltaSeconds: number): void {
    const facesCamera = pose.mode === 'DEAD' || pose.mode === 'WIN';
    const target = facesCamera ? 0 : pose.facing * (Math.PI / 2 - TURN_TOWARD_CAMERA);
    const blend = 1 - Math.exp(-TURN_RATE * deltaSeconds);

    this.heading = MathUtils.lerp(this.heading, target, blend);
    this.body.rotation.y = this.heading;
  }

  private grow(pose: PedroPose, deltaSeconds: number): void {
    const target = pose.isBig ? BIG_PEDRO_SCALE : 1;

    this.size = MathUtils.lerp(this.size, target, 1 - Math.exp(-GROW_RATE * deltaSeconds));
    this.root.scale.setScalar(this.size);
  }

  /** Estrela: o Pedro pisca em todas as cores. Flor de fogo: um brilho quente. */
  private glow(pose: PedroPose, now: number): void {
    const emissive = this.material.emissive;

    if (pose.hasStar) {
      emissive.setHSL((now / 400) % 1, 1, 0.5);
      this.material.emissiveIntensity = STAR_GLOW;
    } else if (pose.hasFireFlower) {
      emissive.set(FIRE_COLOR);
      this.material.emissiveIntensity = FIRE_GLOW;
    } else {
      this.material.emissiveIntensity = 0;
    }
  }

  /** Esticar ao sair do chão e amassar ao pousar: o peso do personagem. */
  private reactToGround(pose: PedroPose): void {
    if (this.wasGrounded && !pose.isGrounded && pose.mode === 'JUMP') {
      this.squash = -0.18;
    } else if (!this.wasGrounded && pose.isGrounded && (this.previousMode === 'FALL' || this.previousMode === 'JUMP')) {
      this.squash = 0.22;
    }

    this.wasGrounded = pose.isGrounded;
  }

  private applySquash(deltaSeconds: number): void {
    this.squash = MathUtils.lerp(this.squash, 0, 1 - Math.exp(-12 * deltaSeconds));
    this.body.scale.set(1 + this.squash * 0.6, 1 - this.squash, 1 + this.squash * 0.6);
  }

  private animateLimbs(pose: PedroPose, deltaSeconds: number, now: number): void {
    const arms = [this.leftArm, this.rightArm] as const;
    const legs = [this.leftLeg, this.rightLeg] as const;

    for (const limb of [...arms, ...legs]) {
      limb.rotation.set(0, 0, 0);
    }

    this.body.position.y = 0;
    this.body.rotation.z = 0;
    this.body.rotation.x = 0;

    switch (pose.mode) {
      case 'RUN': {
        this.stride += deltaSeconds * (6 + Math.abs(pose.speedX) / 28);
        const swing = Math.sin(this.stride);

        legs[0].rotation.x = swing * 0.85;
        legs[1].rotation.x = -swing * 0.85;
        arms[0].rotation.x = -swing * 0.75;
        arms[1].rotation.x = swing * 0.75;
        this.body.position.y = Math.abs(Math.cos(this.stride)) * 0.05;
        this.body.rotation.x = Math.min(0.18, Math.abs(pose.speedX) / 2600);
        return;
      }
      case 'JUMP':
        legs[0].rotation.x = -0.7;
        legs[1].rotation.x = 0.35;
        arms[0].rotation.x = -2.7;
        arms[1].rotation.x = 0.5;
        return;
      case 'FALL':
        legs[0].rotation.x = -0.25;
        legs[1].rotation.x = 0.25;
        arms[0].rotation.z = -1.1;
        arms[1].rotation.z = 1.1;
        return;
      case 'HIT':
        this.body.rotation.x = -0.35;
        arms[0].rotation.z = -1.8;
        arms[1].rotation.z = 1.8;
        return;
      case 'DEAD':
        this.body.rotation.z = Math.sin(now / 90) * 0.12;
        arms[0].rotation.z = -0.5;
        arms[1].rotation.z = 0.5;
        return;
      case 'WIN':
        return;
      case 'IDLE': {
        const breath = Math.sin(now / 420);

        this.body.position.y = breath * 0.012;
        arms[0].rotation.z = -0.06 - breath * 0.03;
        arms[1].rotation.z = 0.06 + breath * 0.03;
        return;
      }
    }
  }

  private limb(parts: readonly VoxelBox[], x: number, pivotY: number): Group {
    const pivot = new Group();

    pivot.position.set(x, pivotY, 0);
    pivot.add(this.mesh(parts));

    return pivot;
  }

  private mesh(parts: readonly VoxelBox[]): Mesh {
    const mesh = new Mesh(buildBoxesGeometry(parts), this.material);

    mesh.castShadow = true;

    return mesh;
  }

  private buildWings(): Group {
    const wings = new Group();
    const feather = '#ffffff';
    const tip = '#d9f1ff';

    for (const side of [-1, 1] as const) {
      const wing = this.mesh([
        box(side * 0.28, 0, 0, 0.5, 0.26, 0.05, feather),
        box(side * 0.5, 0.1, 0, 0.26, 0.18, 0.05, tip),
      ]);

      wing.position.set(side * 0.08, 0.78, -0.26);
      wing.rotation.y = side * -0.5;
      wings.add(wing);
    }

    wings.visible = false;

    return wings;
  }
}

/** Tronco, cabeça, boné e mochila: também é o piloto sentado do Pedro Kart. */
export function pedroUpperBody(palette: CharacterPalette): readonly VoxelBox[] {
  const cap = palette.cap;
  const parts: VoxelBox[] = [
    // Tronco e cinto.
    box(0, 0.64, 0, 0.52, 0.44, 0.3, palette.shirt),
    box(0, 0.44, 0, 0.53, 0.06, 0.31, darken(palette.shirt, 0.35)),
    box(0, 0.76, 0.152, 0.18, 0.1, 0.01, lighten(palette.shirt, 0.3)),
    // Cabeça, cabelo e rosto.
    box(0, 1.08, 0, 0.46, 0.44, 0.42, SKIN),
    box(0, 1.2, -0.1, 0.48, 0.24, 0.26, HAIR),
    box(-0.235, 1.06, -0.02, 0.03, 0.26, 0.3, HAIR),
    box(0.235, 1.06, -0.02, 0.03, 0.26, 0.3, HAIR),
    box(-0.1, 1.09, 0.215, 0.08, 0.1, 0.02, EYE),
    box(0.1, 1.09, 0.215, 0.08, 0.1, 0.02, EYE),
    box(-0.08, 1.115, 0.226, 0.03, 0.03, 0.01, '#ffffff'),
    box(0.12, 1.115, 0.226, 0.03, 0.03, 0.01, '#ffffff'),
    box(0, 0.97, 0.215, 0.12, 0.04, 0.02, '#c9605a'),
    box(-0.17, 1.0, 0.212, 0.07, 0.04, 0.01, '#f59a9a'),
    box(0.17, 1.0, 0.212, 0.07, 0.04, 0.01, '#f59a9a'),
    // Boné com aba para a frente.
    box(0, 1.36, 0, 0.5, 0.14, 0.46, cap),
    box(0, 1.3, 0.3, 0.46, 0.05, 0.2, darken(cap, 0.15)),
    box(0, 1.44, 0, 0.08, 0.03, 0.08, lighten(cap, 0.35)),
  ];

  return [...parts, ...backpack(palette)];
}

function backpack(palette: CharacterPalette): readonly VoxelBox[] {
  const color = palette.backpack;

  switch (palette.backpackStyle) {
    case 'none':
      return [];
    case 'dino':
      return [
        box(0, 0.66, -0.24, 0.38, 0.42, 0.18, color),
        box(0, 0.9, -0.3, 0.08, 0.08, 0.08, darken(color, 0.25)),
        box(0, 0.76, -0.35, 0.08, 0.08, 0.08, darken(color, 0.25)),
        box(0, 0.6, -0.35, 0.08, 0.08, 0.08, darken(color, 0.25)),
      ];
    case 'rocket':
      return [
        box(-0.1, 0.68, -0.25, 0.14, 0.44, 0.16, color),
        box(0.1, 0.68, -0.25, 0.14, 0.44, 0.16, color),
        box(-0.1, 0.42, -0.25, 0.1, 0.08, 0.1, '#ff8a3d'),
        box(0.1, 0.42, -0.25, 0.1, 0.08, 0.1, '#ff8a3d'),
      ];
    case 'star':
      return [
        box(0, 0.66, -0.24, 0.36, 0.4, 0.16, color),
        box(0, 0.68, -0.33, 0.16, 0.16, 0.02, '#fff3bf'),
      ];
  }
}

export function pedroArm(shirt: string): readonly VoxelBox[] {
  return [box(0, -0.12, 0, 0.14, 0.26, 0.16, shirt), box(0, -0.32, 0, 0.13, 0.16, 0.14, SKIN)];
}

function pedroLeg(): readonly VoxelBox[] {
  return [box(0, -0.19, 0, 0.18, 0.38, 0.2, JEANS), box(0, -0.38, 0.03, 0.2, 0.08, 0.27, SHOE)];
}
