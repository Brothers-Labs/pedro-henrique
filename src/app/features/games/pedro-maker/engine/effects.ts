import * as Phaser from 'phaser';

import { TEXTURES } from '../art/texture-catalog';

export const DEPTH = {
  sky: -100,
  far: -90,
  clouds: -85,
  mid: -80,
  decor: -10,
  terrain: 0,
  blocks: 1,
  items: 5,
  enemies: 8,
  player: 10,
  particles: 20,
  darkness: 50,
  labels: 60,
} as const;

type BurstKind = 'dust' | 'coin' | 'crystal' | 'poof' | 'sparkle' | 'confetti';

const BURST_COLORS: Readonly<Record<BurstKind, readonly number[]>> = {
  dust: [0xffffff, 0xe8e0d0],
  coin: [0xffe066, 0xffc629],
  crystal: [0x9ee8ff, 0x4fd8ff, 0xffffff],
  poof: [0xffffff, 0xd9d2f5],
  sparkle: [0xffe066, 0xffffff, 0xb39cff],
  confetti: [0xff4f9a, 0x2ba8e0, 0xffb703, 0x12b886, 0x7b52d3, 0xf4772e],
};

/**
 * Partículas, textos flutuantes e tremores de câmera.
 *
 * Um emissor por tipo, criado uma vez e reaproveitado: explodir partículas não
 * cria objeto novo a cada moeda — o Phaser recicla as partículas mortas.
 *
 * Com os efeitos desligados nas configurações, nada disso aparece; o jogo
 * continua igual, só mais calmo.
 */
export class Effects {
  private readonly emitters = new Map<BurstKind, Phaser.GameObjects.Particles.ParticleEmitter>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isEnabled: boolean,
  ) {
    if (!isEnabled) {
      return;
    }

    this.emitters.set('dust', this.createEmitter(TEXTURES.dot, 'dust', { speed: { min: 30, max: 90 }, scale: { start: 0.9, end: 0 }, lifespan: 380, gravityY: -40 }));
    this.emitters.set('coin', this.createEmitter(TEXTURES.star, 'coin', { speed: { min: 80, max: 180 }, scale: { start: 0.8, end: 0 }, lifespan: 450 }));
    this.emitters.set('crystal', this.createEmitter(TEXTURES.spark, 'crystal', { speed: { min: 120, max: 260 }, scale: { start: 1, end: 0 }, lifespan: 700, rotate: { min: 0, max: 360 } }));
    this.emitters.set('poof', this.createEmitter(TEXTURES.dot, 'poof', { speed: { min: 60, max: 160 }, scale: { start: 1.4, end: 0 }, lifespan: 420 }));
    this.emitters.set('sparkle', this.createEmitter(TEXTURES.star, 'sparkle', { speed: { min: 40, max: 140 }, scale: { start: 0.9, end: 0 }, lifespan: 800, gravityY: -60 }));
    this.emitters.set('confetti', this.createEmitter(TEXTURES.spark, 'confetti', { speed: { min: 200, max: 420 }, scale: { start: 1, end: 0.4 }, lifespan: 1400, gravityY: 500, rotate: { min: 0, max: 360 } }));
  }

  burst(kind: BurstKind, x: number, y: number, count = 10): void {
    this.emitters.get(kind)?.explode(count, x, y);
  }

  /** Texto que sobe e some: "+1", "CHECKPOINT!", "ESCUDO!". */
  floatingText(x: number, y: number, text: string, color = '#ffffff'): void {
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: '"Baloo 2", "Trebuchet MS", sans-serif',
        fontSize: '28px',
        fontStyle: '800',
        color,
        stroke: '#2a2350',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels);

    this.scene.tweens.add({
      targets: label,
      y: y - 60,
      alpha: 0,
      duration: this.isEnabled ? 900 : 700,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Tremor curto e fraco: dá peso ao impacto sem enjoar ninguém. */
  shake(intensity: 'leve' | 'forte' = 'leve'): void {
    if (!this.isEnabled) {
      return;
    }

    this.scene.cameras.main.shake(intensity === 'forte' ? 260 : 140, intensity === 'forte' ? 0.008 : 0.0035);
  }

  private createEmitter(
    texture: string,
    kind: BurstKind,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.scene.add
      .particles(0, 0, texture, {
        ...config,
        tint: [...BURST_COLORS[kind]],
        emitting: false,
        maxAliveParticles: 120,
      })
      .setDepth(DEPTH.particles);
  }
}
