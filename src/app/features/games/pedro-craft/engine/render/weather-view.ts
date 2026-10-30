import { BoxGeometry, DynamicDrawUsage, InstancedMesh, Matrix4, MeshBasicMaterial, type Scene, type Vector3 } from 'three';

import type { WeatherKind } from '../simulation/weather';

/** A caixa em volta da câmera onde cai a chuva ou a neve: ela anda junto com o herói. */
const HALF_AREA = 11;
const HEIGHT = 14;

interface Precipitation {
  readonly kind: Exclude<WeatherKind, 'clear'>;
  readonly count: number;
  /** Com o modo calmo, cai bem menos. */
  readonly calmCount: number;
  /** Blocos por segundo para baixo. */
  readonly fallSpeed: number;
  /** Balanço para os lados, em blocos: a neve dança, a chuva cai reta. */
  readonly sway: number;
  readonly size: readonly [number, number, number];
  readonly color: string;
  readonly opacity: number;
}

const PRECIPITATIONS: readonly Precipitation[] = [
  { kind: 'rain', count: 360, calmCount: 120, fallSpeed: 14, sway: 0, size: [0.03, 0.42, 0.03], color: '#a9d2ff', opacity: 0.6 },
  { kind: 'snow', count: 260, calmCount: 90, fallSpeed: 1.6, sway: 0.4, size: [0.09, 0.09, 0.09], color: '#ffffff', opacity: 0.9 },
];

interface Layer {
  readonly precipitation: Precipitation;
  readonly mesh: InstancedMesh<BoxGeometry, MeshBasicMaterial>;
  /** Posição de cada gota relativa à caixa, de 0 a 1 em cada eixo. */
  readonly offsets: Float32Array;
}

/**
 * Chuva e neve: pedacinhos caindo numa caixa em volta da câmera.
 *
 * Uma malha instanciada por tipo, sem luz nem sombra: centenas de gotas
 * custam uma chamada só à placa de vídeo. Nada pisca e não há trovão.
 */
export class WeatherView {
  private readonly layers: readonly Layer[];
  private readonly matrix = new Matrix4();
  private elapsedMs = 0;

  constructor(scene: Scene) {
    this.layers = PRECIPITATIONS.map((precipitation) => {
      const [width, height, depth] = precipitation.size;
      const material = new MeshBasicMaterial({ color: precipitation.color, transparent: true, opacity: precipitation.opacity, depthWrite: false });
      const mesh = new InstancedMesh(new BoxGeometry(width, height, depth), material, precipitation.count);
      const offsets = new Float32Array(precipitation.count * 3).map(() => Math.random());

      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);

      return { precipitation, mesh, offsets };
    });
  }

  update(kind: WeatherKind, center: Vector3, frameMs: number, isCalm: boolean): void {
    this.elapsedMs += frameMs;

    for (const layer of this.layers) {
      const isActive = layer.precipitation.kind === kind;

      layer.mesh.visible = isActive;

      if (isActive) {
        this.move(layer, center, frameMs, isCalm);
      }
    }
  }

  dispose(): void {
    for (const { mesh } of this.layers) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    }
  }

  private move(layer: Layer, center: Vector3, frameMs: number, isCalm: boolean): void {
    const { precipitation, mesh, offsets } = layer;
    const count = isCalm ? precipitation.calmCount : precipitation.count;
    const fall = (precipitation.fallSpeed * frameMs) / 1000 / HEIGHT;
    const time = this.elapsedMs / 1000;

    for (let index = 0; index < count; index += 1) {
      const base = index * 3;
      const height = (offsets[base + 1] - fall + 1) % 1;
      const sway = Math.sin(time + index) * precipitation.sway;

      offsets[base + 1] = height;
      this.matrix.makeTranslation(
        center.x + (offsets[base] - 0.5) * HALF_AREA * 2 + sway,
        center.y + (height - 0.4) * HEIGHT,
        center.z + (offsets[base + 2] - 0.5) * HALF_AREA * 2,
      );
      mesh.setMatrixAt(index, this.matrix);
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }
}
