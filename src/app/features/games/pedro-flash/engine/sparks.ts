import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, type Vector3 } from 'three';

import type { SeededRandom } from '../../pedro-maker/levels/seeded-random';

const GRAVITY = 14;
const LIFETIME_SECONDS = 0.7;

/**
 * Faíscas: o estouro de luz ao pegar um raio, derrubar um robô ou acertar o
 * chefão.
 *
 * Todas moram num só conjunto de pontos de tamanho fixo, reaproveitado em
 * roda: nada é criado no meio da partida, e o limite vem da qualidade
 * gráfica do aparelho.
 */
export class Sparks {
  readonly points: Points<BufferGeometry, PointsMaterial>;

  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly baseColors: Float32Array;
  private readonly velocities: Float32Array;
  private readonly ages: Float32Array;
  private readonly color = new Color();
  private next = 0;

  constructor(
    private readonly capacity: number,
    private readonly random: SeededRandom,
  ) {
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.baseColors = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.ages = new Float32Array(capacity).fill(LIFETIME_SECONDS);

    const geometry = new BufferGeometry();

    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.points = new Points(
      geometry,
      new PointsMaterial({ size: 0.38, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }),
    );
    this.points.frustumCulled = false;
  }

  burst(origin: Vector3, color: string, count: number, speed: number): void {
    this.color.set(color);

    for (let spark = 0; spark < Math.min(count, this.capacity); spark += 1) {
      const index = this.next;
      const angle = this.random.next() * Math.PI * 2;
      const lift = this.random.next() * 0.9 + 0.2;
      const power = speed * (0.5 + this.random.next() * 0.5);

      this.next = (this.next + 1) % this.capacity;
      this.ages[index] = 0;
      this.positions.set([origin.x, origin.y, origin.z], index * 3);
      this.velocities.set([Math.cos(angle) * power, lift * power, Math.sin(angle) * power], index * 3);
      this.baseColors.set([this.color.r, this.color.g, this.color.b], index * 3);
    }
  }

  update(deltaSeconds: number): void {
    for (let index = 0; index < this.capacity; index += 1) {
      if (this.ages[index] >= LIFETIME_SECONDS) {
        continue;
      }

      this.ages[index] += deltaSeconds;

      const offset = index * 3;
      const fade = Math.max(0, 1 - this.ages[index] / LIFETIME_SECONDS);

      this.velocities[offset + 1] -= GRAVITY * deltaSeconds;
      this.positions[offset] += this.velocities[offset] * deltaSeconds;
      this.positions[offset + 1] += this.velocities[offset + 1] * deltaSeconds;
      this.positions[offset + 2] += this.velocities[offset + 2] * deltaSeconds;
      // A cor vai apagando até o preto: no brilho somado, preto é invisível.
      this.colors[offset] = this.baseColors[offset] * fade;
      this.colors[offset + 1] = this.baseColors[offset + 1] * fade;
      this.colors[offset + 2] = this.baseColors[offset + 2] * fade;
    }

    this.points.geometry.getAttribute('position').needsUpdate = true;
    this.points.geometry.getAttribute('color').needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.points.removeFromParent();
  }
}
