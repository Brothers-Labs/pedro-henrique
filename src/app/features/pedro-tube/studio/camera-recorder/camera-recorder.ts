import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { formatDuration } from '../../../../core/utils/format';
import { EffectStage } from '../../components/effect-stage/effect-stage';
import type { TubeEffect } from '../../models/tube.model';

/** Uma gravação termina sozinha neste tempo: vídeo curto cabe no aparelho. */
export const MAX_RECORDING_SECONDS = 60;

const MIME_CANDIDATES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

type RecorderStatus = 'parado' | 'abrindo' | 'pronto' | 'gravando' | 'erro';

export interface CameraRecording {
  readonly blob: Blob;
  readonly durationSeconds: number;
}

/**
 * Grava um vídeo com a câmera do aparelho.
 *
 * A prévia ao vivo já mostra o efeito escolhido, mas o arquivo é gravado
 * limpo: o efeito é aplicado na hora de tocar, então dá para trocar depois.
 */
@Component({
  selector: 'app-camera-recorder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EffectStage],
  templateUrl: './camera-recorder.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .camera__video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }

    .camera__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .camera__hint {
      margin: 0;
      color: #b9b3d9;
    }

    .camera__clock {
      font-variant-numeric: tabular-nums;
      font-weight: 800;
    }

    .camera__rec {
      color: #ff4b4b;
    }

    .camera__message {
      display: grid;
      height: 100%;
      margin: 0;
      padding: 1rem;
      place-items: center;
      color: #ffffff;
      text-align: center;
    }
  `,
})
export class CameraRecorder {
  readonly effect = input.required<TubeEffect>();
  readonly recorded = output<CameraRecording>();

  protected readonly status = signal<RecorderStatus>('parado');
  protected readonly seconds = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly clock = computed(() => `${formatDuration(this.seconds())} / ${formatDuration(MAX_RECORDING_SECONDS)}`);
  protected readonly isSupported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.closeCamera());

    // A câmera aparece na prévia assim que o elemento de vídeo existe.
    effect(() => {
      const element = this.preview()?.nativeElement;

      if (element && this.stream && element.srcObject !== this.stream) {
        element.srcObject = this.stream;
        void element.play().catch(() => undefined);
      }
    });
  }

  protected async openCamera(): Promise<void> {
    this.status.set('abrindo');

    try {
      this.stream = await navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' }, audio: true })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }));
      this.status.set('pronto');
    } catch {
      this.errorMessage.set('Não deu para abrir a câmera. Peça para um adulto liberar a câmera no navegador.');
      this.status.set('erro');
    }
  }

  protected startRecording(): void {
    if (!this.stream) {
      return;
    }

    const mimeType = MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
    const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);

    this.chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    recorder.onstop = () => this.finish(recorder.mimeType || mimeType || 'video/webm');
    recorder.start(1000);

    this.recorder = recorder;
    this.startedAt = performance.now();
    this.seconds.set(0);
    this.status.set('gravando');
    this.clockTimer = setInterval(() => {
      const seconds = (performance.now() - this.startedAt) / 1000;

      this.seconds.set(Math.floor(seconds));

      if (seconds >= MAX_RECORDING_SECONDS) {
        this.stopRecording();
      }
    }, 250);
  }

  protected stopRecording(): void {
    this.stopClock();

    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }
  }

  private finish(mimeType: string): void {
    const durationSeconds = Math.min(MAX_RECORDING_SECONDS, (performance.now() - this.startedAt) / 1000);
    const blob = new Blob(this.chunks, { type: mimeType.split(';')[0] });

    this.recorder = null;
    this.chunks = [];
    this.status.set('pronto');

    if (blob.size > 0) {
      this.recorded.emit({ blob, durationSeconds });
    }
  }

  private stopClock(): void {
    if (this.clockTimer !== null) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private closeCamera(): void {
    this.stopClock();

    if (this.recorder?.state === 'recording') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
