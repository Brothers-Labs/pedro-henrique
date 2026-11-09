import { BoxGeometry, Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';

import type { EnemyKind } from '../../../models/level.model';
import { ENEMY_DEFEAT_MS } from '../../simulation/enemy';
import { box, buildBoxesGeometry, type VoxelBox } from '../voxel-geometry';

const EYE_WHITE = '#ffffff';
const PUPIL = '#2a2350';

/** Estado do inimigo que o modelo precisa para se mexer. */
export interface EnemyPose {
  readonly kind: EnemyKind;
  readonly direction: 1 | -1;
  readonly isDefeated: boolean;
  readonly defeatedAt: number;
  readonly isHidden: boolean;
  /** Preso no bloco de gelo da Flor de Gelo. */
  readonly isFrozen: boolean;
  /** Quanto a planta carnívora está para fora do cano, de 0 a 1. */
  readonly emergence: number;
  readonly isMoving: boolean;
  /** O Bolão tremendo antes do bote. */
  readonly isWindingUp: boolean;
  /** Onde fica a estaca da corrente, em blocos, a partir dos pés do inimigo; `null` sem corrente. */
  readonly tether: { readonly x: number; readonly y: number } | null;
}

/**
 * Materiais dos inimigos, um conjunto só para a fase inteira.
 *
 * Com vinte slimes na tela, vinte cópias do mesmo material só gastariam
 * memória; o fantasma tem o seu, porque some e aparece.
 */
export class EnemyMaterials {
  readonly solid = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  readonly glow = new MeshStandardMaterial({ vertexColors: true, emissive: '#6ff3ff', emissiveIntensity: 1.2, roughness: 0.3 });
  /** A bolinha de lava brilha sozinha, mesmo nas fases escuras. */
  readonly ember = new MeshStandardMaterial({ vertexColors: true, emissive: '#ff5a00', emissiveIntensity: 0.9, roughness: 0.5 });
  /** Bloco de gelo translúcido em volta do inimigo congelado. */
  readonly ice = new MeshStandardMaterial({
    color: '#bfefff',
    emissive: '#5cc8ff',
    emissiveIntensity: 0.35,
    roughness: 0.1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  ghost(): MeshStandardMaterial {
    return new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, transparent: true, opacity: 0.9, depthWrite: false });
  }

  dispose(): void {
    this.solid.dispose();
    this.glow.dispose();
    this.ember.dispose();
    this.ice.dispose();
  }
}

/**
 * Um inimigo de cubos, com o jeito de se mexer do seu tipo.
 *
 * O slime quica amassando, o morcego bate as asas, o robô balança a antena, o
 * fantasma flutua e fica transparente quando some, a tartaruga balança o casco
 * e a planta carnívora sobe do cano mordendo, o pinguim gingando e a bolinha de
 * lava pula girando. O goomba marcha balançando, a bala de canhão voa de lado
 * com o nariz para a frente, o thwomp treme de raiva e o Rei Slime quica como
 * o slime. O Bolão treme antes do bote e arrasta a corrente presa na estaca,
 * que fica no chão enquanto ele vai e volta. Os peixes nadam de perfil
 * abanando o rabo, e o saltador some na água entre um pulo e outro.
 * Congelado, para dentro de um bloco de gelo. Derrotado, achata e some.
 */
export class EnemyModel {
  readonly root = new Group();

  private readonly body = new Group();
  private readonly wings: readonly Group[] = [];
  /** Rabo dos peixes, que abana sozinho atrás do corpo. */
  private readonly tail: Group | null = null;
  private readonly ghostMaterial: MeshStandardMaterial | null = null;
  /** Criado no primeiro congelamento: a maioria dos inimigos nunca precisa dele. */
  private iceBlock: Mesh | null = null;
  private heading: number;
  private readonly phase = Math.random() * Math.PI * 2;
  /** Estaca e elos do Bolão. Ficam fora do corpo para não girar nem achatar com ele. */
  private readonly stake: Mesh | null = null;
  private readonly chainLinks: readonly Mesh[] = [];

  constructor(
    private readonly kind: EnemyKind,
    private readonly materials: EnemyMaterials,
    scale: number,
  ) {
    this.root.name = `inimigo-${kind}`;
    this.root.scale.setScalar(scale);
    this.heading = -Math.PI / 2 + 0.5;

    if (kind === 'ghost') {
      this.ghostMaterial = materials.ghost();
    }

    const material = this.ghostMaterial ?? (kind === 'lava-bubble' ? materials.ember : materials.solid);

    this.body.add(this.mesh(PARTS[kind], material));

    if (kind === 'robot') {
      this.body.add(this.mesh([box(0, 0.5, 0.26, 0.4, 0.1, 0.02, '#6ff3ff')], materials.glow));
    }

    if (kind === 'bat') {
      this.wings = this.buildWings(0.18, 0.02, [box(0.22, 0, 0, 0.44, 0.06, 0.26, '#5b3aa8'), box(0.36, -0.06, 0, 0.18, 0.06, 0.2, '#4a2e8c')], material);
    }

    if (kind === 'bee') {
      this.wings = this.buildWings(0.08, 0.36, [box(0.16, 0.06, -0.04, 0.3, 0.04, 0.2, '#e6f6ff')], material);
    }

    if (kind === 'fish' || kind === 'jumping-fish') {
      this.tail = new Group();
      this.tail.position.set(0, FISH_CENTER_Y, -FISH_HALF_LENGTH);
      this.tail.add(this.mesh(fishTail(FISH_COLORS[kind].fin), material));
      this.body.add(this.tail);
    }

    if (kind === 'iron-ball') {
      this.stake = this.mesh(STAKE_PARTS, material);
      this.chainLinks = Array.from({ length: CHAIN_LINK_COUNT }, (_, index) =>
        this.mesh([index % 2 === 0 ? CHAIN_LINK_FLAT : CHAIN_LINK_UPRIGHT], material),
      );
      this.root.add(this.stake, ...this.chainLinks);
    }

    this.root.add(this.body);
  }

  update(pose: EnemyPose, deltaSeconds: number, now: number): void {
    this.showIce(pose.isFrozen);
    this.stretchChain(pose);

    if (pose.isFrozen) {
      return;
    }

    const target = pose.direction * (Math.PI / 2 - 0.5);
    this.heading = MathUtils.lerp(this.heading, target, 1 - Math.exp(-10 * deltaSeconds));
    this.body.rotation.y = this.heading;

    if (pose.isDefeated) {
      const progress = Math.min(1, (now - pose.defeatedAt) / ENEMY_DEFEAT_MS);

      this.body.scale.set(1 + progress * 0.4, Math.max(0.05, 1 - progress * 0.85), 1 + progress * 0.4);
      this.body.position.y = 0;
      return;
    }

    const time = now / 1000 + this.phase;

    switch (this.kind) {
      case 'slime':
      case 'king-slime': {
        const hop = Math.abs(Math.sin(time * 6));

        this.body.scale.set(1 + (1 - hop) * 0.12, 0.88 + hop * 0.2, 1 + (1 - hop) * 0.12);
        this.body.position.y = pose.isMoving ? hop * 0.06 : 0;
        return;
      }
      case 'spiky':
        this.body.position.y = Math.abs(Math.sin(time * 9)) * 0.03;
        return;
      case 'robot':
        this.body.rotation.z = pose.isMoving ? Math.sin(time * 10) * 0.05 : 0;
        return;
      case 'bat':
        this.flapWings(time * 18, 0.7);
        return;
      case 'bee':
        this.flapWings(time * 40, 0.5);
        this.body.position.y = Math.sin(time * 5) * 0.03;
        return;
      case 'ghost':
        this.body.position.y = Math.sin(time * 2.4) * 0.08;

        if (this.ghostMaterial) {
          this.ghostMaterial.opacity = MathUtils.lerp(this.ghostMaterial.opacity, pose.isHidden ? 0.2 : 0.9, 1 - Math.exp(-8 * deltaSeconds));
        }

        return;
      case 'turtle':
        this.body.rotation.z = pose.isMoving ? Math.sin(time * 8) * 0.06 : 0;
        return;
      case 'piranha':
        // Desce para dentro do cano, que esconde o que fica abaixo da boca.
        this.body.position.y = (pose.emergence - 1) * PIRANHA_HEIGHT;
        // Sempre de frente para a tela, só virando um pouco para o lado do Pedro.
        this.body.rotation.y = this.heading * 0.4;
        this.body.scale.y = 1 + Math.sin(time * 12) * 0.04 * pose.emergence;
        return;
      case 'penguin':
        this.body.rotation.z = pose.isMoving ? Math.sin(time * 14) * 0.12 : 0;
        return;
      case 'lava-bubble':
        // Dentro da lava some de vez; fora, gira e pulsa como uma brasa.
        this.body.scale.setScalar(pose.emergence === 0 ? 0.001 : 1 + Math.sin(time * 20) * 0.06);
        this.body.rotation.z = time * 6;
        return;
      case 'goomba':
        this.body.rotation.z = pose.isMoving ? Math.sin(time * 12) * 0.1 : 0;
        return;
      case 'bullet':
        // De perfil, com o nariz apontado para onde voa.
        this.body.rotation.y = pose.direction * (Math.PI / 2);
        this.body.position.y = Math.sin(time * 6) * 0.02;
        return;
      case 'thwomp':
        // Sempre de frente para a tela, tremendo de leve enquanto espera.
        this.body.rotation.y = this.heading * 0.3;
        this.body.position.x = pose.isMoving ? 0 : Math.sin(time * 40) * 0.01;
        return;
      case 'fish':
        // De perfil, nadando para onde olha, ondulando o corpo e abanando o rabo.
        this.body.rotation.y = pose.direction * (Math.PI / 2);
        this.body.rotation.z = Math.sin(time * 4) * 0.06;
        this.wagTail(time * 10);
        return;
      case 'jumping-fish':
        // Mergulhado some de vez; no ar, se curva para cima e para baixo no arco do salto.
        this.body.scale.setScalar(pose.emergence === 0 ? 0.001 : 1);
        this.body.rotation.y = pose.direction * (Math.PI / 2);
        this.body.rotation.x = Math.sin(time * 3) * 0.35;
        this.wagTail(time * 16);
        return;
      case 'king-cactus':
        // Pesadão: balança devagar de um lado para o outro enquanto anda.
        this.body.rotation.z = pose.isMoving ? Math.sin(time * 5) * 0.05 : 0;
        return;
      case 'living-pumpkin':
        this.body.rotation.z = pose.isMoving ? Math.sin(time * 10) * 0.08 : 0;
        return;
      case 'witch':
        // Na vassoura, sobe e desce e inclina de leve, como quem voa de verdade.
        this.body.position.y = Math.sin(time * 3) * 0.04;
        this.body.rotation.z = Math.sin(time * 2) * 0.08;
        return;
      case 'iron-ball':
        // Rola na direção do bote e treme forte no aviso, para dar tempo de fugir.
        this.body.rotation.y = this.heading * 0.3;
        this.body.rotation.z = pose.isWindingUp ? Math.sin(time * 60) * 0.12 : -pose.direction * time * (pose.isMoving ? 6 : 0);
        return;
    }
  }

  /** Estaca no chão e elos espalhados em linha reta até a bola. */
  private stretchChain(pose: EnemyPose): void {
    if (!this.stake || !pose.tether) {
      return;
    }

    const { x: stakeX, y: stakeY } = pose.tether;
    const fromY = stakeY + STAKE_HEIGHT;
    const isVisible = !pose.isDefeated;

    this.stake.position.set(stakeX, stakeY, -0.05);
    this.stake.visible = isVisible;

    this.chainLinks.forEach((link, index) => {
      const progress = (index + 1) / (this.chainLinks.length + 1);

      link.position.set(MathUtils.lerp(stakeX, 0, progress), MathUtils.lerp(fromY, IRON_BALL_CENTER_Y, progress), -0.05);
      link.visible = isVisible;
    });
  }

  private showIce(isFrozen: boolean): void {
    if (isFrozen && !this.iceBlock) {
      const size = this.kind === 'king-slime' || this.kind === 'king-cactus' ? KING_ICE_BLOCK_SIZE : ICE_BLOCK_SIZE;

      this.iceBlock = new Mesh(new BoxGeometry(size, size, size), this.materials.ice);
      // O morcego é desenhado a partir do centro; os outros, a partir dos pés.
      this.iceBlock.position.y = this.kind === 'bat' ? 0 : size / 2;
      this.root.add(this.iceBlock);
    }

    if (this.iceBlock) {
      this.iceBlock.visible = isFrozen;
    }
  }

  /** Um par de asas espelhadas; `parts` descreve a asa direita. */
  private buildWings(offsetX: number, offsetY: number, parts: readonly VoxelBox[], material: MeshStandardMaterial): readonly Group[] {
    return [-1, 1].map((side) => {
      const wing = new Group();

      wing.position.set(side * offsetX, offsetY, 0);
      wing.add(this.mesh(parts.map((part) => ({ ...part, x: part.x * side })), material));
      this.body.add(wing);

      return wing;
    });
  }

  private wagTail(angle: number): void {
    if (this.tail) {
      this.tail.rotation.y = Math.sin(angle) * 0.45;
    }
  }

  private flapWings(angle: number, amplitude: number): void {
    this.wings.forEach((wing, index) => {
      wing.rotation.z = (index === 0 ? 1 : -1) * Math.sin(angle) * amplitude;
    });
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
      }
    });
    this.ghostMaterial?.dispose();
    this.root.removeFromParent();
  }

  private mesh(parts: readonly VoxelBox[], material: MeshStandardMaterial): Mesh {
    const mesh = new Mesh(buildBoxesGeometry(parts), material);

    mesh.castShadow = true;

    return mesh;
  }
}

/** Lado do bloco de gelo, em blocos: cobre qualquer inimigo comum. */
const ICE_BLOCK_SIZE = 0.82;
/** O Rei Slime é largo demais para o bloco comum. */
const KING_ICE_BLOCK_SIZE = 1.3;

/** Centro da bola do Bolão, onde a corrente se prende, em blocos a partir dos pés. */
const IRON_BALL_CENTER_Y = 0.375;
const STAKE_HEIGHT = 0.5;
const CHAIN_LINK_COUNT = 6;
const CHAIN_COLOR = '#8a94a6';
/** Elos alternados, um deitado e outro em pé, como numa corrente de verdade. */
const CHAIN_LINK_FLAT = box(0, 0, 0, 0.16, 0.07, 0.07, CHAIN_COLOR);
const CHAIN_LINK_UPRIGHT = box(0, 0, 0, 0.07, 0.14, 0.07, CHAIN_COLOR);
const STAKE_PARTS: readonly VoxelBox[] = [
  box(0, STAKE_HEIGHT / 2, 0, 0.14, STAKE_HEIGHT, 0.14, '#a0703c'),
  box(0, STAKE_HEIGHT - 0.03, 0, 0.18, 0.06, 0.18, '#7a5229'),
];

/** Altura da planta carnívora fora do cano, em blocos. */
const PIRANHA_HEIGHT = 1.0;

/** Centro do corpo dos peixes e meio comprimento, em blocos: o rabo se prende atrás. */
const FISH_CENTER_Y = 0.24;
const FISH_HALF_LENGTH = 0.3;

interface FishColors {
  readonly body: string;
  readonly belly: string;
  readonly fin: string;
  readonly stripe: string;
}

/** O nadador é azul-piscina de nadadeiras amarelas; o saltador, coral de nadadeiras roxas. */
const FISH_COLORS: Readonly<Record<'fish' | 'jumping-fish', FishColors>> = {
  fish: { body: '#2bb7c9', belly: '#bff3f7', fin: '#ffd23f', stripe: '#ffffff' },
  'jumping-fish': { body: '#ff6f91', belly: '#ffd6e0', fin: '#8e44c9', stripe: '#ffe14d' },
};

/** Rabo em leque, desenhado a partir da junta com o corpo e aberto para trás (-z). */
function fishTail(color: string): readonly VoxelBox[] {
  return [box(0, 0, -0.06, 0.06, 0.16, 0.12, color), box(0, 0, -0.16, 0.06, 0.32, 0.1, color)];
}

/** Corpo de peixe de perfil, com a boca para a frente (+z), listra, barbatana e olhos dos dois lados. */
function fishBody(colors: FishColors): readonly VoxelBox[] {
  const y = FISH_CENTER_Y;

  return [
    box(0, y, 0, 0.32, 0.36, 0.6, colors.body),
    box(0, y - 0.1, 0.04, 0.3, 0.12, 0.46, colors.belly),
    box(0, y, 0.33, 0.24, 0.22, 0.08, colors.body),
    box(0, y - 0.04, 0.38, 0.14, 0.05, 0.02, '#2a2350'),
    box(0, y, -0.08, 0.34, 0.3, 0.06, colors.stripe),
    box(0, y + 0.24, -0.02, 0.06, 0.12, 0.26, colors.fin),
    box(-0.17, y - 0.06, 0.06, 0.04, 0.08, 0.14, colors.fin),
    box(0.17, y - 0.06, 0.06, 0.04, 0.08, 0.14, colors.fin),
    // Olho de cada lado da cabeça, porque o peixe é visto de perfil.
    ...[-1, 1].flatMap((side) => [
      box(side * 0.165, y + 0.06, 0.2, 0.02, 0.12, 0.12, EYE_WHITE),
      box(side * 0.18, y + 0.05, 0.22, 0.02, 0.07, 0.06, PUPIL),
    ]),
  ];
}

/** Olhos na frente do corpo, na altura e distância pedidas. */
function eyes(y: number, z: number, spread: number, size: number): readonly VoxelBox[] {
  return [
    box(-spread, y, z, size, size * 1.2, 0.02, EYE_WHITE),
    box(spread, y, z, size, size * 1.2, 0.02, EYE_WHITE),
    box(-spread + size * 0.18, y - size * 0.1, z + 0.012, size * 0.5, size * 0.7, 0.01, PUPIL),
    box(spread + size * 0.18, y - size * 0.1, z + 0.012, size * 0.5, size * 0.7, 0.01, PUPIL),
  ];
}

/** Os modelos têm a base no chão (y = 0) e a frente virada para +z. */
const PARTS: Readonly<Record<EnemyKind, readonly VoxelBox[]>> = {
  slime: [
    box(0, 0.17, 0, 0.8, 0.34, 0.66, '#5fd35a'),
    box(0, 0.4, 0, 0.62, 0.14, 0.52, '#76e36b'),
    box(0, 0.51, 0, 0.36, 0.08, 0.32, '#8ff07f'),
    box(0.2, 0.36, 0.2, 0.1, 0.06, 0.1, '#c9ffc0'),
    ...eyes(0.3, 0.335, 0.15, 0.13),
  ],
  spiky: [
    box(0, 0.08, 0.05, 0.62, 0.12, 0.5, '#ffd08a'),
    box(0, 0.32, -0.02, 0.72, 0.36, 0.56, '#e8505b'),
    box(0, 0.54, -0.02, 0.5, 0.1, 0.4, '#f06a73'),
    ...[-0.24, 0, 0.24].flatMap((x) => [box(x, 0.64, -0.02, 0.12, 0.12, 0.12, '#fff3bf'), box(x, 0.73, -0.02, 0.06, 0.08, 0.06, '#ffffff')]),
    box(-0.18, 0.02, 0.1, 0.16, 0.04, 0.2, '#8a4b20'),
    box(0.18, 0.02, 0.1, 0.16, 0.04, 0.2, '#8a4b20'),
    ...eyes(0.24, 0.265, 0.13, 0.12),
  ],
  robot: [
    box(-0.2, 0.08, 0, 0.14, 0.16, 0.4, '#3d4254'),
    box(0.2, 0.08, 0, 0.14, 0.16, 0.4, '#3d4254'),
    box(0, 0.42, 0, 0.6, 0.52, 0.48, '#9aa3b5'),
    box(0, 0.5, 0.245, 0.46, 0.18, 0.02, '#2a2350'),
    box(0, 0.3, 0.245, 0.3, 0.1, 0.02, '#c9d2e3'),
    box(0, 0.76, 0, 0.04, 0.16, 0.04, '#6f788c'),
    box(0, 0.87, 0, 0.1, 0.1, 0.1, '#ff5a5a'),
    box(-0.33, 0.42, 0, 0.06, 0.2, 0.2, '#6f788c'),
    box(0.33, 0.42, 0, 0.06, 0.2, 0.2, '#6f788c'),
  ],
  bat: [
    box(0, 0, 0, 0.36, 0.34, 0.3, '#7b52d3'),
    box(-0.1, 0.22, 0, 0.08, 0.12, 0.08, '#7b52d3'),
    box(0.1, 0.22, 0, 0.08, 0.12, 0.08, '#7b52d3'),
    box(0, -0.1, 0.155, 0.12, 0.04, 0.01, '#ffffff'),
    ...eyes(0.04, 0.155, 0.08, 0.09),
  ],
  ghost: [
    box(0, 0.36, 0, 0.62, 0.44, 0.5, '#f4f1ff'),
    box(0, 0.62, 0, 0.46, 0.12, 0.4, '#f4f1ff'),
    box(-0.2, 0.1, 0, 0.18, 0.12, 0.46, '#e6e0ff'),
    box(0.02, 0.08, 0, 0.18, 0.16, 0.46, '#e6e0ff'),
    box(0.22, 0.11, 0, 0.16, 0.1, 0.46, '#e6e0ff'),
    box(0, 0.26, 0.255, 0.14, 0.12, 0.01, '#2a2350'),
    ...eyes(0.44, 0.255, 0.12, 0.11),
  ],
  turtle: [
    box(-0.2, 0.07, 0.08, 0.16, 0.14, 0.18, '#f2c14e'),
    box(0.2, 0.07, 0.08, 0.16, 0.14, 0.18, '#f2c14e'),
    box(0, 0.3, -0.06, 0.74, 0.34, 0.6, '#3fae4d'),
    box(0, 0.5, -0.06, 0.52, 0.12, 0.44, '#5fd35a'),
    box(0, 0.16, -0.06, 0.8, 0.06, 0.64, '#fff3d6'),
    box(0, 0.32, 0.25, 0.04, 0.3, 0.02, '#2f8f47'),
    box(-0.18, 0.36, 0.25, 0.3, 0.04, 0.02, '#2f8f47'),
    box(0.18, 0.36, 0.25, 0.3, 0.04, 0.02, '#2f8f47'),
    box(0, 0.38, 0.36, 0.3, 0.3, 0.26, '#f2c14e'),
    ...eyes(0.44, 0.495, 0.07, 0.09),
  ],
  penguin: [
    box(-0.12, 0.03, 0.06, 0.16, 0.06, 0.22, '#ff9f1a'),
    box(0.12, 0.03, 0.06, 0.16, 0.06, 0.22, '#ff9f1a'),
    box(0, 0.36, 0, 0.56, 0.62, 0.46, '#2a2f4a'),
    box(0, 0.32, 0.2, 0.36, 0.46, 0.08, '#f7fbff'),
    box(-0.31, 0.38, 0, 0.08, 0.36, 0.26, '#20243a'),
    box(0.31, 0.38, 0, 0.08, 0.36, 0.26, '#20243a'),
    box(0, 0.52, 0.28, 0.14, 0.08, 0.12, '#ff9f1a'),
    box(0, 0.48, 0.245, 0.4, 0.06, 0.02, '#e8505b'),
    ...eyes(0.6, 0.235, 0.1, 0.1),
  ],
  bee: [
    box(0, 0.2, 0, 0.36, 0.36, 0.5, '#ffc629'),
    box(0, 0.2, -0.1, 0.38, 0.38, 0.08, '#2a2350'),
    box(0, 0.2, 0.06, 0.38, 0.38, 0.08, '#2a2350'),
    box(0, 0.18, -0.3, 0.06, 0.06, 0.1, '#2a2350'),
    ...eyes(0.24, 0.255, 0.08, 0.08),
  ],
  'lava-bubble': [
    box(0, 0.26, 0, 0.5, 0.5, 0.5, '#ff6a00'),
    box(0, 0.26, 0, 0.58, 0.36, 0.36, '#ff8a1f'),
    box(0, 0.4, 0, 0.3, 0.2, 0.3, '#ffd23f'),
    box(-0.12, 0.56, 0, 0.12, 0.14, 0.12, '#ffb020'),
    box(0.1, 0.6, 0.04, 0.1, 0.12, 0.1, '#ffd23f'),
    ...eyes(0.3, 0.255, 0.1, 0.1),
  ],
  goomba: [
    box(-0.17, 0.05, 0.04, 0.2, 0.1, 0.26, '#2a1a10'),
    box(0.17, 0.05, 0.04, 0.2, 0.1, 0.26, '#2a1a10'),
    box(0, 0.2, 0, 0.38, 0.22, 0.32, '#f2d3a0'),
    box(0, 0.43, 0, 0.76, 0.3, 0.62, '#9a5a2e'),
    box(0, 0.62, 0, 0.56, 0.1, 0.48, '#b06a38'),
    // Sobrancelhas bravas e os dois dentinhos para fora.
    box(-0.14, 0.53, 0.315, 0.16, 0.04, 0.02, '#2a1a10'),
    box(0.14, 0.53, 0.315, 0.16, 0.04, 0.02, '#2a1a10'),
    box(-0.1, 0.31, 0.315, 0.05, 0.06, 0.02, '#ffffff'),
    box(0.1, 0.31, 0.315, 0.05, 0.06, 0.02, '#ffffff'),
    ...eyes(0.42, 0.315, 0.13, 0.11),
  ],
  bullet: [
    box(0, 0.29, 0, 0.52, 0.52, 0.66, '#2a2f3a'),
    box(0, 0.29, 0.37, 0.44, 0.44, 0.08, '#3a4050'),
    box(0, 0.29, 0.43, 0.3, 0.3, 0.04, '#3a4050'),
    box(0, 0.29, -0.37, 0.58, 0.58, 0.08, '#1a1d26'),
    box(-0.28, 0.18, 0.06, 0.06, 0.1, 0.16, '#ffffff'),
    box(0.28, 0.18, 0.06, 0.06, 0.1, 0.16, '#ffffff'),
    ...eyes(0.38, 0.452, 0.1, 0.1),
  ],
  thwomp: [
    box(0, 0.48, 0, 0.9, 0.92, 0.6, '#8f9bb0'),
    box(0, 0.48, 0.305, 0.74, 0.76, 0.02, '#a7b2c6'),
    ...[-0.3, 0, 0.3].map((x) => box(x, 0.98, 0, 0.14, 0.12, 0.3, '#cfd6e3')),
    ...[0.25, 0.7].flatMap((y) => [box(-0.5, y, 0, 0.12, 0.14, 0.3, '#cfd6e3'), box(0.5, y, 0, 0.12, 0.14, 0.3, '#cfd6e3')]),
    box(-0.18, 0.78, 0.32, 0.24, 0.05, 0.02, '#2a2350'),
    box(0.18, 0.78, 0.32, 0.24, 0.05, 0.02, '#2a2350'),
    box(0, 0.28, 0.32, 0.48, 0.14, 0.02, '#2a2350'),
    ...[-0.15, 0, 0.15].map((x) => box(x, 0.31, 0.332, 0.07, 0.07, 0.01, '#ffffff')),
    ...eyes(0.62, 0.32, 0.18, 0.13),
  ],
  'king-slime': [
    box(0, 0.26, 0, 1.18, 0.52, 0.96, '#3f8fe0'),
    box(0, 0.6, 0, 0.92, 0.18, 0.76, '#5aa6f0'),
    box(0, 0.74, 0, 0.52, 0.1, 0.46, '#78bbf5'),
    box(0.3, 0.5, 0.36, 0.14, 0.08, 0.14, '#cfe8ff'),
    ...eyes(0.44, 0.485, 0.22, 0.17),
    // Coroa dourada com a pedra vermelha na frente.
    box(0, 0.86, 0, 0.5, 0.14, 0.4, '#ffc629'),
    ...[-0.18, 0, 0.18].map((x) => box(x, 0.98, 0, 0.1, 0.12, 0.1, '#ffc629')),
    box(0, 0.86, 0.205, 0.1, 0.08, 0.02, '#e8343f'),
  ],
  // Bola de aço azulada feita de três caixas cruzadas, com rebites e sorriso pequeno.
  'iron-ball': [
    box(0, IRON_BALL_CENTER_Y, 0, 0.74, 0.5, 0.6, '#5b6b80'),
    box(0, IRON_BALL_CENTER_Y, 0, 0.5, 0.74, 0.6, '#5b6b80'),
    box(0, IRON_BALL_CENTER_Y, 0, 0.62, 0.62, 0.7, '#66778d'),
    box(-0.16, 0.6, 0.351, 0.14, 0.08, 0.01, '#9fb0c6'),
    ...[-0.24, 0.24].flatMap((x) => [box(x, 0.2, 0.351, 0.05, 0.05, 0.01, '#3c4757'), box(x, 0.56, 0.351, 0.05, 0.05, 0.01, '#3c4757')]),
    box(-0.13, 0.55, 0.356, 0.16, 0.04, 0.01, '#2a2350'),
    box(0.13, 0.55, 0.356, 0.16, 0.04, 0.01, '#2a2350'),
    box(0, 0.24, 0.356, 0.14, 0.035, 0.01, '#2a2350'),
    ...eyes(0.42, 0.356, 0.12, 0.11),
  ],
  // Cacto grandão de braços para cima, espinhos claros na frente e a coroa do Rei.
  'king-cactus': [
    box(0, 0.04, 0, 0.7, 0.08, 0.6, '#3d8a3a'),
    box(0, 0.55, 0, 0.62, 1.0, 0.56, '#4fae4a'),
    box(0, 1.08, 0, 0.48, 0.08, 0.44, '#63c45c'),
    box(-0.42, 0.55, 0, 0.24, 0.16, 0.22, '#4fae4a'),
    box(-0.52, 0.76, 0, 0.18, 0.38, 0.2, '#4fae4a'),
    box(0.42, 0.42, 0, 0.24, 0.16, 0.22, '#4fae4a'),
    box(0.52, 0.6, 0, 0.18, 0.32, 0.2, '#4fae4a'),
    ...[
      [-0.2, 0.3],
      [0.2, 0.3],
      [0, 0.18],
      [-0.2, 0.92],
      [0.2, 0.92],
    ].map(([x, y]) => box(x, y, 0.29, 0.06, 0.06, 0.04, '#fff3d6')),
    box(0, 0.5, 0.285, 0.2, 0.05, 0.02, '#2a2350'),
    ...eyes(0.7, 0.285, 0.14, 0.13),
    box(0, 1.2, 0, 0.42, 0.14, 0.36, '#ffc629'),
    ...[-0.15, 0, 0.15].map((x) => box(x, 1.32, 0, 0.09, 0.1, 0.09, '#ffc629')),
    box(0, 1.2, 0.185, 0.09, 0.07, 0.02, '#ff7aa8'),
  ],
  // Abóbora em gomos com cara de lanterna acesa e dois pezinhos para pular.
  'living-pumpkin': [
    box(-0.17, 0.04, 0.04, 0.18, 0.08, 0.24, '#3d6b22'),
    box(0.17, 0.04, 0.04, 0.18, 0.08, 0.24, '#3d6b22'),
    box(0, 0.33, 0, 0.74, 0.5, 0.62, '#ff8a1f'),
    box(0, 0.33, 0, 0.56, 0.56, 0.68, '#ff9a33'),
    box(-0.19, 0.33, 0.345, 0.03, 0.44, 0.02, '#d96a0a'),
    box(0.19, 0.33, 0.345, 0.03, 0.44, 0.02, '#d96a0a'),
    box(0, 0.65, 0, 0.1, 0.14, 0.1, '#5a8a2e'),
    box(0.11, 0.62, 0, 0.14, 0.04, 0.1, '#6fb43a'),
    box(-0.12, 0.42, 0.352, 0.12, 0.1, 0.01, '#ffe066'),
    box(0.12, 0.42, 0.352, 0.12, 0.1, 0.01, '#ffe066'),
    box(0, 0.24, 0.352, 0.34, 0.07, 0.01, '#ffe066'),
    box(0, 0.2, 0.352, 0.16, 0.05, 0.01, '#ffe066'),
  ],
  // Bruxa sorridente na vassoura: a frente da vassoura aponta para onde ela voa.
  witch: [
    // Cores claras de propósito: na noite roxa do Dia das Bruxas, roupa escura some no fundo.
    box(0, 0.08, 0.05, 0.06, 0.06, 1.0, '#8a5a32'),
    box(0, 0.08, -0.52, 0.22, 0.18, 0.2, '#e8c25a'),
    box(0, 0.3, 0, 0.44, 0.36, 0.38, '#9b5de5'),
    box(0, 0.6, 0.02, 0.32, 0.3, 0.3, '#a8e07a'),
    box(-0.18, 0.56, -0.02, 0.06, 0.26, 0.26, '#ff8a1f'),
    box(0.18, 0.56, -0.02, 0.06, 0.26, 0.26, '#ff8a1f'),
    ...eyes(0.62, 0.175, 0.07, 0.08),
    box(0, 0.78, 0.02, 0.56, 0.05, 0.5, '#5a48b0'),
    box(0, 0.84, 0, 0.32, 0.06, 0.3, '#ffe066'),
    box(0, 0.94, 0, 0.3, 0.16, 0.28, '#5a48b0'),
    box(0, 1.08, -0.03, 0.16, 0.14, 0.16, '#5a48b0'),
    box(0, 1.18, -0.07, 0.07, 0.08, 0.07, '#5a48b0'),
  ],
  fish: fishBody(FISH_COLORS.fish),
  'jumping-fish': fishBody(FISH_COLORS['jumping-fish']),
  piranha: [
    box(0, 0.2, 0, 0.12, 0.4, 0.12, '#2f8f47'),
    box(-0.16, 0.22, 0, 0.22, 0.06, 0.14, '#45b95a'),
    box(0.16, 0.3, 0, 0.22, 0.06, 0.14, '#45b95a'),
    box(0, 0.68, 0, 0.62, 0.56, 0.5, '#e8343f'),
    box(0, 0.68, 0.255, 0.5, 0.08, 0.02, '#ffffff'),
    ...[-0.18, 0, 0.18].map((x) => box(x, 0.62, 0.265, 0.06, 0.06, 0.01, '#ffffff')),
    box(-0.18, 0.86, 0.255, 0.1, 0.1, 0.02, '#ffffff'),
    box(0.2, 0.52, 0.255, 0.1, 0.08, 0.02, '#ffffff'),
    box(0.22, 0.88, 0.1, 0.08, 0.08, 0.32, '#ffffff'),
    box(-0.24, 0.5, -0.12, 0.08, 0.08, 0.2, '#ffffff'),
  ],
};
