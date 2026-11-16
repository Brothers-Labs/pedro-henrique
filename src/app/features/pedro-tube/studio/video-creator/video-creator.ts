import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { formatFileSize } from '../../../../core/utils/format';
import { extractVideoMetadata } from '../../../../core/utils/video-metadata';
import { ChoiceChips, type ChoiceChip } from '../../components/choice-chips/choice-chips';
import { EffectPicker } from '../../components/effect-picker/effect-picker';
import { EffectStage } from '../../components/effect-stage/effect-stage';
import { ScenePlayer } from '../../components/scene-player/scene-player';
import { NORMAL_EFFECT_ID } from '../../data/tube-effects.data';
import { PEDRO_CHANNEL_ID } from '../../data/tube-seed.data';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '../../engine/tube-storage';
import type { TubeMediaDraft, TubeScene, TubeVideoSource } from '../../models/tube.model';
import { PedroTubeStore } from '../../services/pedro-tube-store.service';
import { MAX_TUBE_MEDIA_BYTES } from '../../services/tube-media.service';
import { CameraRecorder, type CameraRecording } from '../camera-recorder/camera-recorder';
import { newScene, SceneEditor } from '../scene-editor/scene-editor';

const SOURCE_CHIPS: readonly ChoiceChip[] = [
  { value: 'animacao', label: 'Animação', emoji: '🎨' },
  { value: 'arquivo', label: 'Enviar vídeo', emoji: '📁' },
  { value: 'camera', label: 'Gravar', emoji: '📹' },
];

interface PendingMedia extends TubeMediaDraft {
  readonly previewUrl: string;
  readonly label: string;
}

/**
 * Criador de vídeos do PedroTube.
 *
 * Três jeitos de fazer: montar uma animação de cenas, enviar um arquivo do
 * aparelho ou gravar com a câmera. Os três recebem um efeito, que aparece
 * na prévia enquanto a criança escolhe.
 */
@Component({
  selector: 'app-video-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CameraRecorder, ChoiceChips, EffectPicker, EffectStage, SceneEditor, ScenePlayer],
  templateUrl: './video-creator.html',
  styleUrl: '../studio-form.scss',
})
export class VideoCreator {
  /** Canal e efeito que já vêm escolhidos (pela URL do estúdio). */
  readonly initialChannelId = input<string | null>(null);
  readonly initialEffectId = input<string | null>(null);

  protected readonly store = inject(PedroTubeStore);
  private readonly router = inject(Router);

  protected readonly sourceChips = SOURCE_CHIPS;
  protected readonly maxTitleLength = MAX_TITLE_LENGTH;
  protected readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

  protected readonly channelId = linkedSignal(() => {
    const wanted = this.initialChannelId();

    if (wanted && this.store.channel(wanted)) {
      return wanted;
    }

    return this.store.ownChannels().at(-1)?.id ?? PEDRO_CHANNEL_ID;
  });
  protected readonly effectId = linkedSignal(() => {
    const wanted = this.initialEffectId();

    return wanted && this.store.effects().some((effect) => effect.id === wanted) ? wanted : NORMAL_EFFECT_ID;
  });
  protected readonly effect = computed(() => this.store.effect(this.effectId()));

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly source = signal<string>('animacao');
  protected readonly scenes = signal<readonly TubeScene[]>([{ ...newScene(0), text: 'Oi, pessoal!' }]);
  protected readonly media = signal<PendingMedia | null>(null);
  protected readonly isReadingFile = signal(false);
  protected readonly isPublishing = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releaseMedia());
  }

  protected changeSource(source: string): void {
    this.source.set(source);
    this.releaseMedia();
    this.error.set(null);
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];

    inputElement.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('video/')) {
      this.error.set('Esse arquivo não é um vídeo. Escolha outro.');
      return;
    }

    if (file.size > MAX_TUBE_MEDIA_BYTES) {
      this.error.set(`O vídeo passa de ${formatFileSize(MAX_TUBE_MEDIA_BYTES)}. Escolha um menor.`);
      return;
    }

    this.error.set(null);
    this.isReadingFile.set(true);

    try {
      const metadata = await extractVideoMetadata(file);

      this.setMedia({ blob: file, durationSeconds: metadata.durationInSeconds, posterDataUrl: metadata.posterDataUrl }, file.name);
    } finally {
      this.isReadingFile.set(false);
    }
  }

  protected async onRecorded(recording: CameraRecording): Promise<void> {
    const file = new File([recording.blob], 'gravacao', { type: recording.blob.type });
    const metadata = await extractVideoMetadata(file);

    this.setMedia(
      { blob: recording.blob, durationSeconds: recording.durationSeconds, posterDataUrl: metadata.posterDataUrl },
      'Gravação da câmera',
    );
  }

  protected async publish(): Promise<void> {
    this.isPublishing.set(true);
    this.error.set(null);

    try {
      const video = await this.store.publishVideo(
        {
          channelId: this.channelId(),
          title: this.title(),
          description: this.description(),
          source: this.source() as TubeVideoSource,
          scenes: this.scenes(),
          effectId: this.effectId(),
        },
        this.media(),
      );

      void this.router.navigate(['/pedro-tube/assistir', video.id]);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não deu para publicar o vídeo.');
    } finally {
      this.isPublishing.set(false);
    }
  }

  private setMedia(draft: TubeMediaDraft, label: string): void {
    this.releaseMedia();
    this.media.set({ ...draft, label, previewUrl: URL.createObjectURL(draft.blob) });
  }

  private releaseMedia(): void {
    const media = this.media();

    if (media) {
      URL.revokeObjectURL(media.previewUrl);
      this.media.set(null);
    }
  }
}
