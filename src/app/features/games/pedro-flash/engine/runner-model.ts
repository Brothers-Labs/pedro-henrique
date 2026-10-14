import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import { disposeTree } from '../../pedro-maker/engine/render/dispose';
import { characterParts } from '../../pedro-maker/engine/render/models/character-parts';
import { box, buildBoxesGeometry, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { AirStyle } from '../simulation/runner';

/** Altura do centro do corpo: é em volta dele que o Pedro gira na bola de raio. */
const CENTER_HEIGHT = 0.85;
const TRAIL_POINTS = 28;
const TRAIL_WIDTH = 0.28;
/**
 * Comprimento máximo do rastro, em metros.
 *
 * O rastro guarda um ponto por quadro; sem esse limite, numa tela lenta ele
 * ficaria comprido como a pista inteira; mais curto que a distância da
 * câmera, ele nunca passa por baixo dela e cobre a tela.
 */
const TRAIL_MAX_LENGTH = 6;
/** Acima desta fração da velocidade máxima, o Pedro corre com os braços para trás. */
const SPRINT_RATIO = 0.78;

/** O que o modelo precisa saber do corredor para se mexer. */
export interface RunnerPose {
  readonly speed: number;
  readonly maxSpeed: number;
  readonly steer: number;
  readonly lateralVelocity: number;
  readonly isGrounded: boolean;
  readonly isFalling: boolean;
  readonly airStyle: AirStyle;
  readonly isHoming: boolean;
  readonly isDashing: boolean;
  readonly isBoosting: boolean;
  readonly isStumbling: boolean;
  readonly isBlinking: boolean;
  readonly hasShield: boolean;
  readonly hasMagnet: boolean;
}

export interface RunnerLook {
  readonly palette: CharacterPalette;
  readonly shoeColor: string;
  readonly trailColor: string;
}

/**
 * O corredor de cubos: o Pedro (ou o Gui) do Pedro Maker, de tênis novo.
 *
 * Correndo devagar, balança os braços; embalado, joga os braços para trás
 * como quem corre na velocidade do raio. No pulo vira uma bola elétrica, na
 * rampa dá uma pirueta e, rápido, deixa um rastro de luz da cor escolhida.
 */
export class RunnerModel {
  readonly root = new Group();
  readonly trail: RunnerTrail;

  private readonly pivot = new Group();
  private readonly body = new Group();
  private readonly leftArm: Group;
  private readonly rightArm: Group;
  private readonly leftLeg: Group;
  private readonly rightLeg: Group;
  private readonly ball: Mesh<IcosahedronGeometry, MeshStandardMaterial>;
  private readonly shield: Mesh;
  private readonly magnet: Mesh;
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  private readonly glowColor: Color;
  private stride = 0;
  private spin = 0;
  private lean = 0;
  private yaw = 0;

  constructor(look: RunnerLook) {
    const parts = characterParts(look.palette);
    const leg = withShoe(parts.leg, look.shoeColor);

    this.glowColor = new Color(look.trailColor);
    this.root.name = `corredor-${look.palette.hero}`;
    this.body.position.y = -CENTER_HEIGHT;
    this.body.add(this.mesh(parts.upperBody));
    this.leftArm = this.limb(parts.arm, -parts.shoulderX, parts.shoulderY);
    this.rightArm = this.limb(parts.arm, parts.shoulderX, parts.shoulderY);
    this.leftLeg = this.limb(leg, -parts.hipX, parts.hipY);
    this.rightLeg = this.limb(leg, parts.hipX, parts.hipY);
    this.body.add(this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    this.pivot.position.y = CENTER_HEIGHT;
    this.pivot.add(this.body);

    this.ball = new Mesh(
      new IcosahedronGeometry(0.95, 1),
      new MeshStandardMaterial({
        color: look.trailColor,
        emissive: this.glowColor,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.45,
        flatShading: true,
        depthWrite: false,
      }),
    );
    this.ball.position.y = CENTER_HEIGHT;

    this.shield = new Mesh(
      new SphereGeometry(1.25, 24, 16),
      new MeshStandardMaterial({ color: '#7fe3ff', emissive: '#3fb8ff', emissiveIntensity: 0.8, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    this.shield.position.y = CENTER_HEIGHT;

    this.magnet = new Mesh(
      new TorusGeometry(1.5, 0.06, 8, 40),
      new MeshStandardMaterial({ color: '#ff4d4d', emissive: '#ff4d4d', emissiveIntensity: 1.2 }),
    );
    this.magnet.position.y = 0.15;
    this.magnet.rotation.x = Math.PI / 2;

    this.root.add(this.pivot, this.ball, this.shield, this.magnet);
    this.trail = new RunnerTrail(look.trailColor);
  }

  /** Pose do quadro. `deltaSeconds` é o tempo desde o último desenho. */
  update(pose: RunnerPose, deltaSeconds: number, now: number): void {
    const ratio = pose.maxSpeed > 0 ? Math.min(1.6, Math.max(0, pose.speed) / pose.maxSpeed) : 0;
    const isBall = !pose.isGrounded && !pose.isFalling && (pose.isHoming || pose.airStyle === 'pulo' || pose.airStyle === 'quique');

    this.root.visible = !pose.isBlinking;
    this.shield.visible = pose.hasShield;
    this.shield.rotation.y = now / 700;
    this.magnet.visible = pose.hasMagnet;
    this.magnet.rotation.z = now / 300;
    this.ball.visible = isBall || pose.isDashing;
    this.ball.scale.setScalar(pose.isDashing && !isBall ? 1.35 : 1);
    this.ball.rotation.set(now / 90, now / 140, 0);
    this.ball.material.opacity = pose.isDashing && !isBall ? 0.22 : 0.45;

    this.material.emissive.copy(this.glowColor);
    this.material.emissiveIntensity = pose.isDashing ? 0.55 + 0.25 * Math.sin(now / 45) : 0;

    this.steerLean(pose, deltaSeconds);
    this.resetLimbs();

    if (isBall) {
      this.curl(deltaSeconds);
    } else if (!pose.isGrounded && !pose.isFalling) {
      this.pose(pose.airStyle, deltaSeconds);
    } else if (pose.isFalling || pose.isStumbling) {
      this.flail(now);
    } else {
      this.run(ratio, deltaSeconds);
    }
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
    this.trail.dispose();
  }

  /** Inclina para dentro da curva e vira um pouco para o lado em que está indo. */
  private steerLean(pose: RunnerPose, deltaSeconds: number): void {
    const blend = 1 - Math.exp(-10 * deltaSeconds);
    const targetYaw = -Math.atan2(pose.lateralVelocity, Math.max(8, pose.speed));

    this.lean = MathUtils.lerp(this.lean, pose.steer * 0.18, blend);
    this.yaw = MathUtils.lerp(this.yaw, MathUtils.clamp(targetYaw, -0.5, 0.5), blend);
    this.root.rotation.set(0, this.yaw, this.lean);
  }

  private resetLimbs(): void {
    for (const limb of [this.leftArm, this.rightArm, this.leftLeg, this.rightLeg]) {
      limb.rotation.set(0, 0, 0);
    }

    this.body.position.y = -CENTER_HEIGHT;
  }

  private run(ratio: number, deltaSeconds: number): void {
    this.spin = 0;
    this.stride += deltaSeconds * (7 + ratio * 14);

    const swing = Math.sin(this.stride);

    this.leftLeg.rotation.x = swing * 1.0;
    this.rightLeg.rotation.x = -swing * 1.0;
    this.body.position.y = -CENTER_HEIGHT + Math.abs(Math.cos(this.stride)) * 0.08;
    this.pivot.rotation.set(0.12 + Math.min(0.3, ratio * 0.22), 0, 0);

    if (ratio > SPRINT_RATIO) {
      // A corrida do raio: braços esticados para trás, quase parados.
      this.leftArm.rotation.set(1.25 + swing * 0.08, 0, -0.2);
      this.rightArm.rotation.set(1.25 - swing * 0.08, 0, 0.2);
      return;
    }

    this.leftArm.rotation.x = -swing * 0.9;
    this.rightArm.rotation.x = swing * 0.9;
  }

  /** Encolhido e girando: é a bola de raio do pulo e do ataque. */
  private curl(deltaSeconds: number): void {
    this.spin += deltaSeconds * 20;
    this.pivot.rotation.set(this.spin, 0, 0);
    this.leftLeg.rotation.x = -1.5;
    this.rightLeg.rotation.x = -1.5;
    this.leftArm.rotation.x = -1.7;
    this.rightArm.rotation.x = -1.7;
  }

  private pose(style: AirStyle, deltaSeconds: number): void {
    if (style === 'rampa') {
      // Uma pirueta para trás no salto da rampa.
      this.spin = Math.min(Math.PI * 2, this.spin + deltaSeconds * 9);
      this.pivot.rotation.set(-this.spin, 0, 0);
      this.leftArm.rotation.z = -1.6;
      this.rightArm.rotation.z = 1.6;
      return;
    }

    // Na mola, sobe esticado de braços para o alto.
    this.spin = 0;
    this.pivot.rotation.set(0, 0, 0);
    this.leftArm.rotation.x = -2.9;
    this.rightArm.rotation.x = -2.9;
    this.leftLeg.rotation.x = 0.2;
    this.rightLeg.rotation.x = -0.2;
  }

  private flail(now: number): void {
    const wave = Math.sin(now / 60);

    this.pivot.rotation.set(-0.3, 0, wave * 0.15);
    this.leftArm.rotation.set(-2.4 + wave * 0.4, 0, -0.4);
    this.rightArm.rotation.set(-2.4 - wave * 0.4, 0, 0.4);
    this.leftLeg.rotation.x = wave * 0.6;
    this.rightLeg.rotation.x = -wave * 0.6;
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
}

/**
 * Rastro de luz: uma fita que guarda as últimas posições do quadril.
 *
 * Mora fora do modelo, direto na cena, porque fica para trás no mundo
 * enquanto o corredor anda. Apaga devagar da ponta para o fim.
 */
export class RunnerTrail {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;

  private readonly points: Vector3[] = Array.from({ length: TRAIL_POINTS }, () => new Vector3());
  private readonly sides: Vector3[] = Array.from({ length: TRAIL_POINTS }, () => new Vector3());
  private readonly positions = new Float32Array(TRAIL_POINTS * 2 * 3);
  private head = 0;
  private isPrimed = false;

  constructor(color: string) {
    const geometry = new BufferGeometry();
    const colors = new Float32Array(TRAIL_POINTS * 2 * 4);
    const tint = new Color(color);
    const indices: number[] = [];

    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      // O ponto zero é o mais novo: brilho cheio perto do corredor, sumindo atrás.
      const alpha = (1 - index / (TRAIL_POINTS - 1)) * 0.6;

      for (const vertex of [index * 2, index * 2 + 1]) {
        colors.set([tint.r, tint.g, tint.b, alpha], vertex * 4);
      }

      if (index < TRAIL_POINTS - 1) {
        const a = index * 2;

        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 4));
    geometry.setIndex(indices);
    this.mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Acrescenta a posição do quadro; com `isShown` falso o rastro some e recomeça do zero. */
  push(position: Vector3, side: Vector3, isShown: boolean): void {
    this.mesh.visible = isShown;

    if (!isShown) {
      this.isPrimed = false;
      return;
    }

    if (!this.isPrimed) {
      this.points.forEach((point) => point.copy(position));
      this.sides.forEach((vector) => vector.copy(side));
      this.isPrimed = true;
    }

    this.head = (this.head + TRAIL_POINTS - 1) % TRAIL_POINTS;
    this.points[this.head].copy(position);
    this.sides[this.head].copy(side);

    let length = 0;
    let previous = this.points[this.head];

    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      const slot = (this.head + index) % TRAIL_POINTS;
      const sideVector = this.sides[slot];

      length += this.points[slot].distanceTo(previous);
      // Passou do comprimento máximo: o resto da fita encolhe no último ponto que coube.
      const point = length <= TRAIL_MAX_LENGTH ? this.points[slot] : previous;
      const width = TRAIL_WIDTH * (1 - index / TRAIL_POINTS);

      previous = point;

      this.positions.set(
        [
          point.x - sideVector.x * width,
          point.y - sideVector.y * width,
          point.z - sideVector.z * width,
          point.x + sideVector.x * width,
          point.y + sideVector.y * width,
          point.z + sideVector.z * width,
        ],
        index * 6,
      );
    }

    this.mesh.geometry.getAttribute('position').needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}

/** Tênis no pé: uma caixa um pouco maior que a ponta da perna, com sola branca. */
function withShoe(leg: readonly VoxelBox[], color: string): readonly VoxelBox[] {
  const bottom = Math.min(...leg.map((part) => part.y - part.height / 2));
  const width = Math.max(...leg.map((part) => part.width));
  const depth = Math.max(...leg.map((part) => part.depth));

  return [
    ...leg,
    box(0, bottom + 0.09, 0.05, width + 0.06, 0.16, depth + 0.14, color),
    box(0, bottom + 0.02, 0.05, width + 0.08, 0.04, depth + 0.16, '#ffffff'),
  ];
}
