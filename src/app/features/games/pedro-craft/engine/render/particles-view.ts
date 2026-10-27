import { BoxGeometry, Color, DynamicDrawUsage, InstancedMesh, Matrix4, MeshBasicMaterial, type Scene } from 'three';

const CAPACITY = 120;
const PER_BLOCK = 10;
const LIFETIME_MS = 650;
const GRAVITY = 14;
const SIZE = 0.12;

interface Particle {
  x: number;
  y: number;
  z: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  ageMs: number;
}

/**
 * Pedacinhos do bloco quebrado, na cor dele.
 *
 * Uma malha instanciada para todos: dez cubinhos por bloco custam uma única
 * chamada à placa de vídeo. Com os efeitos desligados (modo calmo), nada sai.
 */
export class ParticlesView {
  private readonly mesh: InstancedMesh<BoxGeometry, MeshBasicMaterial>;
  private readonly particles: (Particle | null)[] = Array.from({ length: CAPACITY }, () => null);
  private readonly matrix = new Matrix4();
  private readonly color = new Color();
  private readonly tint = new Color();
  private next = 0;

  constructor(scene: Scene) {
    this.mesh = new InstancedMesh(new BoxGeometry(SIZE, SIZE, SIZE), new MeshBasicMaterial(), CAPACITY);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = CAPACITY;
    this.mesh.frustumCulled = false;
    this.hideAll();
    scene.add(this.mesh);
  }

  burst(x: number, y: number, z: number, color: string): void {
    this.color.set(color);

    for (let index = 0; index < PER_BLOCK; index += 1) {
      const slot = this.next;

      this.next = (this.next + 1) % CAPACITY;
      this.particles[slot] = {
        x: x + 0.2 + Math.random() * 0.6,
        y: y + 0.2 + Math.random() * 0.6,
        z: z + 0.2 + Math.random() * 0.6,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: 1.5 + Math.random() * 2.5,
        velocityZ: (Math.random() - 0.5) * 3,
        ageMs: 0,
      };
      this.mesh.setColorAt(slot, this.tint.copy(this.color).multiplyScalar(0.75 + Math.random() * 0.35));
    }

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(frameMs: number): void {
    const seconds = frameMs / 1000;

    this.particles.forEach((particle, slot) => {
      if (!particle) {
        return;
      }

      particle.ageMs += frameMs;

      if (particle.ageMs >= LIFETIME_MS) {
        this.particles[slot] = null;
        this.matrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(slot, this.matrix);
        return;
      }

      particle.velocityY -= GRAVITY * seconds;
      particle.x += particle.velocityX * seconds;
      particle.y += particle.velocityY * seconds;
      particle.z += particle.velocityZ * seconds;

      const scale = 1 - particle.ageMs / LIFETIME_MS;

      this.matrix.makeScale(scale, scale, scale).setPosition(particle.x, particle.y, particle.z);
      this.mesh.setMatrixAt(slot, this.matrix);
    });

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }

  private hideAll(): void {
    this.matrix.makeScale(0, 0, 0);

    for (let slot = 0; slot < CAPACITY; slot += 1) {
      this.mesh.setMatrixAt(slot, this.matrix);
    }
  }
}
