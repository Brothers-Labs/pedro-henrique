import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';

import { context2d, createCanvas, darken } from '../../pedro-maker/art/canvas';
import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { disposeTree } from '../../pedro-maker/engine/render/dispose';
import { box, buildBoxesGeometry } from '../../pedro-maker/engine/render/voxel-geometry';
import type { TrackThemeDefinition } from '../config/theme.config';
import { locate, pointAt, ROAD_HALF_WIDTH, WALL_DISTANCE, type Circuit, type CircuitSample } from '../simulation/circuit';
import type { ItemBox, Peel } from '../simulation/race-simulation';
import { sceneryParts } from './scenery-models';

const CURB_WIDTH = 0.9;
const LINE_WIDTH = 0.35;
const GROUND_MARGIN = 160;
/** Tentativas de achar lugar para enfeites: o que cai em cima da pista é descartado. */
const SCENERY_ATTEMPTS = 420;
const SCENERY_CLEARANCE = WALL_DISTANCE + 3;
const PEEL_POOL_SIZE = 8;

/** Camadas no chão, um tiquinho acima uma da outra para não piscarem. */
const LAYER = { shoulder: 0.02, road: 0.04, details: 0.06 } as const;

/**
 * Tudo o que fica parado na pista: chão, asfalto, zebras, largada, turbos,
 * caixas de surpresa, cascas largadas e o cenário em volta.
 */
export class TrackView {
  readonly root = new Group();

  private readonly textures: Texture[] = [];
  private readonly itemBoxMeshes: Mesh[] = [];
  private readonly peelMeshes: Mesh[] = [];

  constructor(
    private readonly circuit: Circuit,
    private readonly theme: TrackThemeDefinition,
    seed: number,
    hasShadows: boolean,
  ) {
    this.root.name = 'pista';
    this.root.add(
      this.buildGround(),
      this.ribbon(-WALL_DISTANCE, WALL_DISTANCE, LAYER.shoulder, () => darken(theme.groundDetail, 0.08)),
      this.ribbon(-ROAD_HALF_WIDTH, ROAD_HALF_WIDTH, LAYER.road, () => theme.road),
      this.ribbon(-ROAD_HALF_WIDTH - CURB_WIDTH, -ROAD_HALF_WIDTH, LAYER.details, (index) => curbColor(theme, index)),
      this.ribbon(ROAD_HALF_WIDTH, ROAD_HALF_WIDTH + CURB_WIDTH, LAYER.details, (index) => curbColor(theme, index)),
      this.ribbon(-LINE_WIDTH / 2, LINE_WIDTH / 2, LAYER.details, (index) => (index % 2 === 0 ? theme.roadLine : theme.road)),
      this.buildStartLine(),
      ...circuit.boostDistances.map((distance) => this.buildBoostPad(distance)),
      this.buildScenery(seed, hasShadows),
    );
  }

  /** Cria uma caixa de surpresa para cada lugar da simulação. */
  addItemBoxes(boxes: readonly ItemBox[]): void {
    const texture = this.track(paintItemBoxTexture());
    const geometry = buildBoxesGeometry([box(0, 0, 0, 1.4, 1.4, 1.4, '#ffffff')]);
    const material = new MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.92,
      emissive: new Color('#ffffff'),
      emissiveMap: texture,
      emissiveIntensity: 0.35,
    });
    addBoxUvs(geometry);

    for (const itemBox of boxes) {
      const mesh = new Mesh(geometry, material);

      mesh.position.set(itemBox.x, 1.3, itemBox.z);
      this.itemBoxMeshes.push(mesh);
      this.root.add(mesh);
    }
  }

  update(boxes: readonly ItemBox[], peels: readonly Peel[], clockMs: number): void {
    boxes.forEach((itemBox, index) => {
      const mesh = this.itemBoxMeshes[index];

      if (!mesh) {
        return;
      }

      mesh.visible = itemBox.respawnAtMs <= clockMs;
      mesh.rotation.set(0.35, clockMs / 700 + index, 0.2);
      mesh.position.y = 1.3 + Math.sin(clockMs / 300 + index) * 0.15;
    });

    this.ensurePeelPool();
    this.peelMeshes.forEach((mesh, index) => {
      const peel = peels[index];

      mesh.visible = peel !== undefined;

      if (peel) {
        mesh.position.set(peel.x, 0.25, peel.z);
      }
    });
  }

  dispose(): void {
    disposeTree(this.root);

    for (const texture of this.textures) {
      texture.dispose();
    }
  }

  private buildGround(): Mesh {
    const width = this.circuit.worldWidth + GROUND_MARGIN * 2;
    const depth = this.circuit.worldDepth + GROUND_MARGIN * 2;
    const texture = this.track(paintGroundTexture(this.theme));

    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(width / 24, depth / 24);

    const ground = new Mesh(new PlaneGeometry(width, depth), new MeshStandardMaterial({ map: texture, roughness: 1 }));

    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.circuit.worldWidth / 2, 0, this.circuit.worldDepth / 2);
    ground.receiveShadow = true;

    return ground;
  }

  /**
   * Uma faixa que acompanha a linha central, entre dois afastamentos.
   *
   * Cada trecho tem cor própria: é assim que as zebras alternam vermelho e
   * branco e a faixa do meio vira tracejada, sem textura nenhuma.
   */
  private ribbon(inner: number, outer: number, height: number, colorAt: (index: number) => string): Mesh {
    const { samples } = this.circuit;
    const count = samples.length;
    const positions = new Float32Array(count * 6 * 3);
    const colors = new Float32Array(count * 6 * 3);
    const color = new Color();
    let vertex = 0;

    const write = (sample: CircuitSample, offset: number): void => {
      positions[vertex * 3] = sample.x - sample.tangentZ * offset;
      positions[vertex * 3 + 1] = height;
      positions[vertex * 3 + 2] = sample.z + sample.tangentX * offset;
      colors[vertex * 3] = color.r;
      colors[vertex * 3 + 1] = color.g;
      colors[vertex * 3 + 2] = color.b;
      vertex += 1;
    };

    for (let index = 0; index < count; index += 1) {
      const current = samples[index];
      const next = samples[(index + 1) % count];

      color.set(colorAt(index));
      write(current, inner);
      write(next, inner);
      write(current, outer);
      write(current, outer);
      write(next, inner);
      write(next, outer);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: DoubleSide }));
    mesh.receiveShadow = true;

    return mesh;
  }

  private buildStartLine(): Mesh {
    const texture = this.track(paintCheckeredTexture());

    return this.flatOnRoad(0, 2.4, texture, 0);
  }

  private buildBoostPad(distance: number): Mesh {
    const texture = this.track(paintBoostTexture());
    const pad = this.flatOnRoad(distance, 6, texture, 0.5);

    pad.scale.x = 6.8 / (ROAD_HALF_WIDTH * 2);

    return pad;
  }

  /** Um retângulo deitado de lado a lado do asfalto, virado no sentido da corrida. */
  private flatOnRoad(distance: number, length: number, texture: CanvasTexture, glow: number): Mesh {
    const point = pointAt(this.circuit, distance);
    const material = new MeshStandardMaterial({
      map: texture,
      emissive: new Color('#ffffff'),
      emissiveMap: texture,
      emissiveIntensity: glow,
      transparent: true,
    });
    const mesh = new Mesh(new PlaneGeometry(ROAD_HALF_WIDTH * 2, length), material);

    // Deitado, o "para cima" da textura aponta para trás; meia volta a mais deixa as setas na direção da corrida.
    mesh.rotation.set(-Math.PI / 2, 0, Math.atan2(point.tangentX, point.tangentZ) + Math.PI);
    mesh.position.set(point.x, LAYER.details + 0.01, point.z);
    mesh.receiveShadow = true;

    return mesh;
  }

  /** Espalha os enfeites do tema longe da pista, sempre nos mesmos lugares para a mesma pista. */
  private buildScenery(seed: number, hasShadows: boolean): Group {
    const group = new Group();
    const random = new SeededRandom(seed);
    const placements = new Map<number, Matrix4[]>();
    const dummy = new Object3D();
    const kinds = this.theme.scenery;

    for (let attempt = 0; attempt < SCENERY_ATTEMPTS; attempt += 1) {
      const x = -40 + random.next() * (this.circuit.worldWidth + 80);
      const z = -40 + random.next() * (this.circuit.worldDepth + 80);

      if (Math.abs(locate(this.circuit, x, z).lateral) < SCENERY_CLEARANCE) {
        continue;
      }

      // O primeiro enfeite do tema sai mais vezes que os outros.
      const kindIndex = random.chance(0.6) ? 0 : random.integer(0, kinds.length - 1);
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, random.next() * Math.PI * 2, 0);
      dummy.scale.setScalar(0.8 + random.next() * 0.6);
      dummy.updateMatrix();

      const list = placements.get(kindIndex) ?? [];
      list.push(dummy.matrix.clone());
      placements.set(kindIndex, list);
    }

    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });

    for (const [kindIndex, matrices] of placements) {
      const instanced = new InstancedMesh(buildBoxesGeometry(sceneryParts(kinds[kindIndex])), material, matrices.length);

      matrices.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
      instanced.castShadow = hasShadows;
      instanced.receiveShadow = hasShadows;
      group.add(instanced);
    }

    return group;
  }

  /** As cascas são poucas e reaproveitadas: nada é criado no meio da corrida. */
  private ensurePeelPool(): void {
    if (this.peelMeshes.length > 0) {
      return;
    }

    const geometry = buildBoxesGeometry([
      box(0, 0, 0, 0.9, 0.3, 0.5, '#ffd43b'),
      box(-0.55, 0.05, 0.3, 0.3, 0.2, 0.5, '#ffd43b'),
      box(0.55, 0.05, 0.3, 0.3, 0.2, 0.5, '#ffd43b'),
      box(0, 0.05, -0.3, 0.3, 0.2, 0.4, '#f2b705'),
    ]);
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });

    for (let index = 0; index < PEEL_POOL_SIZE; index += 1) {
      const mesh = new Mesh(geometry, material);

      mesh.visible = false;
      mesh.castShadow = true;
      this.peelMeshes.push(mesh);
      this.root.add(mesh);
    }
  }

  private track(texture: CanvasTexture): CanvasTexture {
    texture.colorSpace = SRGBColorSpace;
    this.textures.push(texture);

    return texture;
  }
}

function curbColor(theme: TrackThemeDefinition, index: number): string {
  return Math.floor(index / 2) % 2 === 0 ? theme.curbA : theme.curbB;
}

/** A geometria de caixas não tem coordenadas de textura; a caixa de surpresa precisa de uma por face. */
function addBoxUvs(geometry: BufferGeometry): void {
  const vertexCount = geometry.getAttribute('position').count;
  const uvs = new Float32Array(vertexCount * 2);
  const corners = [0, 0, 1, 0, 1, 1, 0, 1];

  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    uvs[vertex * 2] = corners[(vertex % 4) * 2];
    uvs[vertex * 2 + 1] = corners[(vertex % 4) * 2 + 1];
  }

  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
}

function paintGroundTexture(theme: TrackThemeDefinition): CanvasTexture {
  const canvas = createCanvas(64, 64);
  const context = context2d(canvas);
  const random = new SeededRandom(7);

  context.fillStyle = theme.ground;
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = theme.groundDetail;

  for (let index = 0; index < 40; index += 1) {
    context.fillRect(random.integer(0, 62), random.integer(0, 62), 2, 2);
  }

  return new CanvasTexture(canvas);
}

function paintCheckeredTexture(): CanvasTexture {
  const canvas = createCanvas(128, 32);
  const context = context2d(canvas);
  const size = 16;

  for (let column = 0; column < canvas.width / size; column += 1) {
    for (let row = 0; row < canvas.height / size; row += 1) {
      context.fillStyle = (column + row) % 2 === 0 ? '#ffffff' : '#1e1e28';
      context.fillRect(column * size, row * size, size, size);
    }
  }

  return new CanvasTexture(canvas);
}

function paintBoostTexture(): CanvasTexture {
  const canvas = createCanvas(64, 128);
  const context = context2d(canvas);

  context.fillStyle = '#ff9f1c';
  context.fillRect(0, 0, 64, 128);
  context.fillStyle = '#fff3bf';

  // Três setas apontando para a frente da corrida.
  for (const top of [12, 52, 92]) {
    context.beginPath();
    context.moveTo(32, top);
    context.lineTo(56, top + 24);
    context.lineTo(44, top + 24);
    context.lineTo(32, top + 12);
    context.lineTo(20, top + 24);
    context.lineTo(8, top + 24);
    context.closePath();
    context.fill();
  }

  return new CanvasTexture(canvas);
}

function paintItemBoxTexture(): CanvasTexture {
  const canvas = createCanvas(64, 64);
  const context = context2d(canvas);
  const gradient = context.createLinearGradient(0, 0, 64, 64);

  gradient.addColorStop(0, '#ff6fae');
  gradient.addColorStop(0.5, '#ffd43b');
  gradient.addColorStop(1, '#3fa9f5');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 5;
  context.strokeRect(3, 3, 58, 58);
  context.fillStyle = '#ffffff';
  context.font = 'bold 42px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('?', 32, 35);

  return new CanvasTexture(canvas);
}
