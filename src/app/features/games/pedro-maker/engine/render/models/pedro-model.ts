import { Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';

import type { CharacterPalette } from '../../../config/character.config';
import { BIG_PEDRO_SCALE } from '../../../config/physics.config';
import type { PlayerMode } from '../../simulation/player';
import { disposeTree } from '../dispose';
import { box, buildBoxesGeometry, type VoxelBox } from '../voxel-geometry';
import { characterParts } from './character-parts';

/** Quanto o Pedro vira para a câmera ao olhar para os lados: dá para ver o rosto. */
const TURN_TOWARD_CAMERA = 0.5;
const TURN_RATE = 14;

/** Rapidez com que o Pedro cresce ou encolhe: dá para ver acontecendo. */
const GROW_RATE = 8;
const STAR_GLOW = 0.65;
const FLOWER_GLOW = 0.22;
const FIRE_COLOR = '#ff5a1f';
const ICE_COLOR = '#3fb8ff';

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
  readonly hasIceFlower: boolean;
}

/**
 * O herói de cubos — o Pedro ou o Gui, conforme a escolha da criança.
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
    const parts = characterParts(palette);

    this.root.name = palette.hero;
    this.body.add(this.mesh(parts.upperBody));
    this.leftArm = this.limb(parts.arm, -parts.shoulderX, parts.shoulderY);
    this.rightArm = this.limb(parts.arm, parts.shoulderX, parts.shoulderY);
    this.leftLeg = this.limb(parts.leg, -parts.hipX, parts.hipY);
    this.rightLeg = this.limb(parts.leg, parts.hipX, parts.hipY);
    this.wings = this.buildWings(parts.shoulderY);
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

  /** Estrela: o Pedro pisca em todas as cores. Flor de fogo: um brilho quente; de gelo, um frio. */
  private glow(pose: PedroPose, now: number): void {
    const emissive = this.material.emissive;

    if (pose.hasStar) {
      emissive.setHSL((now / 400) % 1, 1, 0.5);
      this.material.emissiveIntensity = STAR_GLOW;
    } else if (pose.hasFireFlower || pose.hasIceFlower) {
      emissive.set(pose.hasFireFlower ? FIRE_COLOR : ICE_COLOR);
      this.material.emissiveIntensity = FLOWER_GLOW;
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
      case 'SLIDE':
        // Sentado na rampa, pernas esticadas para a frente e braços para cima: "uhuu!".
        this.body.position.y = -0.28;
        this.body.rotation.x = -0.2;
        legs[0].rotation.x = -1.45;
        legs[1].rotation.x = -1.45;
        arms[0].rotation.x = -2.6;
        arms[1].rotation.x = -2.6;
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

  /** As asas nascem nas costas, logo abaixo dos ombros de cada herói. */
  private buildWings(shoulderY: number): Group {
    const wings = new Group();
    const feather = '#ffffff';
    const tip = '#d9f1ff';

    for (const side of [-1, 1] as const) {
      const wing = this.mesh([
        box(side * 0.28, 0, 0, 0.5, 0.26, 0.05, feather),
        box(side * 0.5, 0.1, 0, 0.26, 0.18, 0.05, tip),
      ]);

      wing.position.set(side * 0.08, shoulderY - 0.06, -0.26);
      wing.rotation.y = side * -0.5;
      wings.add(wing);
    }

    wings.visible = false;

    return wings;
  }
}
