import {
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  type Material,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
} from 'three';

import type { CosmeticPalette } from '../models/economy.model';
import { disposeGeometries, type MaterialLibrary } from './materials';
import { crownTexture } from './textures';

const SKIN = '#c98d63';
const HAIR = '#1d1410';

export type CharacterPose = 'idle' | 'run' | 'jump' | 'slide' | 'attack' | 'victory' | 'defeat' | 'sit';

function box(width: number, height: number, depth: number, material: Material, castShadow = true): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.castShadow = castShadow;

  return mesh;
}

/** Junta com o pivô no ponto de articulação: girar o grupo gira o membro inteiro. */
function joint(x: number, y: number, z: number, ...children: Mesh[]): Group {
  const group = new Group();
  group.position.set(x, y, z);
  group.add(...children);

  return group;
}

function at<T extends Mesh>(mesh: T, x: number, y: number, z: number): T {
  mesh.position.set(x, y, z);

  return mesh;
}

/**
 * O Pedro em 3D, feito de blocos: moletom com a coroa, óculos escuros,
 * cordão e tênis.
 *
 * É procedural de propósito: nenhum modelo de terceiros, nenhuma licença, e a
 * roupa troca só mudando a paleta do cosmético.
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

  constructor(materials: MaterialLibrary, palette: CosmeticPalette) {
    const hoodie = materials.standard(palette.primary, { roughness: 0.85 });
    const trim = materials.standard(palette.secondary, { roughness: 0.8 });
    const accent = materials.standard(palette.accent, { metalness: 0.6, roughness: 0.35, emissive: palette.accent, emissiveIntensity: 0.15 });
    const skin = materials.standard(SKIN, { roughness: 0.75 });
    const hair = materials.standard(HAIR, { roughness: 0.9 });
    const glasses = materials.standard('#050507', { metalness: 0.4, roughness: 0.15 });
    const pants = materials.standard('#141418', { roughness: 0.9 });
    const sneaker = materials.standard('#f4f4f4', { roughness: 0.6 });

    this.emblem = crownTexture(palette.accent);
    this.emblemMaterial = new MeshStandardMaterial({ map: this.emblem, transparent: true, emissive: palette.accent, emissiveIntensity: 0.25 });

    // Pernas: coxa na junta do quadril, canela na junta do joelho.
    this.shinLeft = joint(0, -0.45, 0, at(box(0.18, 0.42, 0.2, pants), 0, -0.21, 0), at(box(0.22, 0.12, 0.34, sneaker), 0, -0.45, 0.05));
    this.shinRight = joint(0, -0.45, 0, at(box(0.18, 0.42, 0.2, pants), 0, -0.21, 0), at(box(0.22, 0.12, 0.34, sneaker), 0, -0.45, 0.05));
    this.legLeft = joint(-0.13, 0.95, 0, at(box(0.21, 0.46, 0.23, pants), 0, -0.22, 0));
    this.legRight = joint(0.13, 0.95, 0, at(box(0.21, 0.46, 0.23, pants), 0, -0.22, 0));
    this.legLeft.add(this.shinLeft);
    this.legRight.add(this.shinRight);

    // Braços: ombro e cotovelo.
    this.forearmLeft = joint(0, -0.32, 0, at(box(0.14, 0.3, 0.15, hoodie), 0, -0.15, 0), at(box(0.12, 0.12, 0.12, skin), 0, -0.34, 0), at(box(0.15, 0.05, 0.16, accent), 0, -0.27, 0));
    this.forearmRight = joint(0, -0.32, 0, at(box(0.14, 0.3, 0.15, hoodie), 0, -0.15, 0), at(box(0.12, 0.12, 0.12, skin), 0, -0.34, 0));
    this.armLeft = joint(-0.34, 0.55, 0, at(box(0.16, 0.34, 0.17, hoodie), 0, -0.16, 0));
    this.armRight = joint(0.34, 0.55, 0, at(box(0.16, 0.34, 0.17, hoodie), 0, -0.16, 0));
    this.armLeft.add(this.forearmLeft);
    this.armRight.add(this.forearmRight);

    // Cabeça: rosto, cabelo com topete, barba e óculos escuros.
    this.head = joint(
      0,
      0.64,
      0,
      at(box(0.12, 0.1, 0.12, skin), 0, 0.03, 0),
      at(box(0.34, 0.36, 0.32, skin), 0, 0.24, 0),
      at(box(0.36, 0.12, 0.34, hair), 0, 0.44, -0.01),
      at(box(0.36, 0.26, 0.06, hair), 0, 0.32, -0.16),
      at(box(0.22, 0.1, 0.2, hair), 0, 0.51, 0.04),
      at(box(0.36, 0.14, 0.08, hair), 0, 0.12, 0.14),
      at(box(0.37, 0.08, 0.05, glasses), 0, 0.27, 0.17),
      at(box(0.06, 0.08, 0.06, skin), -0.19, 0.24, 0),
      at(box(0.06, 0.08, 0.06, skin), 0.19, 0.24, 0),
    );

    const emblem = new Mesh(new PlaneGeometry(0.26, 0.26), this.emblemMaterial);
    emblem.position.set(0, 0.36, 0.156);

    const chain = new Mesh(new TorusGeometry(0.11, 0.014, 6, 16), accent);
    chain.position.set(0, 0.5, 0.15);
    chain.rotation.x = Math.PI / 2.4;

    this.torso = joint(
      0,
      0.95,
      0,
      at(box(0.54, 0.6, 0.3, hoodie), 0, 0.3, 0),
      at(box(0.56, 0.08, 0.32, trim), 0, 0.02, 0),
      at(box(0.42, 0.22, 0.12, trim), 0, 0.56, -0.17),
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
        this.torso.scale.y = 1 + Math.sin(time * 2) * 0.012 * motion;
        this.head.rotation.y = Math.sin(time * 0.6) * 0.3 * motion;
        this.armLeft.rotation.z = 0.12;
        this.armRight.rotation.z = -0.12;
        this.armRight.rotation.x = -0.15;
        this.forearmRight.rotation.x = -0.9;
        return;
    }
  }

  dispose(): void {
    this.emblem.dispose();
    this.emblemMaterial.dispose();
    disposeGeometries(this.root);
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
    for (const part of [this.body, this.torso, this.head, this.armLeft, this.armRight, this.forearmLeft, this.forearmRight, this.legLeft, this.legRight, this.shinLeft, this.shinRight]) {
      part.rotation.set(0, 0, 0);
    }

    this.body.position.y = 0;
    this.torso.scale.y = 1;
  }
}

/**
 * O Rex, um dobermann de coleira dourada.
 *
 * Os visuais "de óculos" e "gold" ganham os óculos escuros do mock.
 */
export class DogRig {
  readonly root = new Group();

  private readonly body: Group;
  private readonly head: Group;
  private readonly tail: Group;
  private readonly legs: readonly Group[];

  constructor(materials: MaterialLibrary, palette: CosmeticPalette, hasSunglasses: boolean) {
    const coat = materials.standard(palette.primary, { roughness: 0.55, metalness: 0.15 });
    const tan = materials.standard(palette.secondary, { roughness: 0.7 });
    const collar = materials.standard(palette.accent, { metalness: 0.8, roughness: 0.3, emissive: palette.accent, emissiveIntensity: 0.2 });
    const nose = materials.standard('#050505', { roughness: 0.3 });

    const leg = (x: number, z: number): Group => joint(x, 0.5, z, at(box(0.09, 0.42, 0.1, coat), 0, -0.21, 0), at(box(0.1, 0.07, 0.13, tan), 0, -0.46, 0.02));

    this.legs = [leg(-0.11, 0.24), leg(0.11, 0.24), leg(-0.11, -0.26), leg(0.11, -0.26)];

    const earLeft = new Mesh(new ConeGeometry(0.05, 0.2, 4), coat);
    earLeft.position.set(-0.08, 0.22, -0.02);
    const earRight = earLeft.clone();
    earRight.position.x = 0.08;

    const headParts: Mesh[] = [
      at(box(0.22, 0.2, 0.24, coat), 0, 0.08, 0),
      at(box(0.13, 0.11, 0.2, tan), 0, 0.02, 0.18),
      at(box(0.06, 0.05, 0.05, nose), 0, 0.05, 0.29),
      earLeft,
      earRight,
    ];

    if (hasSunglasses) {
      headParts.push(at(box(0.24, 0.05, 0.04, materials.standard('#050507', { metalness: 0.5, roughness: 0.1 })), 0, 0.13, 0.13));
    }

    this.head = joint(0, 0.82, 0.38, ...headParts);

    const collarRing = new Mesh(new TorusGeometry(0.1, 0.022, 6, 14), collar);
    collarRing.position.set(0, 0.72, 0.3);
    collarRing.rotation.x = Math.PI / 2.6;

    this.tail = joint(0, 0.62, -0.38, at(box(0.04, 0.04, 0.22, coat), 0, 0.08, -0.08));
    this.tail.rotation.x = -0.9;

    this.body = joint(
      0,
      0,
      0,
      at(box(0.28, 0.27, 0.72, coat), 0, 0.6, 0),
      at(box(0.2, 0.12, 0.4, tan), 0, 0.46, 0.12),
      at(box(0.2, 0.28, 0.18, coat), 0, 0.74, 0.3),
      collarRing,
    );
    this.body.add(this.head, this.tail, ...this.legs);
    this.root.add(this.body);
  }

  pose(pose: CharacterPose, time: number, cadence = 1, motion = 1): void {
    const [frontLeft, frontRight, backLeft, backRight] = this.legs;

    for (const part of [this.body, ...this.legs, this.head]) {
      part.rotation.set(0, 0, 0);
    }

    this.body.position.y = 0;
    this.tail.rotation.set(-0.9, Math.sin(time * 12) * 0.5 * motion, 0);

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
    disposeGeometries(this.root);
  }
}

/** Rodas de carro e moto: cilindro deitado. */
function wheel(radius: number, width: number, material: Material): Mesh {
  const mesh = new Mesh(new CylinderGeometry(radius, radius, width, 14), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;

  return mesh;
}

/** Veículos do lobby e os carros da pista: SUV, esportivo e moto. */
export function buildVehicle(materials: MaterialLibrary, shape: 'suv' | 'sport' | 'moto', palette: CosmeticPalette): Group {
  const paint = materials.standard(palette.primary, { metalness: 0.7, roughness: 0.25 });
  const detail = materials.standard(palette.secondary, { metalness: 0.5, roughness: 0.4 });
  const glass = materials.standard('#0d1420', { metalness: 0.6, roughness: 0.1 });
  const tire = materials.standard('#0a0a0a', { roughness: 0.9 });
  const light = materials.neon(palette.accent, 1.4);
  const group = new Group();

  if (shape === 'moto') {
    group.add(
      at(box(0.3, 0.35, 1.5, paint), 0, 0.65, 0),
      at(box(0.32, 0.2, 0.6, detail), 0, 0.88, -0.2),
      at(box(0.12, 0.08, 0.06, light), 0, 0.8, 0.78),
    );

    for (const z of [-0.65, 0.65]) {
      group.add(at(wheel(0.34, 0.14, tire), 0, 0.34, z));
    }

    return group;
  }

  const isSport = shape === 'sport';
  const bodyHeight = isSport ? 0.55 : 0.9;
  const bodyY = isSport ? 0.5 : 0.78;

  group.add(
    at(box(2.0, bodyHeight, 4.3, paint), 0, bodyY, 0),
    at(box(isSport ? 1.6 : 1.85, isSport ? 0.45 : 0.75, isSport ? 1.7 : 2.6, glass), 0, bodyY + bodyHeight / 2 + (isSport ? 0.2 : 0.37), isSport ? -0.25 : -0.3),
    at(box(2.02, 0.12, 4.32, detail), 0, bodyY - bodyHeight / 2 + 0.06, 0),
    at(box(0.4, 0.14, 0.05, light), -0.65, bodyY + 0.05, 2.16),
    at(box(0.4, 0.14, 0.05, light), 0.65, bodyY + 0.05, 2.16),
    at(box(1.7, 0.12, 0.05, materials.neon('#ff2a2a', 1.2)), 0, bodyY + 0.08, -2.16),
  );

  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.35, 1.35]) {
      group.add(at(wheel(isSport ? 0.36 : 0.42, 0.3, tire), x, isSport ? 0.36 : 0.42, z));
    }
  }

  return group;
}
