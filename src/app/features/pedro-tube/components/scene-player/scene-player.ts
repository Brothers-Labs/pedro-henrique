import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';

import { formatDuration } from '../../../../core/utils/format';
import { sceneAt, totalDuration } from '../../engine/scene-timeline';
import type { TubeEffect, TubeScene } from '../../models/tube.model';
import { EffectStage } from '../effect-stage/effect-stage';
import { SceneView } from '../scene-view/scene-view';

/** De quanto em quanto tempo o relógio da animação anda, em milissegundos. */
const TICK_MS = 100;

/**
 * Toca um vídeo de animação: as cenas uma depois da outra, com o efeito por
 * cima e controles de tocar, pausar e pular.
 *
 * O relógio é próprio (não há arquivo de vídeo): conta o tempo real que
 * passou entre um passo e outro, então a animação não atrasa se a aba
 * engasgar.
 */
@Component({
  selector: 'app-scene-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EffectStage, SceneView],
  templateUrl: './scene-player.html',
  styleUrl: './scene-player.scss',
})
export class ScenePlayer {
  readonly scenes = input.required<readonly TubeScene[]>();
  readonly effect = input.required<TubeEffect>();
  readonly autoplay = input(true);
  /** Toca de novo do começo quando acaba (usado nas prévias do estúdio). */
  readonly loop = input(false);

  readonly ended = output<void>();

  protected readonly time = signal(0);
  protected readonly isPlaying = signal(false);

  protected readonly duration = computed(() => totalDuration(this.scenes()));
  /** Lista de um item só, para o `@for` recriar a cena (e reiniciar a animação) quando ela muda. */
  protected readonly current = computed(() => {
    const position = sceneAt(this.scenes(), this.time());

    return position ? [position] : [];
  });
  protected readonly timeLabel = computed(() => `${formatDuration(this.time())} / ${formatDuration(this.duration())}`);

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimer());

    effect(() => {
      if (this.autoplay()) {
        untracked(() => this.play());
      }
    });

    // Cenas trocadas no estúdio: se o tempo ficou além do fim, volta ao começo.
    effect(() => {
      const duration = this.duration();

      if (untracked(this.time) > duration) {
        this.time.set(0);
      }
    });
  }

  play(): void {
    if (this.time() >= this.duration()) {
      this.time.set(0);
    }

    this.isPlaying.set(true);
    this.startTimer();
  }

  pause(): void {
    this.isPlaying.set(false);
    this.stopTimer();
  }

  protected togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  protected seek(value: string): void {
    const seconds = Number(value);

    if (Number.isFinite(seconds)) {
      this.time.set(Math.min(this.duration(), Math.max(0, seconds)));
    }
  }

  private startTimer(): void {
    if (this.timer !== null || typeof window === 'undefined') {
      return;
    }

    this.lastTick = performance.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const now = performance.now();
    const elapsed = (now - this.lastTick) / 1000;
    const next = this.time() + elapsed;

    this.lastTick = now;

    if (next < this.duration()) {
      this.time.set(next);
      return;
    }

    if (this.loop()) {
      this.time.set(0);
      return;
    }

    this.time.set(this.duration());
    this.pause();
    this.ended.emit();
  }
}
