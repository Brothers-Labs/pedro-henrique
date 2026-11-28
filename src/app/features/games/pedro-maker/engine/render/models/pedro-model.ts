import { Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';

import type { CharacterPalette } from '../../../config/character.config';
import { BIG_PEDRO_SCALE, GIGA_PEDRO_SCALE, MINI_PEDRO_SCALE, TALL_PEDRO_STRETCH, TALL_PEDRO_THINNING } from '../../../config/physics.config';
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
const BUBBLE_COLOR = '#5fd4ff';
const CAT_COLOR = '#ff9f1a';
const CAT_STRIPE = '#c86a00';
const LEAF_COLOR = '#2f9e44';
/** Giros por segundo da folha na cabeça enquanto o herói plana, como uma hélice. */
const LEAF_SPIN_RATE = 14;
const RACCOON_FUR = '#8a7f72';
const RACCOON_STRIPE = '#3d3530';
/** Uma volta inteira do corpo a cada tantos milissegundos, no giro de rabo. */
const TAIL_SPIN_TURN_MS = 160;
const GIGA_GLOW = 0.2;
const GIGA_COLOR = '#ffd23f';
/** Piscada de aviso no fim do Giga e do Turbo: acende e apaga a cada tantos milissegundos. */
const WARNING_BLINK_MS = 140;
const TURBO_GLOW = 0.35;
const TURBO_COLOR = '#33d6ff';
const MAGNET_GLOW = 0.3;
const MAGNET_COLOR = '#ff4d6d';
const TALL_GLOW = 0.18;
const TALL_COLOR = '#b388ff';
const REVERSE_GLOW = 0.3;
const REVERSE_COLOR = '#20c997';
const MINI_GLOW = 0.3;
const MINI_COLOR = '#6b8cff';
const PROPELLER_COLOR = '#339af0';
const PROPELLER_BLADE = '#ffd43b';
/** Giros por segundo da hélice: devagar parada, rápido no lançamento e na descida. */
const PROPELLER_IDLE_RATE = 3;
const PROPELLER_SPIN_RATE = 26;
const BOOT_COLOR = '#40c057';
const BOOT_SOLE = '#1e5128';
const WING_CAP_COLOR = '#e8343a';
const HAMMER_IRON = '#adb5bd';
const HAMMER_BAND = '#868e96';
const HAMMER_WOOD = '#a0642d';
/** O braço do martelo vai de lá de cima (atrás da cabeça) até a frente, embaixo. */
const HAMMER_RAISED = -3;
const HAMMER_LOWERED = -0.6;
const PENGUIN_COLOR = '#364fc7';
const PENGUIN_BEAK = '#ff922b';

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
  readonly hasBubbleFlower: boolean;
  readonly hasCatSuit: boolean;
  readonly hasLeafSuit: boolean;
  /** Subindo uma parede com o Cogumelo Gato. */
  readonly isClimbing: boolean;
  /** Planando com o Cogumelo Folha. */
  readonly isGliding: boolean;
  readonly hasRaccoonSuit: boolean;
  /** Subindo no ar com a Folha do Guaxinim. */
  readonly isFlying: boolean;
  readonly isSpinningTail: boolean;
  /** Com o corpo dobrado do Giga Cogumelo. */
  readonly isGiant: boolean;
  /** Últimos segundos do Giga Cogumelo: o herói pisca para avisar. */
  readonly isGigaEnding: boolean;
  /** Correndo com o Cogumelo Turbo. */
  readonly hasTurboMushroom: boolean;
  /** Últimos segundos do Cogumelo Turbo: o brilho elétrico pisca. */
  readonly isTurboEnding: boolean;
  /** Puxando moedas com o Cogumelo Ímã. */
  readonly hasMagnetMushroom: boolean;
  /** Últimos segundos do Cogumelo Ímã: o brilho vermelho pisca. */
  readonly isMagnetEnding: boolean;
  /** Com o corpo comprido do Cogumelo Alto. */
  readonly isTall: boolean;
  /** Últimos segundos do Cogumelo Alto: o brilho lilás pisca. */
  readonly isTallEnding: boolean;
  /** Com os comandos trocados do Cogumelo Reverso. */
  readonly hasReverseMushroom: boolean;
  /** Últimos segundos do Cogumelo Reverso: o brilho verde-água pisca. */
  readonly isReverseEnding: boolean;
  /** Com o corpinho do Cogumelo de Encolher. */
  readonly isMini: boolean;
  /** Últimos segundos do Cogumelo de Encolher: o brilho azul pisca. */
  readonly isMiniEnding: boolean;
  readonly hasPropellerSuit: boolean;
  /** A hélice acabou de lançar o herói ou segura a descida: gira rápido. */
  readonly isPropellerSpinning: boolean;
  readonly hasBoot: boolean;
  readonly hasWingCap: boolean;
  readonly hasHammer: boolean;
  /** Quanto da martelada já foi, de 0 a 1; nulo sem martelada. */
  readonly hammerSwingProgress: number | null;
  readonly hasPenguinSuit: boolean;
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
  private readonly catSuit: Group;
  private readonly leaf: Group;
  private readonly raccoonSuit: Group;
  private readonly raccoonTail: Group;
  private readonly propellerSuit: Group;
  private readonly propellerBlades: Group;
  /** Uma bota em cada perna: andam junto com elas. */
  private readonly boots: readonly Mesh[];
  private readonly wingCap: Group;
  /** O martelo vai na mão direita: o braço é que dá a martelada. */
  private readonly hammer: Mesh;
  private readonly penguinSuit: Group;
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });

  private heading = Math.PI / 2 - TURN_TOWARD_CAMERA;
  private size = 1;
  /** Quanto o corpo estica na altura (1 é o normal); afina nos lados na mesma medida. */
  private stretch = 1;
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
    const headTop = topOf(parts.upperBody);

    this.catSuit = this.buildCatSuit(headTop, parts.hipY);
    this.leaf = this.buildLeaf(headTop);
    this.raccoonTail = this.buildRaccoonTail(parts.hipY);
    this.raccoonSuit = this.buildRaccoonSuit(headTop, this.raccoonTail);
    this.propellerBlades = this.buildPropellerBlades();
    this.propellerSuit = this.buildPropellerSuit(headTop, this.propellerBlades);
    this.boots = [this.leftLeg, this.rightLeg].map((leg) => this.buildBoot(leg, parts.hipY));
    this.wingCap = this.buildWingCap(headTop);
    this.hammer = this.buildHammer(this.rightArm);
    this.penguinSuit = this.buildPenguinSuit(headTop);
    this.body.add(
      this.leftArm,
      this.rightArm,
      this.leftLeg,
      this.rightLeg,
      this.wings,
      this.catSuit,
      this.leaf,
      this.raccoonSuit,
      this.propellerSuit,
      this.wingCap,
      this.penguinSuit,
    );

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
    this.catSuit.visible = pose.hasCatSuit;
    this.leaf.visible = pose.hasLeafSuit;
    this.raccoonSuit.visible = pose.hasRaccoonSuit;
    this.propellerSuit.visible = pose.hasPropellerSuit;
    this.wingCap.visible = pose.hasWingCap;
    this.hammer.visible = pose.hasHammer;
    this.penguinSuit.visible = pose.hasPenguinSuit;

    for (const boot of this.boots) {
      boot.visible = pose.hasBoot;
    }

    this.shield.rotation.y = now / 600;

    this.turn(pose, deltaSeconds);
    this.grow(pose, deltaSeconds);
    this.glow(pose, now);
    this.reactToGround(pose);
    this.animateLimbs(pose, deltaSeconds, now);
    this.animateSuit(pose, deltaSeconds, now);
    this.applySquash(deltaSeconds);

    this.previousMode = pose.mode;
  }

  /** Viagem de vitória para dentro do portal: encolhe girando. */
  /** `shrinks`: entra no portal girando e encolhendo; sem ele, desce o mastro da bandeira de braços para cima. */
  celebrate(progress: number, shrinks = true): void {
    const eased = progress * progress * progress;

    this.body.rotation.set(0, shrinks ? eased * Math.PI * 2 : 0, 0);
    this.root.scale.setScalar(shrinks ? 1 - eased * 0.8 : 1);
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
    // Comprido ou pequenininho, o desenho acompanha a caixa de colisão, e não o tamanho de grande.
    const target = this.sizeFor(pose);
    const blend = 1 - Math.exp(-GROW_RATE * deltaSeconds);
    const stretchTarget = pose.isTall ? TALL_PEDRO_STRETCH : 1;

    this.size = MathUtils.lerp(this.size, target, blend);
    this.stretch = MathUtils.lerp(this.stretch, stretchTarget, blend);

    // Comprido e magrelo: estica para cima e afina dos lados, sem mexer nos pés.
    const thinning = MathUtils.mapLinear(this.stretch, 1, TALL_PEDRO_STRETCH, 1, TALL_PEDRO_THINNING);

    this.root.scale.set(this.size * thinning, this.size * this.stretch, this.size * thinning);
  }

  private sizeFor(pose: PedroPose): number {
    if (pose.isGiant) {
      return GIGA_PEDRO_SCALE;
    }

    if (pose.isMini) {
      return MINI_PEDRO_SCALE;
    }

    return pose.isBig && !pose.isTall ? BIG_PEDRO_SCALE : 1;
  }

  /**
   * Estrela: o Pedro pisca em todas as cores. Gigante: um brilho dourado; com
   * o Cogumelo Turbo, um elétrico; com o Ímã, um vermelho; com o Alto, um
   * lilás; com o Reverso, um verde-água; pequenininho, um azul. Todos acendem e apagam quando o efeito
   * está para acabar. Flor de fogo: um brilho quente; de gelo, um frio.
   */
  private glow(pose: PedroPose, now: number): void {
    const emissive = this.material.emissive;

    if (pose.hasStar) {
      emissive.setHSL((now / 400) % 1, 1, 0.5);
      this.material.emissiveIntensity = STAR_GLOW;
    } else if (pose.isGigaEnding) {
      this.blinkWarning(GIGA_COLOR, now);
    } else if (pose.isGiant) {
      emissive.set(GIGA_COLOR);
      this.material.emissiveIntensity = GIGA_GLOW;
    } else if (pose.isTurboEnding) {
      this.blinkWarning(TURBO_COLOR, now);
    } else if (pose.hasTurboMushroom) {
      emissive.set(TURBO_COLOR);
      this.material.emissiveIntensity = TURBO_GLOW;
    } else if (pose.isReverseEnding) {
      this.blinkWarning(REVERSE_COLOR, now);
    } else if (pose.hasReverseMushroom) {
      emissive.set(REVERSE_COLOR);
      this.material.emissiveIntensity = REVERSE_GLOW;
    } else if (pose.isMagnetEnding) {
      this.blinkWarning(MAGNET_COLOR, now);
    } else if (pose.hasMagnetMushroom) {
      emissive.set(MAGNET_COLOR);
      this.material.emissiveIntensity = MAGNET_GLOW;
    } else if (pose.isMiniEnding) {
      this.blinkWarning(MINI_COLOR, now);
    } else if (pose.isMini) {
      emissive.set(MINI_COLOR);
      this.material.emissiveIntensity = MINI_GLOW;
    } else if (pose.isTallEnding) {
      this.blinkWarning(TALL_COLOR, now);
    } else if (pose.isTall) {
      emissive.set(TALL_COLOR);
      this.material.emissiveIntensity = TALL_GLOW;
    } else if (pose.hasFireFlower || pose.hasIceFlower || pose.hasBubbleFlower) {
      emissive.set(flowerColor(pose));
      this.material.emissiveIntensity = FLOWER_GLOW;
    } else {
      this.material.emissiveIntensity = 0;
    }
  }

  private blinkWarning(color: string, now: number): void {
    const isWarningLit = Math.floor(now / WARNING_BLINK_MS) % 2 === 0;

    this.material.emissive.set(color);
    this.material.emissiveIntensity = isWarningLit ? STAR_GLOW : 0;
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

  /**
   * Escalando, os braços vão alternando para cima; planando, abrem como asas e
   * a folha gira. Voando, o rabo de guaxinim abana rápido; no giro de rabo, o
   * corpo inteiro dá voltas.
   */
  private animateSuit(pose: PedroPose, deltaSeconds: number, now: number): void {
    this.raccoonTail.rotation.set(0, 0, 0);

    if (pose.isFlying) {
      const flap = Math.sin(now / 45);

      this.raccoonTail.rotation.x = flap * 0.6;
      this.leftArm.rotation.set(0, 0, -1.2 - flap * 0.5);
      this.rightArm.rotation.set(0, 0, 1.2 + flap * 0.5);
    }

    if (pose.isSpinningTail) {
      this.body.rotation.y = this.heading + ((now % TAIL_SPIN_TURN_MS) / TAIL_SPIN_TURN_MS) * Math.PI * 2;
      this.raccoonTail.rotation.x = -0.9;
    }

    if (pose.isClimbing) {
      const reach = Math.sin(now / 70);

      this.leftArm.rotation.set(-2.6 + reach * 0.4, 0, 0);
      this.rightArm.rotation.set(-2.6 - reach * 0.4, 0, 0);
      this.leftLeg.rotation.x = reach * 0.5;
      this.rightLeg.rotation.x = -reach * 0.5;
    }

    if (pose.isGliding) {
      this.leftArm.rotation.set(0, 0, -1.5);
      this.rightArm.rotation.set(0, 0, 1.5);
      this.leaf.rotation.y += LEAF_SPIN_RATE * deltaSeconds;
    }

    if (pose.hasPropellerSuit) {
      this.propellerBlades.rotation.y += (pose.isPropellerSpinning ? PROPELLER_SPIN_RATE : PROPELLER_IDLE_RATE) * deltaSeconds;
    }

    if (pose.isPropellerSpinning) {
      // Os braços para cima, segurando a hélice, como quem é puxado por ela.
      this.leftArm.rotation.set(0, 0, -2.7);
      this.rightArm.rotation.set(0, 0, 2.7);
    }

    if (pose.hammerSwingProgress !== null) {
      // Começa devagar lá em cima e despenca: o peso do martelo.
      const fall = pose.hammerSwingProgress * pose.hammerSwingProgress;

      this.rightArm.rotation.set(MathUtils.lerp(HAMMER_RAISED, HAMMER_LOWERED, fall), 0, 0);
    }
  }

  /** O alto da cabeça com a hélice: um chapeuzinho azul, o eixo e as duas pás, que giram sozinhas. */
  private buildPropellerSuit(headTop: number, blades: Group): Group {
    const suit = new Group();

    suit.position.y = headTop;
    suit.add(this.mesh([box(0, 0.02, 0, 0.34, 0.05, 0.34, PROPELLER_COLOR), box(0, 0.08, 0, 0.05, 0.1, 0.05, '#2a2350')]), blades);
    suit.visible = false;

    return suit;
  }

  private buildPropellerBlades(): Group {
    const blades = new Group();

    blades.position.y = 0.13;
    blades.add(this.mesh([box(0, 0, 0, 0.74, 0.03, 0.12, PROPELLER_BLADE), box(0, 0.001, 0, 0.12, 0.03, 0.74, PROPELLER_BLADE)]));

    return blades;
  }

  /** Bota de cano alto por cima do tênis, presa na perna: anda e pula junto com ela. */
  private buildBoot(leg: Group, hipY: number): Mesh {
    const footY = -hipY;
    const boot = this.mesh([
      box(0, footY + 0.12, 0.03, 0.24, 0.24, 0.28, BOOT_COLOR),
      box(0, footY + 0.26, 0.03, 0.26, 0.04, 0.3, '#b2f2bb'),
      box(0, footY + 0.01, 0.06, 0.26, 0.04, 0.34, BOOT_SOLE),
    ]);

    boot.visible = false;
    leg.add(boot);

    return boot;
  }

  /** Boné vermelho por cima do boné de sempre, com uma asinha branca de cada lado. */
  private buildWingCap(headTop: number): Group {
    const cap = new Group();

    cap.position.y = headTop;
    cap.add(
      this.mesh([
        box(0, 0.02, 0, 0.54, 0.12, 0.5, WING_CAP_COLOR),
        box(0, 0.1, 0, 0.36, 0.06, 0.36, WING_CAP_COLOR),
        box(0, 0.04, 0.252, 0.12, 0.08, 0.01, '#ffffff'),
        ...[-1, 1].flatMap((side) => [
          box(side * 0.34, 0.04, -0.04, 0.16, 0.12, 0.04, '#ffffff'),
          box(side * 0.44, 0.12, -0.04, 0.12, 0.1, 0.04, '#e7f5ff'),
        ]),
      ]),
    );
    cap.visible = false;

    return cap;
  }

  /** Martelo na mão direita: o cabo sai para a frente e a cabeça de ferro fica em pé na ponta. */
  private buildHammer(arm: Group): Mesh {
    const hammer = this.mesh([
      box(0, -0.34, 0.2, 0.06, 0.06, 0.34, HAMMER_WOOD),
      box(0, -0.34, 0.42, 0.26, 0.4, 0.26, HAMMER_IRON),
      box(0, -0.34, 0.42, 0.27, 0.08, 0.27, HAMMER_BAND),
    ]);

    hammer.visible = false;
    arm.add(hammer);

    return hammer;
  }

  /** Capuz de pinguim que deixa o rosto à mostra, com o bico laranja em cima, e a barriga branca. */
  private buildPenguinSuit(headTop: number): Group {
    const suit = new Group();

    suit.add(
      this.mesh([
        box(0, headTop - 0.24, -0.05, 0.54, 0.56, 0.42, PENGUIN_COLOR),
        box(0, headTop + 0.04, 0.17, 0.12, 0.06, 0.1, PENGUIN_BEAK),
        box(0, 0.64, 0, 0.55, 0.46, 0.32, PENGUIN_COLOR),
        box(0, 0.62, 0.161, 0.36, 0.36, 0.01, '#ffffff'),
      ]),
    );
    suit.visible = false;

    return suit;
  }

  /** Orelhas pontudas no alto da cabeça e o rabo listrado saindo das costas, na altura do quadril. */
  private buildCatSuit(headTop: number, hipY: number): Group {
    const suit = new Group();

    suit.add(
      this.mesh([
        ...[-1, 1].flatMap((side) => [
          box(side * 0.16, headTop + 0.05, 0, 0.14, 0.12, 0.1, CAT_COLOR),
          box(side * 0.18, headTop + 0.14, 0, 0.08, 0.08, 0.08, CAT_COLOR),
          box(side * 0.16, headTop + 0.06, 0.052, 0.07, 0.07, 0.01, '#ffb3cf'),
        ]),
        box(0, hipY + 0.02, -0.3, 0.08, 0.08, 0.22, CAT_COLOR),
        box(0, hipY + 0.14, -0.42, 0.08, 0.22, 0.08, CAT_STRIPE),
        box(0, hipY + 0.3, -0.44, 0.08, 0.12, 0.08, CAT_COLOR),
      ]),
    );
    suit.visible = false;

    return suit;
  }

  /** Folha deitada no alto da cabeça, presa por um cabinho no meio: é dela que vem o voo planado. */
  private buildLeaf(headTop: number): Group {
    const leaf = new Group();

    leaf.position.y = headTop;
    leaf.add(
      this.mesh([
        box(0, 0.04, 0, 0.04, 0.08, 0.04, '#2b8a3e'),
        box(0, 0.09, 0, 0.56, 0.03, 0.2, LEAF_COLOR),
        box(0, 0.106, 0, 0.5, 0.01, 0.03, '#b2f2bb'),
      ]),
    );
    leaf.visible = false;

    return leaf;
  }

  /** Orelhas redondas de guaxinim no alto da cabeça, com o rabo listrado preso nas costas. */
  private buildRaccoonSuit(headTop: number, tail: Group): Group {
    const suit = new Group();

    suit.add(
      this.mesh(
        [-1, 1].flatMap((side) => [
          box(side * 0.17, headTop + 0.06, 0, 0.16, 0.14, 0.08, RACCOON_FUR),
          box(side * 0.17, headTop + 0.07, 0.042, 0.08, 0.08, 0.01, RACCOON_STRIPE),
        ]),
      ),
      tail,
    );
    suit.visible = false;

    return suit;
  }

  /** Rabo grosso de faixas claras e escuras, com o pivô no quadril para abanar e girar. */
  private buildRaccoonTail(hipY: number): Group {
    const tail = new Group();
    const stripes = [RACCOON_FUR, RACCOON_STRIPE, RACCOON_FUR, RACCOON_STRIPE, RACCOON_FUR];

    tail.position.set(0, hipY + 0.04, -0.2);
    tail.add(this.mesh(stripes.map((color, index) => box(0, index * 0.05, -0.08 - index * 0.07, 0.16, 0.16, 0.08, color))));

    return tail;
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

/** Altura do ponto mais alto das peças: o topo da cabeça (ou do boné) de cada herói. */
function topOf(parts: readonly VoxelBox[]): number {
  return Math.max(...parts.map((part) => part.y + part.height / 2));
}

/** O brilho do traje de flor: laranja no fogo, azul no gelo, azul-claro na bolha. */
function flowerColor(pose: PedroPose): string {
  if (pose.hasFireFlower) {
    return FIRE_COLOR;
  }

  return pose.hasIceFlower ? ICE_COLOR : BUBBLE_COLOR;
}
