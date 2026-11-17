import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
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

import { context2d, createCanvas, paint } from '../../art/canvas';
import { BIG_COIN_SIZE, COIN_MULTIPLIER_COLORS, HUGE_COIN_SIZE, paintNumberedCoin } from '../../art/item-art';
import { POWER_UP_LABELS } from '../../config/object-catalog';
import {
  COIN_MULTIPLIER_KINDS,
  type CoinMultiplierKind,
  coinMultiplierLabel,
  formatCoinValue,
  type GiantCoinType,
  giantCoinValue,
  isCoinMultiplier,
  isGiantCoinType,
  perGiantCoin,
  type PowerUpKind,
} from '../../models/level.model';
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
  mushroom: '#e8343a',
  'fire-flower': '#ff7a1f',
  'ice-flower': '#5cc8ff',
  star: '#ffd23f',
  'one-up': '#2fb84a',
  'cat-mushroom': '#ff9f1a',
  'leaf-mushroom': '#7cc242',
  'raccoon-leaf': '#e8892b',
  'giga-mushroom': '#d6336c',
  'turbo-mushroom': '#1fa2ff',
  'swap-mushroom': '#9b5de5',
  'magnet-mushroom': '#e63946',
  'tall-mushroom': '#9d4edd',
  'reverse-mushroom': '#20c997',
  'mini-mushroom': '#4361ee',
  'pedrere-mushroom': '#ffb92e',
  ...COIN_MULTIPLIER_COLORS,
};

/** O Giga Cogumelo flutua maior que os outros: dá para ver de longe que ele é especial. */
const GIGA_ITEM_SCALE = 1.3;

type NumberedCoinKind = 'big-coin' | 'huge-coin' | 'mega-coin' | GiantCoinType | CoinMultiplierKind;

interface NumberedCoinLook {
  /** Raio do disco, em blocos. */
  readonly radius: number;
  /** Lado do desenho do ícone, que vira a estampa das faces. */
  readonly iconSize: number;
  readonly value: string;
  /** Cor da estampa; sem ela, o ouro das moedas comuns. */
  readonly color?: string;
}

/** As moedas gigantes mostram o quanto valem, como no ícone do editor. */
const NUMBERED_COINS: Readonly<Record<NumberedCoinKind, NumberedCoinLook>> = {
  'big-coin': { radius: 0.5, iconSize: BIG_COIN_SIZE, value: '10' },
  ...perGiantCoin((type) => ({ radius: 0.72, iconSize: HUGE_COIN_SIZE, value: formatCoinValue(giantCoinValue(type)) })),
  'huge-coin': { radius: 0.72, iconSize: HUGE_COIN_SIZE, value: '50' },
  // Dois blocos de diâmetro, com a estrela no lugar do número: ela vale uma chuva de moedas.
  'mega-coin': { radius: 1, iconSize: HUGE_COIN_SIZE, value: '★' },
  ...(Object.fromEntries(
    COIN_MULTIPLIER_KINDS.map((kind) => [
      kind,
      { radius: 0.5, iconSize: BIG_COIN_SIZE, value: coinMultiplierLabel(kind), color: COIN_MULTIPLIER_COLORS[kind] },
    ]),
  ) as Record<CoinMultiplierKind, NumberedCoinLook>),
};

const COIN_FACE_RESOLUTION = 128;

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
  /** Vagas da malha de moedas sem moeda nenhuma, para as que aparecem no meio da partida. */
  private readonly freeCoinSlots: number[] = [];
  private now = 0;
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
  private readonly coinFaceMaterials = new Map<NumberedCoinKind, MeshStandardMaterial>();
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
    /** Moedas que podem aparecer durante a partida: as dos tijolos do botão P e as da chuva da Moeda Gigantesca. */
    spareCoins = 0,
  ) {
    this.root.name = 'itens';

    const coinGeometry = new CylinderGeometry(0.3, 0.3, 0.08, 20).rotateX(Math.PI / 2);
    const initialCoins = system.items.filter((item) => item.kind === 'coin');

    const capacity = initialCoins.length + spareCoins;

    this.coins = new InstancedMesh(coinGeometry, this.coinMaterial, Math.max(1, capacity));
    this.coins.count = capacity;
    this.coins.castShadow = true;
    this.coins.frustumCulled = false;
    initialCoins.forEach((coin, index) => this.coinSlots.set(coin.id, index));

    // As vagas de sobra começam vazias: escala zero até uma moeda ocupar.
    for (let slot = capacity - 1; slot >= initialCoins.length; slot -= 1) {
      this.matrix.makeScale(0, 0, 0);
      this.coins.setMatrixAt(slot, this.matrix);
      this.freeCoinSlots.push(slot);
    }

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
    this.now = now;
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

    for (const material of this.coinFaceMaterials.values()) {
      material.map?.dispose();
      material.dispose();
    }
  }

  private placeCoin(item: Collectible, bob: number): void {
    const slot = this.coinSlots.get(item.id) ?? this.takeFreeCoinSlot(item.id);

    if (slot === undefined) {
      return;
    }

    // Saída de um tijolo do botão P, a moeda cresce com um pulinho, como os itens das surpresas.
    const pop = item.spawnedAt === null ? 1 : backOut(Math.min(1, (this.now - item.spawnedAt) / POP_MS));

    this.position.set(this.space.x(item.x), this.space.y(item.y) + bob, 0);
    this.scale.setScalar(pop);
    this.matrix.compose(this.position, this.rotation, this.scale);
    this.coins.setMatrixAt(slot, this.matrix);
  }

  /** Moeda nova (ou que voltou de tijolo): ocupa uma vaga livre, se houver. */
  private takeFreeCoinSlot(id: number): number | undefined {
    const slot = this.freeCoinSlots.pop();

    if (slot !== undefined) {
      this.coinSlots.set(id, slot);
    }

    return slot;
  }

  private hideCollectedCoins(present: ReadonlySet<number>): void {
    for (const [id, slot] of this.coinSlots) {
      if (!present.has(id)) {
        this.matrix.makeScale(0, 0, 0);
        this.coins.setMatrixAt(slot, this.matrix);
        this.coinSlots.delete(id);
        this.freeCoinSlots.push(slot);
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
    if (isGiantCoinType(item.kind)) {
      return this.numberedCoin(item.kind);
    }

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
        return this.powerUpModel(item.powerUp ?? 'super-jump');
      case 'big-coin':
      case 'huge-coin':
      case 'mega-coin':
        return this.numberedCoin(item.kind);
      case 'coin':
        return new Group();
    }
  }

  /** Disco dourado com o valor estampado na frente e no verso, que aparece quando a moeda gira. */
  private numberedCoin(kind: NumberedCoinKind): Group {
    const { radius } = NUMBERED_COINS[kind];
    const thickness = radius * 0.24;
    const faceMaterial = this.coinFaceMaterial(kind);
    const coin = new Group();
    const rim = new Mesh(new CylinderGeometry(radius, radius, thickness, 32).rotateX(Math.PI / 2), this.coinMaterial);

    rim.castShadow = true;
    coin.add(rim);

    for (const side of [1, -1] as const) {
      const face = new Mesh(new CircleGeometry(radius, 32), faceMaterial);

      face.position.z = side * (thickness / 2 + 0.002);
      face.rotation.y = side === 1 ? 0 : Math.PI;
      coin.add(face);
    }

    return coin;
  }

  private coinFaceMaterial(kind: NumberedCoinKind): MeshStandardMaterial {
    const cached = this.coinFaceMaterials.get(kind);

    if (cached) {
      return cached;
    }

    const { iconSize, value, color } = NUMBERED_COINS[kind];
    const canvas = paint(COIN_FACE_RESOLUTION, COIN_FACE_RESOLUTION, (context) => {
      context.scale(COIN_FACE_RESOLUTION / iconSize, COIN_FACE_RESOLUTION / iconSize);
      paintNumberedCoin(context, iconSize, value, color);
    });
    const texture = new CanvasTexture(canvas);

    texture.colorSpace = SRGBColorSpace;

    const material = new MeshStandardMaterial({
      map: texture,
      alphaTest: 0.5,
      metalness: 0.4,
      roughness: 0.35,
      emissive: '#8a5a00',
      emissiveIntensity: 0.3,
    });

    this.coinFaceMaterials.set(kind, material);

    return material;
  }

  /** Os poderes clássicos têm forma própria; as moedas de multiplicação, a de moeda; os outros, a caixa com o emoji. */
  private powerUpModel(kind: PowerUpKind): Object3D {
    if (isCoinMultiplier(kind)) {
      return this.numberedCoin(kind);
    }

    const parts = classicPowerUpParts(kind);

    if (!parts) {
      return this.powerUpBox(kind);
    }

    const mesh = new Mesh(buildBoxesGeometry(parts), this.voxelMaterial);

    mesh.castShadow = true;

    return mesh;
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

/** Cogumelos, flores e estrela de cubinhos; `null` para os poderes de caixa. */
function classicPowerUpParts(kind: PowerUpKind): readonly VoxelBox[] | null {
  switch (kind) {
    case 'mushroom':
      return mushroomParts(POWER_UP_COLORS.mushroom);
    case 'one-up':
      return mushroomParts(POWER_UP_COLORS['one-up']);
    case 'fire-flower':
      return flowerParts('#ff4f1f', '#ffd23f');
    case 'ice-flower':
      return flowerParts('#3fb8ff', '#e6f6ff');
    case 'star':
      return starParts();
    case 'cat-mushroom':
      return [...mushroomParts(POWER_UP_COLORS['cat-mushroom']), ...catEarParts(POWER_UP_COLORS['cat-mushroom'])];
    case 'leaf-mushroom':
      return [...mushroomParts(POWER_UP_COLORS['leaf-mushroom']), ...leafParts()];
    case 'raccoon-leaf':
      return raccoonLeafParts(POWER_UP_COLORS['raccoon-leaf']);
    case 'giga-mushroom':
      return scaleParts(mushroomParts(POWER_UP_COLORS['giga-mushroom']), GIGA_ITEM_SCALE);
    case 'turbo-mushroom':
      return [...mushroomParts(POWER_UP_COLORS['turbo-mushroom']), ...speedStreakParts()];
    case 'swap-mushroom':
      return [...mushroomParts(POWER_UP_COLORS['swap-mushroom'], 'question'), ...swapArrowParts()];
    case 'magnet-mushroom':
      return [...mushroomParts(POWER_UP_COLORS['magnet-mushroom']), ...magnetHatParts()];
    case 'tall-mushroom':
      return tallMushroomParts(POWER_UP_COLORS['tall-mushroom']);
    case 'reverse-mushroom':
      return upsideDownParts(mushroomParts(POWER_UP_COLORS['reverse-mushroom']));
    case 'mini-mushroom':
      return scaleParts(mushroomParts(POWER_UP_COLORS['mini-mushroom']), 0.6);
    case 'pedrere-mushroom':
      return [...mushroomParts(POWER_UP_COLORS['pedrere-mushroom']), ...pedrereCapParts()];
    default:
      return null;
  }
}

/** O que vai na frente do pé do cogumelo: os olhinhos, ou um "?" no lugar deles. */
type MushroomFace = 'eyes' | 'question';

/** Lado de cada quadradinho do "?" de cubos, em blocos. */
const QUESTION_PIXEL = 0.04;

/**
 * O "?" desenhado em cubinhos, linha por linha de cima para baixo: cinco
 * linhas de três colunas, com o pingo separado embaixo.
 */
const QUESTION_ROWS = ['###', '..#', '.#.', '...', '.#.'] as const;

function mushroomParts(cap: string, face: MushroomFace = 'eyes'): readonly VoxelBox[] {
  const stem = '#fff1d6';
  const eye = '#2a2350';
  const spot = '#ffffff';

  return [
    box(0, -0.13, 0, 0.3, 0.26, 0.3, stem),
    ...(face === 'eyes'
      ? [box(-0.06, -0.11, 0.151, 0.04, 0.09, 0.01, eye), box(0.06, -0.11, 0.151, 0.04, 0.09, 0.01, eye)]
      : questionMarkParts(eye)),
    box(0, 0.08, 0, 0.6, 0.16, 0.6, cap),
    box(0, 0.2, 0, 0.44, 0.1, 0.44, cap),
    box(0, 0.12, 0.301, 0.16, 0.1, 0.01, spot),
    box(-0.22, 0.06, 0.301, 0.08, 0.08, 0.01, spot),
    box(0.22, 0.06, 0.301, 0.08, 0.08, 0.01, spot),
    box(0, 0.251, 0, 0.14, 0.01, 0.14, spot),
  ];
}

/** Duas orelhas de gato em cima do chapéu do cogumelo, com o rosado por dentro. */
function catEarParts(color: string): readonly VoxelBox[] {
  return [-1, 1].flatMap((side) => [
    box(side * 0.17, 0.31, 0, 0.14, 0.14, 0.12, color),
    box(side * 0.19, 0.41, 0, 0.08, 0.08, 0.1, color),
    box(side * 0.17, 0.32, 0.061, 0.07, 0.08, 0.01, '#ffb3cf'),
  ]);
}

/** Folha verde deitada em cima do chapéu, com a nervura clara. */
function leafParts(): readonly VoxelBox[] {
  return [
    box(0.08, 0.3, 0, 0.34, 0.05, 0.18, '#2f9e44'),
    box(0.08, 0.326, 0, 0.3, 0.01, 0.03, '#b2f2bb'),
    box(-0.12, 0.3, 0, 0.08, 0.04, 0.04, '#2b8a3e'),
  ];
}

/** Riscos amarelos de velocidade atrás do cogumelo, como se ele já estivesse correndo. */
function speedStreakParts(): readonly VoxelBox[] {
  const streak = '#ffd23f';

  return [
    box(-0.42, 0.12, -0.05, 0.22, 0.05, 0.05, streak),
    box(-0.46, 0, -0.05, 0.3, 0.05, 0.05, streak),
    box(-0.42, -0.12, -0.05, 0.22, 0.05, 0.05, streak),
  ];
}

/** Ímã de ferradura azul em cima do chapéu, com as pontas prateadas. */
function magnetHatParts(): readonly VoxelBox[] {
  const magnet = '#3f8cff';
  const tip = '#e8eef7';

  return [
    box(0, 0.42, 0, 0.26, 0.06, 0.08, magnet),
    box(-0.1, 0.34, 0, 0.06, 0.12, 0.08, magnet),
    box(0.1, 0.34, 0, 0.06, 0.12, 0.08, magnet),
    box(-0.1, 0.27, 0, 0.06, 0.04, 0.08, tip),
    box(0.1, 0.27, 0, 0.06, 0.04, 0.08, tip),
  ];
}

/** Cogumelo de pé comprido e chapéu pequeno: dá para ver de longe que ele estica. */
function tallMushroomParts(cap: string): readonly VoxelBox[] {
  const stem = '#fff1d6';
  const eye = '#2a2350';
  const spot = '#ffffff';

  return [
    box(0, -0.12, 0, 0.18, 0.5, 0.18, stem),
    box(-0.04, -0.02, 0.091, 0.03, 0.08, 0.01, eye),
    box(0.04, -0.02, 0.091, 0.03, 0.08, 0.01, eye),
    box(0, 0.2, 0, 0.42, 0.14, 0.42, cap),
    box(0, 0.3, 0, 0.28, 0.08, 0.28, cap),
    box(0, 0.22, 0.211, 0.12, 0.08, 0.01, spot),
  ];
}

/** O "?" na frente do pé do cogumelo, centralizado onde ficavam os olhos. */
function questionMarkParts(color: string): readonly VoxelBox[] {
  const top = -0.03;

  return QUESTION_ROWS.flatMap((row, line) =>
    [...row].flatMap((cell, column) =>
      cell === '#' ? [box((column - 1) * QUESTION_PIXEL, top - line * QUESTION_PIXEL, 0.151, QUESTION_PIXEL, QUESTION_PIXEL, 0.01, color)] : [],
    ),
  );
}

/** O boné vermelho do Pedro Pedrerê em cima do chapéu, com a aba para a frente. */
function pedrereCapParts(): readonly VoxelBox[] {
  const cap = '#e8433f';

  return [
    box(0, 0.31, 0, 0.3, 0.12, 0.28, cap),
    box(0, 0.28, 0.2, 0.28, 0.04, 0.14, cap),
    box(0, 0.39, 0, 0.06, 0.02, 0.06, '#ff9c99'),
  ];
}

/** Duas setinhas douradas, uma de cada lado do chapéu, apontando em sentidos opostos: troca. */
function swapArrowParts(): readonly VoxelBox[] {
  const arrow = '#ffd23f';

  return [
    box(-0.4, 0.22, 0, 0.16, 0.05, 0.05, arrow),
    box(-0.34, 0.27, 0, 0.05, 0.1, 0.05, arrow),
    box(0.4, -0.06, 0, 0.16, 0.05, 0.05, arrow),
    box(0.34, -0.11, 0, 0.05, 0.1, 0.05, arrow),
  ];
}

/** Folha de outono em pé, com a nervura escura e o rabo listrado de guaxinim aparecendo atrás. */
function raccoonLeafParts(color: string): readonly VoxelBox[] {
  const vein = '#9c4f12';

  return [
    box(0.2, -0.16, -0.04, 0.12, 0.12, 0.12, '#8a7f72'),
    box(0.3, -0.08, -0.04, 0.1, 0.1, 0.1, '#3d3530'),
    box(0.36, 0.02, -0.04, 0.08, 0.1, 0.08, '#8a7f72'),
    box(0, 0, 0, 0.4, 0.34, 0.06, color),
    box(0, 0.22, 0, 0.24, 0.12, 0.06, color),
    box(0, -0.22, 0, 0.18, 0.1, 0.06, color),
    box(0, 0.02, 0.031, 0.04, 0.5, 0.01, vein),
    box(0, 0.04, 0.031, 0.3, 0.03, 0.01, vein),
  ];
}

/** Vira as peças de ponta-cabeça: o Cogumelo Reverso flutua com o chapéu para baixo. */
function upsideDownParts(parts: readonly VoxelBox[]): readonly VoxelBox[] {
  return parts.map((part) => box(part.x, -part.y, part.z, part.width, part.height, part.depth, part.color));
}

/** As mesmas peças, maiores (ou menores, abaixo de 1) a partir do centro do item. */
function scaleParts(parts: readonly VoxelBox[], factor: number): readonly VoxelBox[] {
  return parts.map((part) =>
    box(part.x * factor, part.y * factor, part.z * factor, part.width * factor, part.height * factor, part.depth * factor, part.color),
  );
}

function flowerParts(petals: string, ring: string): readonly VoxelBox[] {
  const green = '#2fb84a';

  return [
    box(0, -0.18, 0, 0.07, 0.26, 0.07, green),
    box(-0.1, -0.2, 0, 0.14, 0.05, 0.08, green),
    box(0.1, -0.24, 0, 0.14, 0.05, 0.08, green),
    box(0, 0.08, 0, 0.44, 0.3, 0.12, petals),
    box(0, 0.08, 0.065, 0.3, 0.2, 0.01, ring),
    box(0, 0.08, 0.075, 0.16, 0.1, 0.01, '#ffffff'),
  ];
}

function starParts(): readonly VoxelBox[] {
  const gold = '#ffd23f';
  const eye = '#2a2350';

  return [
    box(0, 0, 0, 0.24, 0.24, 0.14, gold),
    box(0, 0.19, 0, 0.1, 0.16, 0.14, gold),
    box(-0.19, 0.05, 0, 0.18, 0.1, 0.14, gold),
    box(0.19, 0.05, 0, 0.18, 0.1, 0.14, gold),
    box(-0.11, -0.17, 0, 0.1, 0.16, 0.14, gold),
    box(0.11, -0.17, 0, 0.1, 0.16, 0.14, gold),
    box(-0.045, 0.02, 0.071, 0.03, 0.07, 0.01, eye),
    box(0.045, 0.02, 0.071, 0.03, 0.07, 0.01, eye),
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
