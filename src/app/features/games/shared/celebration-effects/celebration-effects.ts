import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  viewChild,
} from '@angular/core';

import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';
import { THEME_COLOR_HEX, THEME_COLORS } from '../../../../core/theme/theme-colors';

/** Duração total da chuva de confetes. Comemoração curta é comemoração boa. */
const DURATION_IN_MS = 2600;

/** A partir daqui os confetes começam a desaparecer, em vez de sumir de uma vez. */
const FADE_START_IN_MS = 1700;

const PARTICLE_COUNT = 70;
const GRAVITY = 0.12;
const DRAG = 0.992;

/** Telas de alta densidade ficam nítidas em 2x; além disso só custa memória. */
const MAX_PIXEL_RATIO = 2;

const BALLOON_COUNT = 6;

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  spin: number;
  width: number;
  height: number;
  color: string;
}

/**
 * Confetes e balões da comemoração.
 *
 * Os confetes são um `<canvas>` só, desenhado fora da zona do Angular: setenta
 * partículas em um elemento custam muito menos do que setenta elementos no DOM,
 * e nenhum quadro dispara detecção de mudanças.
 *
 * Tudo aqui é decorativo — o host é `aria-hidden` e não recebe toque, para não
 * roubar nenhum clique do botão que está embaixo.
 */
@Component({
  selector: 'app-celebration-effects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  templateUrl: './celebration-effects.html',
  styleUrl: './celebration-effects.scss',
})
export class CelebrationEffects {
  /** Liga a festa. Voltar para falso interrompe e limpa tudo na hora. */
  readonly isActive = input(false);

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly motion = inject(MotionPreferenceService);

  private animationHandle: number | null = null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;
  private particles: Particle[] = [];

  /**
   * Modo calmo e `prefers-reduced-motion` desligam o movimento.
   *
   * A comemoração não some: ela vira um brilho parado, desenhado pelo modal.
   * O que sai é o estímulo, não o reconhecimento.
   */
  protected readonly isMotionAllowed = computed(() => this.motion.isAllowed());
  protected readonly balloons = Array.from({ length: BALLOON_COUNT }, (_, index) => index);

  constructor() {
    effect(() => {
      const shouldPlay = this.isActive() && this.isMotionAllowed();

      // `untracked` é desnecessário: só lemos signals e agendamos trabalho fora.
      queueMicrotask(() => (shouldPlay ? this.start() : this.stop()));
    });

    inject(DestroyRef).onDestroy(() => this.stop());
  }

  private start(): void {
    const element = this.canvas()?.nativeElement;
    if (!element || this.animationHandle !== null) {
      return;
    }

    const context = element.getContext('2d');
    if (!context) {
      return;
    }

    const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
    const width = element.clientWidth;
    const height = element.clientHeight;

    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    context.scale(ratio, ratio);

    this.particles = createParticles(width, height);

    this.zone.runOutsideAngular(() => {
      const startedAt = performance.now();

      const frame = (now: number): void => {
        const elapsed = now - startedAt;
        this.drawFrame(context, width, height, elapsed);

        if (elapsed < DURATION_IN_MS) {
          this.animationHandle = requestAnimationFrame(frame);
          return;
        }

        this.animationHandle = null;
        context.clearRect(0, 0, width, height);
      };

      this.animationHandle = requestAnimationFrame(frame);
    });

    this.stopTimeout = setTimeout(() => this.stop(), DURATION_IN_MS);
  }

  private drawFrame(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    elapsed: number,
  ): void {
    context.clearRect(0, 0, width, height);
    context.globalAlpha = fadeAt(elapsed);

    for (const particle of this.particles) {
      particle.velocityY += GRAVITY;
      particle.velocityX *= DRAG;
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.rotation += particle.spin;

      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
      context.restore();
    }

    context.globalAlpha = 1;
  }

  private stop(): void {
    if (this.animationHandle !== null) {
      cancelAnimationFrame(this.animationHandle);
      this.animationHandle = null;
    }

    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    this.particles = [];

    const element = this.canvas()?.nativeElement;
    element?.getContext('2d')?.clearRect(0, 0, element.width, element.height);
  }
}

/** Opacidade da chuva: cheia no começo, apagando no fim. */
function fadeAt(elapsed: number): number {
  if (elapsed <= FADE_START_IN_MS) {
    return 1;
  }

  const remaining = DURATION_IN_MS - elapsed;

  return Math.max(0, remaining / (DURATION_IN_MS - FADE_START_IN_MS));
}

/** Partículas saindo do topo, espalhadas pela largura e com impulso para baixo. */
function createParticles(width: number, height: number): Particle[] {
  const palette = THEME_COLORS.map((color) => THEME_COLOR_HEX[color].base);

  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    x: Math.random() * width,
    y: -Math.random() * height * 0.4,
    velocityX: (Math.random() - 0.5) * 3,
    velocityY: 1 + Math.random() * 3,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.24,
    width: 6 + Math.random() * 6,
    height: 10 + Math.random() * 8,
    color: palette[index % palette.length],
  }));
}
