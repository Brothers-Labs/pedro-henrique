import { Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';

import { darken, lighten } from '../../pedro-maker/art/canvas';
import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import { disposeTree } from '../../pedro-maker/engine/render/dispose';
import { pedroArm, pedroUpperBody } from '../../pedro-maker/engine/render/models/pedro-model';
import { box, buildBoxesGeometry, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { KartBodyId } from '../models/kart.model';

const TIRE = '#22222b';
const HUB = '#c9ced8';
const SEAT = '#34343f';
const FLAME = '#ff8a3d';

const WHEEL_X = 1.02;
const FRONT_WHEEL_Z = 1.05;
const REAR_WHEEL_Z = -1.0;
const MAX_WHEEL_TURN = 0.45;
const SHOULDER_Y = 0.84;
/** O piloto senta mais baixo que em pé: as pernas ficam escondidas dentro do kart. */
const DRIVER_SEAT_Y = 0.22;
const DRIVER_SEAT_Z = -0.45;

/** O que o modelo precisa saber do kart para se mexer. */
export interface KartPose {
  readonly speed: number;
  readonly steer: number;
  readonly isBoosting: boolean;
  readonly hasStar: boolean;
}

/**
 * Um kart de cubos com o piloto sentado.
 *
 * O piloto é o mesmo Pedro do Pedro Maker, com o boné, a camiseta e a
 * mochila que ele escolheu lá: é o personagem dele que corre aqui.
 */
export class KartModel {
  readonly root = new Group();

  private readonly chassis = new Group();
  private readonly driver = new Group();
  private readonly frontWheels: readonly Group[];
  private readonly wheels: Mesh[] = [];
  private readonly flames: Mesh;
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 });
  private readonly bodyColor: string;
  private wheelSpin = 0;
  private lean = 0;

  constructor(body: KartBodyId, color: string, driverPalette: CharacterPalette) {
    this.bodyColor = color;
    this.root.name = `kart-${body}`;
    this.chassis.add(this.mesh(chassisParts(color)), this.mesh(bodyParts(body, color)));

    const isBig = body === 'buggy';
    const wheelParts = wheel(isBig ? 1.0 : 0.8);
    const frontLeft = this.wheelPivot(wheelParts, -WHEEL_X, FRONT_WHEEL_Z);
    const frontRight = this.wheelPivot(wheelParts, WHEEL_X, FRONT_WHEEL_Z);
    const rearLeft = this.wheelPivot(wheelParts, -WHEEL_X, REAR_WHEEL_Z);
    const rearRight = this.wheelPivot(wheelParts, WHEEL_X, REAR_WHEEL_Z);

    this.frontWheels = [frontLeft, frontRight];
    this.chassis.add(frontLeft, frontRight, rearLeft, rearRight);

    this.buildDriver(driverPalette);
    this.flames = this.mesh([box(-0.35, 0.6, -1.75, 0.3, 0.3, 0.5, FLAME), box(0.35, 0.6, -1.75, 0.3, 0.3, 0.5, FLAME)]);
    this.flames.visible = false;
    this.chassis.add(this.driver, this.flames);
    this.root.add(this.chassis);
  }

  update(pose: KartPose, deltaSeconds: number, now: number): void {
    this.wheelSpin += pose.speed * deltaSeconds * 1.6;

    for (const wheelMesh of this.wheels) {
      wheelMesh.rotation.x = this.wheelSpin;
    }

    for (const pivot of this.frontWheels) {
      pivot.rotation.y = -pose.steer * MAX_WHEEL_TURN;
    }

    // O kart e o piloto tombam um pouco para fora da curva, como num kart de verdade.
    const targetLean = pose.steer * Math.min(1, Math.abs(pose.speed) / 20) * 0.12;
    this.lean = MathUtils.lerp(this.lean, targetLean, 1 - Math.exp(-8 * deltaSeconds));
    this.chassis.rotation.z = this.lean;
    this.driver.rotation.y = -pose.steer * 0.25;

    this.flames.visible = pose.isBoosting;
    this.flames.scale.z = 0.8 + Math.abs(Math.sin(now / 40)) * 0.6;
    this.chassis.position.y = pose.isBoosting ? Math.abs(Math.sin(now / 50)) * 0.05 : 0;

    this.material.emissive.set(pose.hasStar ? starGlow(now) : '#000000');
    this.material.emissiveIntensity = pose.hasStar ? 0.6 : 0;
  }

  /** Cor de base do kart, usada no minimapa e nas faíscas. */
  get color(): string {
    return this.bodyColor;
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
  }

  private buildDriver(palette: CharacterPalette): void {
    this.driver.position.set(0, DRIVER_SEAT_Y, DRIVER_SEAT_Z);
    this.driver.add(this.mesh(pedroUpperBody(palette)));

    // Os dois braços esticados para a frente, segurando o volante.
    for (const side of [-1, 1] as const) {
      const arm = new Group();

      arm.position.set(side * 0.33, SHOULDER_Y, 0);
      arm.rotation.set(-1.15, 0, side * -0.18);
      arm.add(this.mesh(pedroArm(palette.shirt)));
      this.driver.add(arm);
    }
  }

  private wheelPivot(parts: readonly VoxelBox[], x: number, z: number): Group {
    const pivot = new Group();
    const wheelMesh = this.mesh(parts);

    pivot.position.set(x, parts[0].height / 2, z);
    pivot.add(wheelMesh);
    this.wheels.push(wheelMesh);

    return pivot;
  }

  private mesh(parts: readonly VoxelBox[]): Mesh {
    const mesh = new Mesh(buildBoxesGeometry(parts), this.material);

    mesh.castShadow = true;

    return mesh;
  }
}

function starGlow(now: number): string {
  const colors = ['#ff4f9a', '#ffc629', '#3ccf7a', '#3fa9f5', '#7b52d3'];

  return colors[Math.floor(now / 90) % colors.length];
}

function wheel(size: number): readonly VoxelBox[] {
  return [box(0, 0, 0, 0.45, size, size, TIRE), box(0, 0, 0, 0.47, size * 0.4, size * 0.4, HUB)];
}

function chassisParts(color: string): readonly VoxelBox[] {
  const trim = darken(color, 0.35);

  return [
    box(0, 0.32, 0, 1.7, 0.22, 2.9, trim),
    box(0, 0.75, DRIVER_SEAT_Z - 0.25, 0.9, 0.7, 0.18, SEAT),
    // Volante e coluna de direção.
    box(0, 0.95, 0.42, 0.5, 0.4, 0.08, SEAT),
    box(0, 0.78, 0.6, 0.08, 0.08, 0.4, SEAT),
  ];
}

function bodyParts(body: KartBodyId, color: string): readonly VoxelBox[] {
  const light = lighten(color, 0.3);
  const dark = darken(color, 0.25);

  switch (body) {
    case 'classico':
      return [
        box(-0.62, 0.6, 0.1, 0.36, 0.4, 2.2, color),
        box(0.62, 0.6, 0.1, 0.36, 0.4, 2.2, color),
        box(0, 0.58, 1.3, 1.5, 0.34, 0.6, color),
        box(0, 0.62, 1.62, 1.1, 0.22, 0.12, light),
        box(0, 1.12, -1.38, 1.9, 0.12, 0.42, dark),
        box(-0.7, 0.85, -1.38, 0.1, 0.45, 0.1, dark),
        box(0.7, 0.85, -1.38, 0.1, 0.45, 0.1, dark),
      ];
    case 'foguete':
      return [
        box(0, 0.6, 0.2, 1.4, 0.42, 2.4, color),
        box(0, 0.58, 1.55, 1.0, 0.34, 0.5, color),
        box(0, 0.56, 1.95, 0.55, 0.24, 0.4, light),
        box(-0.82, 0.62, -1.0, 0.42, 0.42, 1.3, dark),
        box(0.82, 0.62, -1.0, 0.42, 0.42, 1.3, dark),
        box(0, 1.25, -1.2, 0.12, 0.7, 0.6, light),
      ];
    case 'buggy':
      return [
        box(0, 0.62, 0.4, 1.5, 0.36, 1.8, color),
        box(0, 0.7, -1.2, 1.4, 0.4, 0.6, dark),
        // Santantônio: o arco de proteção atrás do piloto.
        box(-0.6, 1.4, -0.9, 0.12, 1.1, 0.12, SEAT),
        box(0.6, 1.4, -0.9, 0.12, 1.1, 0.12, SEAT),
        box(0, 1.95, -0.9, 1.32, 0.12, 0.12, SEAT),
        box(0, 0.7, 1.4, 1.2, 0.2, 0.3, light),
      ];
    case 'dino':
      return [
        box(0, 0.62, 0.0, 1.5, 0.42, 2.3, color),
        // Cabeça do dinossauro na frente, com olhos e dentes.
        box(0, 0.9, 1.45, 1.1, 0.7, 0.8, color),
        box(-0.3, 1.12, 1.86, 0.18, 0.18, 0.04, '#ffffff'),
        box(0.3, 1.12, 1.86, 0.18, 0.18, 0.04, '#ffffff'),
        box(-0.3, 1.1, 1.89, 0.08, 0.1, 0.02, '#2a2350'),
        box(0.3, 1.1, 1.89, 0.08, 0.1, 0.02, '#2a2350'),
        box(0, 0.7, 1.86, 0.8, 0.08, 0.04, '#ffffff'),
        // Espinhos nas costas e o rabo.
        box(0, 1.05, -0.3, 0.2, 0.3, 0.3, light),
        box(0, 1.0, -0.95, 0.2, 0.25, 0.3, light),
        box(0, 0.7, -1.7, 0.5, 0.3, 0.7, dark),
      ];
  }
}
