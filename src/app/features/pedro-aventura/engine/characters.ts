import {
  type BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { CosmeticPalette } from '../models/economy.model';
import { disposeGeometries, type MaterialLibrary } from './materials';
import { crownTexture } from './textures';

const SKIN = '#c58b62';
const SKIN_SHADE = '#a8704c';
const HAIR = '#1b120d';
const LIPS = '#8a4a3c';
const IRIS = '#3b2416';

export type CharacterPose = 'idle' | 'run' | 'jump' | 'slide' | 'attack' | 'victory' | 'defeat' | 'sit';

/** Peça com sombra, já posicionada. */
function part(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(geometry, material);

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/** Caixa de cantos arredondados: tecido e sola não têm quina viva. */
function rounded(width: number, height: number, depth: number, radius: number): RoundedBoxGeometry {
  return new RoundedBoxGeometry(width, height, depth, 3, radius);
}

/** Cápsula em pé com comprimento total `length` (as pontas incluídas). */
function capsule(radius: number, length: number): CapsuleGeometry {
  return new CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 6, 12);
}

/** Junta com o pivô no ponto de articulação: girar o grupo gira o membro inteiro. */
function joint(x: number, y: number, z: number, ...children: Mesh[]): Group {
  const group = new Group();

  group.position.set(x, y, z);
  group.add(...children);

  return group;
}

/**
 * O Pedro em 3D: moletom da coroa, calça jogger, tênis e um rosto de verdade —
 * olhos com íris e brilho, sobrancelhas, nariz, boca, barba e cabelo com
 * topete.
 *
 * Tudo é geometria feita em código, sem modelo de terceiros: a roupa troca
 * só mudando a paleta do cosmético. As juntas (quadril, joelho, ombro,
 * cotovelo, pescoço) são grupos, e a animação só gira esses grupos.
 */
export class PedroRig {
  readonly root = new Group();

  private readonly body = new Group();
  private readonly torso: Group;
  private readonly head: Group;
  private readonly armLeft: Group;
  private readonly armRight: Group;
  private readonly forearmLeft: Group;
  private readonly forearmRight: Group;
  private readonly legLeft: Group;
  private readonly legRight: Group;
  private readonly shinLeft: Group;
  private readonly shinRight: Group;
  private readonly emblem: CanvasTexture;
  private readonly emblemMaterial: MeshStandardMaterial;
  /** Materiais só do rosto (olhos, boca): são do boneco, não da biblioteca. */
  private readonly faceMaterials: MeshStandardMaterial[] = [];

  constructor(materials: MaterialLibrary, palette: CosmeticPalette) {
    const hoodie = materials.standard(palette.primary, { roughness: 0.9 });
    const trim = materials.standard(palette.secondary, { roughness: 0.85 });
    const accent = materials.standard(palette.accent, { metalness: 0.75, roughness: 0.3, emissive: palette.accent, emissiveIntensity: 0.12 });
    const skin = materials.standard(SKIN, { roughness: 0.55 });
    const skinShade = materials.standard(SKIN_SHADE, { roughness: 0.6 });
    const hair = materials.standard(HAIR, { roughness: 0.95 });
    const pants = materials.standard('#16161c', { roughness: 0.92 });
    const sneaker = materials.standard('#f2f2f2', { roughness: 0.5 });
    const sole = materials.standard('#2a2a2a', { roughness: 0.8 });

    this.emblem = crownTexture(palette.accent);
    this.emblemMaterial = new MeshStandardMaterial({ map: this.emblem, transparent: true, emissive: palette.accent, emissiveIntensity: 0.2 });

    this.shinLeft = this.buildShin(pants, sneaker, sole, accent);
    this.shinRight = this.buildShin(pants, sneaker, sole, accent);
    this.legLeft = joint(-0.12, 0.95, 0, part(capsule(0.105, 0.5), pants, 0, -0.22, 0));
    this.legRight = joint(0.12, 0.95, 0, part(capsule(0.105, 0.5), pants, 0, -0.22, 0));
    this.legLeft.add(this.shinLeft);
    this.legRight.add(this.shinRight);

    this.forearmLeft = this.buildForearm(hoodie, skin, accent, true);
    this.forearmRight = this.buildForearm(hoodie, skin, accent, false);
    this.armLeft = joint(-0.33, 0.52, 0, part(new SphereGeometry(0.11, 16, 12), hoodie), part(capsule(0.085, 0.36), hoodie, 0, -0.16, 0));
    this.armRight = joint(0.33, 0.52, 0, part(new SphereGeometry(0.11, 16, 12), hoodie), part(capsule(0.085, 0.36), hoodie, 0, -0.16, 0));
    this.armLeft.add(this.forearmLeft);
    this.armRight.add(this.forearmRight);

    this.head = this.buildHead(skin, skinShade, hair);

    const emblem = new Mesh(new PlaneGeometry(0.24, 0.24), this.emblemMaterial);
    emblem.position.set(0, 0.36, 0.158);

    const chain = part(new TorusGeometry(0.1, 0.012, 8, 24), accent, 0, 0.5, 0.13);
    chain.rotation.x = Math.PI / 2.3;

    this.torso = joint(
      0,
      0.95,
      0,
      // Moletom: tronco arredondado, barra mais justa e capuz caído nas costas.
      part(rounded(0.56, 0.62, 0.3, 0.1), hoodie, 0, 0.3, 0),
      part(rounded(0.54, 0.1, 0.29, 0.045), trim, 0, 0.02, 0),
      part(rounded(0.42, 0.2, 0.16, 0.08), trim, 0, 0.55, -0.13),
      part(new CylinderGeometry(0.008, 0.008, 0.16, 6), accent, -0.06, 0.48, 0.152),
      part(new CylinderGeometry(0.008, 0.008, 0.16, 6), accent, 0.06, 0.48, 0.152),
      emblem,
      chain,
    );
    this.torso.add(this.armLeft, this.armRight, this.head);

    this.body.add(this.torso, this.legLeft, this.legRight);
    this.root.add(this.body);
  }

  /**
   * Põe o Pedro numa pose no instante `time` (segundos).
   *
   * `cadence` é a velocidade da passada; `motion` em zero congela os balanços
   * finos (respiração, olhar em volta) para quem pediu menos movimento.
   */
  pose(pose: CharacterPose, time: number, cadence = 1, motion = 1): void {
    this.resetPose();

    switch (pose) {
      case 'run':
        this.poseRun(time * cadence);
        return;
      case 'jump':
        this.legLeft.rotation.x = -0.9;
        this.shinLeft.rotation.x = 1.2;
        this.legRight.rotation.x = -0.4;
        this.shinRight.rotation.x = 0.8;
        this.armLeft.rotation.x = -2.4;
        this.armRight.rotation.x = -2.2;
        return;
      case 'slide':
        this.body.position.y = -0.48;
        this.torso.rotation.x = -0.95;
        this.legLeft.rotation.x = -1.35;
        this.legRight.rotation.x = -1.2;
        this.armLeft.rotation.x = -0.6;
        this.armRight.rotation.x = -0.6;
        return;
      case 'attack':
        this.poseRun(time * cadence);
        this.armRight.rotation.x = -1.55;
        this.forearmRight.rotation.x = 0;
        this.torso.rotation.y = -0.35;
        return;
      case 'victory':
        this.armLeft.rotation.z = 2.6 + Math.sin(time * 8) * 0.25 * motion;
        this.armRight.rotation.z = -2.6 - Math.sin(time * 8) * 0.25 * motion;
        this.body.position.y = Math.abs(Math.sin(time * 4)) * 0.18 * motion;
        return;
      case 'defeat':
        this.head.rotation.x = 0.5;
        this.torso.rotation.x = 0.25;
        this.armLeft.rotation.z = 0.15;
        this.armRight.rotation.z = -0.15;
        return;
      case 'idle':
      case 'sit':
        // Pose de capa de revista: mão no bolso, peso numa perna, olhar em volta.
        this.torso.scale.y = 1 + Math.sin(time * 2) * 0.01 * motion;
        this.head.rotation.y = Math.sin(time * 0.6) * 0.3 * motion;
        this.head.rotation.x = -0.04;
        this.armLeft.rotation.z = 0.1;
        this.armRight.rotation.z = -0.22;
        this.armRight.rotation.x = 0.12;
        this.forearmRight.rotation.x = -0.35;
        this.legLeft.rotation.z = -0.04;
        this.legRight.rotation.z = 0.06;
        return;
    }
  }

  dispose(): void {
    this.emblem.dispose();
    this.emblemMaterial.dispose();

    for (const material of this.faceMaterials) {
      material.dispose();
    }

    disposeGeometries(this.root);
  }

  private buildShin(pants: Material, sneaker: Material, sole: Material, accent: Material): Group {
    return joint(
      0,
      -0.45,
      0,
      part(capsule(0.09, 0.46), pants, 0, -0.2, 0),
      // Tênis: cabedal arredondado, sola escura e o detalhe da cor do cosmético.
      part(rounded(0.18, 0.12, 0.32, 0.055), sneaker, 0, -0.43, 0.05),
      part(rounded(0.19, 0.04, 0.34, 0.018), sole, 0, -0.48, 0.05),
      part(rounded(0.186, 0.03, 0.12, 0.012), accent, 0, -0.41, -0.02),
    );
  }

  private buildForearm(sleeve: Material, skin: Material, accent: Material, hasWatch: boolean): Group {
    const pieces = [
      part(capsule(0.078, 0.32), sleeve, 0, -0.15, 0),
      part(new SphereGeometry(0.062, 14, 10).scale(0.85, 1.15, 0.7), skin, 0, -0.35, 0.01),
    ];

    if (hasWatch) {
      const watch = part(new TorusGeometry(0.068, 0.016, 8, 18), accent, 0, -0.29, 0);

      watch.rotation.x = Math.PI / 2;
      pieces.push(watch);
    }

    return joint(0, -0.32, 0, ...pieces);
  }

  /**
   * Cabeça com rosto: crânio levemente oval, orelhas, olhos com íris e brilho,
   * sobrancelhas, nariz, boca, bigode e barba cheia, cabelo com fade e topete.
   */
  private buildHead(skin: Material, skinShade: Material, hair: Material): Group {
    const white = new MeshStandardMaterial({ color: '#f7f4ef', roughness: 0.25 });
    const iris = new MeshStandardMaterial({ color: IRIS, roughness: 0.2 });
    const shine = new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6 });
    const lips = new MeshStandardMaterial({ color: LIPS, roughness: 0.5 });

    this.faceMaterials.push(white, iris, shine, lips);

    const skull = part(new SphereGeometry(0.17, 28, 22).scale(0.94, 1.1, 1), skin, 0, 0.26, 0);
    const face: Mesh[] = [
      part(new CylinderGeometry(0.066, 0.075, 0.14, 14), skin, 0, 0.05, 0),
      skull,
      // Orelhas.
      part(new SphereGeometry(0.042, 12, 10).scale(0.45, 1, 0.75), skin, -0.158, 0.25, -0.005),
      part(new SphereGeometry(0.042, 12, 10).scale(0.45, 1, 0.75), skin, 0.158, 0.25, -0.005),
      // Cabelo: calota com fade nas laterais e o topete na frente.
      part(new SphereGeometry(0.178, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.4).scale(0.95, 1.12, 1.02), hair, 0, 0.268, -0.004),
      part(new SphereGeometry(0.176, 24, 14, Math.PI, Math.PI, 0, Math.PI * 0.62).scale(0.96, 1.1, 1.02), hair, 0, 0.26, 0),
      part(new SphereGeometry(0.11, 18, 12).scale(1.05, 0.48, 0.9), hair, 0, 0.445, 0.05),
      // Barba cheia contornando o queixo, com bigode.
      part(new SphereGeometry(0.176, 28, 14, 0, Math.PI, Math.PI * 0.56, Math.PI * 0.36).scale(0.96, 1.1, 1.03), hair, 0, 0.255, 0),
      part(capsule(0.016, 0.1).rotateZ(Math.PI / 2), hair, 0, 0.198, 0.162),
      // Boca e nariz.
      part(capsule(0.011, 0.06).rotateZ(Math.PI / 2), lips, 0, 0.178, 0.168),
      part(new SphereGeometry(0.026, 14, 10).scale(0.85, 1, 1.15), skinShade, 0, 0.235, 0.178),
      part(new SphereGeometry(0.02, 12, 8), skinShade, 0, 0.222, 0.19),
    ];

    for (const side of [-1, 1]) {
      const x = side * 0.058;

      face.push(
        part(new SphereGeometry(0.024, 14, 10).scale(1, 0.75, 0.6), white, x, 0.275, 0.152),
        part(new SphereGeometry(0.013, 12, 8), iris, x, 0.275, 0.165),
        part(new SphereGeometry(0.004, 6, 4), shine, x + 0.005, 0.28, 0.177),
        // Sobrancelha grossa, levemente arqueada.
        part(capsule(0.009, 0.06).rotateZ(Math.PI / 2 + side * 0.15), hair, x, 0.312, 0.157),
      );
    }

    return joint(0, 0.62, 0, ...face);
  }

  private poseRun(phase: number): void {
    const swing = Math.sin(phase);

    this.body.position.y = Math.abs(Math.cos(phase)) * 0.07;
    this.torso.rotation.x = 0.18;
    this.legLeft.rotation.x = swing * 0.9;
    this.legRight.rotation.x = -swing * 0.9;
    this.shinLeft.rotation.x = Math.max(0, -swing) * 1.3 + 0.2;
    this.shinRight.rotation.x = Math.max(0, swing) * 1.3 + 0.2;
    this.armLeft.rotation.x = -swing * 0.9;
    this.armRight.rotation.x = swing * 0.9;
    this.forearmLeft.rotation.x = -1.1;
    this.forearmRight.rotation.x = -1.1;
  }

  private resetPose(): void {
    for (const joint of [this.body, this.torso, this.head, this.armLeft, this.armRight, this.forearmLeft, this.forearmRight, this.legLeft, this.legRight, this.shinLeft, this.shinRight]) {
      joint.rotation.set(0, 0, 0);
    }

    this.body.position.y = 0;
    this.torso.scale.y = 1;
  }
}

/**
 * O Rex, um dobermann de coleira dourada: corpo atlético, focinho comprido,
 * orelhas em pé e as marcas cor de canela no focinho, no peito e nas patas.
 *
 * Os visuais "de óculos" e "gold" ganham os óculos escuros do mock.
 */
export class DogRig {
  readonly root = new Group();

  private readonly body: Group;
  private readonly head: Group;
  private readonly tail: Group;
  private readonly legs: readonly Group[];
  private readonly eyeMaterial = new MeshStandardMaterial({ color: '#1a0f08', roughness: 0.15 });

  constructor(materials: MaterialLibrary, palette: CosmeticPalette, hasSunglasses: boolean) {
    const coat = materials.standard(palette.primary, { roughness: 0.4, metalness: 0.2 });
    const tan = materials.standard(palette.secondary, { roughness: 0.6 });
    const collar = materials.standard(palette.accent, { metalness: 0.85, roughness: 0.25, emissive: palette.accent, emissiveIntensity: 0.15 });
    const nose = materials.standard('#0a0a0a', { roughness: 0.25 });

    const leg = (x: number, z: number): Group =>
      joint(x, 0.5, z, part(capsule(0.045, 0.36), coat, 0, -0.17, 0), part(new SphereGeometry(0.05, 12, 8).scale(1, 0.6, 1.3), tan, 0, -0.38, 0.015));

    this.legs = [leg(-0.1, 0.26), leg(0.1, 0.26), leg(-0.1, -0.24), leg(0.1, -0.24)];

    const ear = (x: number): Mesh => {
      const mesh = part(new ConeGeometry(0.04, 0.17, 12), coat, x, 0.16, -0.03);

      mesh.rotation.z = -x * 1.8;

      return mesh;
    };

    const headParts: Mesh[] = [
      part(new SphereGeometry(0.105, 20, 14).scale(0.95, 0.9, 1.1), coat, 0, 0.06, 0),
      part(capsule(0.052, 0.2).rotateX(Math.PI / 2), coat, 0, 0.025, 0.13),
      part(new SphereGeometry(0.05, 14, 10).scale(1.1, 0.7, 1.4), tan, 0, -0.005, 0.15),
      part(new SphereGeometry(0.024, 10, 8), nose, 0, 0.035, 0.235),
      part(new SphereGeometry(0.018, 10, 8), tan, -0.045, 0.105, 0.075),
      part(new SphereGeometry(0.018, 10, 8), tan, 0.045, 0.105, 0.075),
      part(new SphereGeometry(0.016, 10, 8), this.eyeMaterial, -0.045, 0.085, 0.09),
      part(new SphereGeometry(0.016, 10, 8), this.eyeMaterial, 0.045, 0.085, 0.09),
      ear(-0.06),
      ear(0.06),
    ];

    if (hasSunglasses) {
      headParts.push(part(rounded(0.2, 0.045, 0.03, 0.012), materials.standard('#050507', { metalness: 0.6, roughness: 0.1 }), 0, 0.09, 0.1));
    }

    this.head = joint(0, 0.84, 0.36, ...headParts);

    const collarRing = part(new TorusGeometry(0.085, 0.018, 8, 20), collar, 0, 0.74, 0.3);
    collarRing.rotation.x = Math.PI / 2.6;

    this.tail = joint(0, 0.66, -0.36, part(capsule(0.022, 0.24), coat, 0, 0.1, 0));
    this.tail.rotation.x = -0.6;

    this.body = joint(
      0,
      0,
      0,
      part(capsule(0.14, 0.72).rotateX(Math.PI / 2), coat, 0, 0.6, 0),
      part(new SphereGeometry(0.13, 18, 12).scale(1, 1.05, 1.1), coat, 0, 0.64, 0.24),
      part(new SphereGeometry(0.09, 14, 10).scale(1, 0.9, 0.6), tan, 0, 0.6, 0.33),
      part(capsule(0.075, 0.28).rotateX(-0.6), coat, 0, 0.76, 0.32),
      collarRing,
    );
    this.body.add(this.head, this.tail, ...this.legs);
    this.root.add(this.body);
  }

  pose(pose: CharacterPose, time: number, cadence = 1, motion = 1): void {
    const [frontLeft, frontRight, backLeft, backRight] = this.legs;

    for (const piece of [this.body, ...this.legs, this.head]) {
      piece.rotation.set(0, 0, 0);
    }

    this.body.position.y = 0;
    this.tail.rotation.set(-0.6, Math.sin(time * 12) * 0.5 * motion, 0);

    switch (pose) {
      case 'run':
      case 'attack':
      case 'jump': {
        const phase = time * cadence * 1.4;
        const gallop = Math.sin(phase);

        frontLeft.rotation.x = gallop * 0.9;
        frontRight.rotation.x = gallop * 0.75;
        backLeft.rotation.x = -gallop * 0.9;
        backRight.rotation.x = -gallop * 0.75;
        this.body.rotation.x = gallop * 0.08;
        this.body.position.y = Math.max(0, Math.cos(phase)) * 0.08;
        return;
      }
      case 'sit':
      case 'slide':
        // Sentado: traseiro no chão, patas da frente esticadas, peito alto.
        this.body.rotation.x = -0.55;
        this.body.position.y = -0.12;
        backLeft.rotation.x = -1.2;
        backRight.rotation.x = -1.2;
        frontLeft.rotation.x = 0.5;
        frontRight.rotation.x = 0.5;
        this.head.rotation.x = 0.45 + Math.sin(time * 1.5) * 0.05 * motion;
        return;
      case 'victory':
        this.body.position.y = Math.abs(Math.sin(time * 6)) * 0.2 * motion;
        return;
      case 'idle':
      case 'defeat':
        this.head.rotation.y = Math.sin(time * 0.8) * 0.25 * motion;
        return;
    }
  }

  dispose(): void {
    this.eyeMaterial.dispose();
    disposeGeometries(this.root);
  }
}

/** Rodas: pneu, aro metálico e calota. */
function wheel(radius: number, width: number, tire: Material, rim: Material): Group {
  const group = new Group();
  const tireMesh = part(new CylinderGeometry(radius, radius, width, 22).rotateZ(Math.PI / 2), tire);
  const rimMesh = part(new CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 18).rotateZ(Math.PI / 2), rim);

  group.add(tireMesh, rimMesh);

  return group;
}

/** Veículos do lobby e os carros da pista: SUV, esportivo e moto, de linhas arredondadas. */
export function buildVehicle(materials: MaterialLibrary, shape: 'suv' | 'sport' | 'moto', palette: CosmeticPalette): Group {
  const paint = materials.standard(palette.primary, { metalness: 0.8, roughness: 0.22 });
  const detail = materials.standard(palette.secondary, { metalness: 0.6, roughness: 0.35 });
  const glass = materials.standard('#0b1220', { metalness: 0.7, roughness: 0.08 });
  const tire = materials.standard('#0b0b0b', { roughness: 0.9 });
  const rim = materials.standard('#c9ced6', { metalness: 0.9, roughness: 0.2 });
  const light = materials.neon(palette.accent, 1.6);
  const tailLight = materials.neon('#ff2a2a', 1.3);
  const group = new Group();

  if (shape === 'moto') {
    group.add(
      part(rounded(0.3, 0.32, 1.45, 0.12), paint, 0, 0.66, 0),
      part(rounded(0.34, 0.16, 0.6, 0.07), detail, 0, 0.88, -0.22),
      part(new SphereGeometry(0.07, 12, 10), light, 0, 0.8, 0.76),
    );

    for (const z of [-0.65, 0.65]) {
      group.add(wheel(0.34, 0.14, tire, rim).translateY(0.34).translateZ(z));
    }

    return group;
  }

  const isSport = shape === 'sport';
  const bodyHeight = isSport ? 0.5 : 0.85;
  const bodyY = isSport ? 0.52 : 0.8;
  const cabinHeight = isSport ? 0.42 : 0.72;

  group.add(
    part(rounded(2.0, bodyHeight, 4.3, isSport ? 0.2 : 0.16), paint, 0, bodyY, 0),
    part(rounded(isSport ? 1.6 : 1.84, cabinHeight, isSport ? 1.9 : 2.6, isSport ? 0.2 : 0.14), glass, 0, bodyY + bodyHeight / 2 + cabinHeight / 2 - 0.05, isSport ? -0.3 : -0.3),
    part(rounded(2.04, 0.1, 4.34, 0.04), detail, 0, bodyY - bodyHeight / 2 + 0.06, 0),
    part(rounded(0.42, 0.11, 0.06, 0.03), light, -0.65, bodyY + 0.08, 2.15),
    part(rounded(0.42, 0.11, 0.06, 0.03), light, 0.65, bodyY + 0.08, 2.15),
    part(rounded(1.7, 0.09, 0.06, 0.03), tailLight, 0, bodyY + 0.1, -2.15),
  );

  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.35, 1.35]) {
      const radius = isSport ? 0.36 : 0.43;

      group.add(wheel(radius, 0.3, tire, rim).translateX(x).translateY(radius).translateZ(z));
    }
  }

  return group;
}
