import { BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';

import type { BurstKind } from '../simulation/visual-events';

interface BurstStyle {
  /** Velocidade em blocos por segundo. */
  readonly minSpeed: number;
  readonly maxSpeed: number;
  readonly startScale: number;
  readonly endScale: number;
  readonly lifeMs: number;
  /** Positivo cai, negativo sobe (poeira e brilho flutuam). */
  readonly gravity: number;
  readonly colors: readonly string[];
}

const STYLES: Readonly<Record<BurstKind, BurstStyle>> = {
  dust: { minSpeed: 0.6, maxSpeed: 1.9, startScale: 1, endScale: 0, lifeMs: 380, gravity: -0.8, colors: ['#ffffff', '#e8e0d0'] },
  coin: { minSpeed: 1.7, maxSpeed: 3.8, startScale: 0.9, endScale: 0, lifeMs: 450, gravity: 0, colors: ['#ffe066', '#ffc629'] },
  crystal: { minSpeed: 2.5, maxSpeed: 5.4, startScale: 1.1, endScale: 0, lifeMs: 700, gravity: 0, colors: ['#9ee8ff', '#4fd8ff', '#ffffff'] },
  poof: { minSpeed: 1.2, maxSpeed: 3.3, startScale: 1.5, endScale: 0, lifeMs: 420, gravity: 0, colors: ['#ffffff', '#d9d2f5'] },
  sparkle: { minSpeed: 0.8, maxSpeed: 2.9, startScale: 1, endScale: 0, lifeMs: 800, gravity: -1.2, colors: ['#ffe066', '#ffffff', '#b39cff'] },
  bubble: { minSpeed: 0.5, maxSpeed: 1.8, startScale: 0.9, endScale: 0.3, lifeMs: 650, gravity: -2.4, colors: ['#ffffff', '#bfe9ff', '#7fd0ff'] },
  fire: { minSpeed: 0.8, maxSpeed: 2.4, startScale: 1.1, endScale: 0, lifeMs: 360, gravity: -1.5, colors: ['#ffd23f', '#ff8a1f', '#ff4f1f'] },
  ice: { minSpeed: 1, maxSpeed: 2.8, startScale: 1, endScale: 0, lifeMs: 480, gravity: 2, colors: ['#ffffff', '#c8f0ff', '#5cc8ff'] },
  confetti: {
    minSpeed: 4.2,
    maxSpeed: 8.7,
    startScale: 1.1,
    endScale: 0.45,
    lifeMs: 1400,
    gravity: 10,
    colors: ['#ff4f9a', '#2ba8e0', '#ffb703', '#12b886', '#7b52d3', '#f4772e'],
  },
};

const CUBE_SIZE = 0.13;

/**
 * Partículas em cubinhos, no estilo do mundo de cubos.
 *
 * Um conjunto fixo de cubos numa malha instanciada: explodir poeira não cria
 * objeto novo — reaproveita os cubos que já morreram. Quando o conjunto
 * enche, a explosão nova simplesmente sai menor.
 */
export class ParticleSystem {
  readonly mesh: InstancedMesh;

  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly ages: Float32Array;
  private readonly lives: Float32Array;
  private readonly scales: Float32Array;
  private readonly gravities: Float32Array;
  private readonly spins: Float32Array;
  private active = 0;

  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3();
  private readonly axis = new Vector3(0.4, 1, 0.2).normalize();
  private readonly color = new Color();

  private readonly material = new MeshBasicMaterial();

  constructor(private capacity: number) {
    this.mesh = new InstancedMesh(new BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE), this.material, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.positions = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.ages = new Float32Array(capacity);
    this.lives = new Float32Array(capacity);
    this.scales = new Float32Array(capacity * 2);
    this.gravities = new Float32Array(capacity);
    this.spins = new Float32Array(capacity);
  }

  /** Reduz o máximo de cubos vivos quando a qualidade cai. */
  limit(capacity: number): void {
    this.capacity = Math.min(capacity, this.lives.length);
    this.active = Math.min(this.active, this.capacity);
  }

  burst(kind: BurstKind, x: number, y: number, count: number): void {
    const style = STYLES[kind];

    for (let index = 0; index < count && this.active < this.capacity; index += 1) {
      const slot = this.active;
      const angle = Math.random() * Math.PI * 2;
      const speed = style.minSpeed + Math.random() * (style.maxSpeed - style.minSpeed);

      const base = slot * 3;

      this.positions[base] = x;
      this.positions[base + 1] = y;
      this.positions[base + 2] = (Math.random() - 0.5) * 0.4;
      this.velocities[base] = Math.cos(angle) * speed;
      this.velocities[base + 1] = Math.sin(angle) * speed;
      this.velocities[base + 2] = (Math.random() - 0.5) * speed * 0.6;
      this.ages[slot] = 0;
      this.lives[slot] = style.lifeMs * (0.75 + Math.random() * 0.25);
      this.scales[slot * 2] = style.startScale;
      this.scales[slot * 2 + 1] = style.endScale;
      this.gravities[slot] = style.gravity;
      this.spins[slot] = (Math.random() - 0.5) * 12;
      this.mesh.setColorAt(slot, this.color.set(style.colors[index % style.colors.length] ?? '#ffffff'));
      this.active += 1;
    }

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(deltaSeconds: number): void {
    const deltaMs = deltaSeconds * 1000;
    let slot = 0;

    while (slot < this.active) {
      this.ages[slot] += deltaMs;

      if (this.ages[slot] >= this.lives[slot]) {
        this.moveLastInto(slot);
        continue;
      }

      const base = slot * 3;

      this.velocities[base + 1] -= this.gravities[slot] * deltaSeconds;
      this.positions[base] += this.velocities[base] * deltaSeconds;
      this.positions[base + 1] += this.velocities[base + 1] * deltaSeconds;
      this.positions[base + 2] += this.velocities[base + 2] * deltaSeconds;

      const progress = this.ages[slot] / this.lives[slot];
      const size = this.scales[slot * 2] + (this.scales[slot * 2 + 1] - this.scales[slot * 2]) * progress;

      this.position.set(this.positions[base], this.positions[base + 1], this.positions[base + 2]);
      this.rotation.setFromAxisAngle(this.axis, this.spins[slot] * progress);
      this.scale.setScalar(Math.max(0.001, size));
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(slot, this.matrix);
      slot += 1;
    }

    this.mesh.count = this.active;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }

  /** Tira a partícula morta trazendo a última viva para o lugar dela. */
  private moveLastInto(slot: number): void {
    const last = this.active - 1;

    if (slot !== last) {
      this.positions.copyWithin(slot * 3, last * 3, last * 3 + 3);
      this.velocities.copyWithin(slot * 3, last * 3, last * 3 + 3);
      this.scales.copyWithin(slot * 2, last * 2, last * 2 + 2);
      this.ages[slot] = this.ages[last];
      this.lives[slot] = this.lives[last];
      this.gravities[slot] = this.gravities[last];
      this.spins[slot] = this.spins[last];

      this.mesh.getColorAt(last, this.color);
      this.mesh.setColorAt(slot, this.color);
    }

    this.active = last;

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
