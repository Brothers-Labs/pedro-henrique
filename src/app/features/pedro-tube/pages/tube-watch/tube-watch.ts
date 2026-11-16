import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { EffectPicker } from '../../components/effect-picker/effect-picker';
import { SubscribeButton } from '../../components/subscribe-button/subscribe-button';
import { TubeAvatar } from '../../components/tube-avatar/tube-avatar';
import { TubePlayer } from '../../components/tube-player/tube-player';
import { TubeVideoCard } from '../../components/tube-video-card/tube-video-card';
import { formatViews } from '../../engine/tube-feed';
import { PedroTubeStore } from '../../services/pedro-tube-store.service';

const UP_NEXT_LIMIT = 8;

/** Página de um vídeo: o player, o canal, o "AMO", os efeitos e o que assistir depois. */
@Component({
  selector: 'app-tube-watch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, EmptyState, EffectPicker, SubscribeButton, TubeAvatar, TubePlayer, TubeVideoCard],
  templateUrl: './tube-watch.html',
  styleUrl: './tube-watch.scss',
})
export class TubeWatch {
  protected readonly store = inject(PedroTubeStore);
  private readonly router = inject(Router);

  private readonly videoId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly video = computed(() => this.store.video(this.videoId()));
  protected readonly channel = computed(() => {
    const video = this.video();

    return video ? this.store.channel(video.channelId) : undefined;
  });
  protected readonly isOwn = computed(() => this.store.isOwnVideo(this.videoId()));
  protected readonly isLiked = computed(() => this.store.isLiked(this.videoId()));
  protected readonly views = computed(() => formatViews(this.store.viewsOf(this.videoId())));
  protected readonly channelVideoCount = computed(() => {
    const channel = this.channel();

    return channel ? this.store.videosOf(channel.id).length : 0;
  });

  /** O efeito que está tocando agora: começa no do vídeo, e o visitante pode experimentar outros. */
  protected readonly previewEffectId = linkedSignal(() => this.video()?.effectId ?? 'normal');
  protected readonly previewEffect = computed(() => this.store.effect(this.previewEffectId()));
  protected readonly isTryingEffect = computed(() => this.previewEffectId() !== (this.video()?.effectId ?? 'normal'));

  /** Primeiro os outros vídeos do mesmo canal, depois os dos outros canais. */
  protected readonly upNext = computed(() => {
    const video = this.video();

    if (!video) {
      return [];
    }

    const others = this.store.videos().filter((candidate) => candidate.id !== video.id);
    const sameChannel = others.filter((candidate) => candidate.channelId === video.channelId);
    const otherChannels = others.filter((candidate) => candidate.channelId !== video.channelId);

    return [...sameChannel, ...otherChannels].slice(0, UP_NEXT_LIMIT);
  });

  protected readonly isConfirmingDelete = signal(false);
  protected readonly feedback = signal<string | null>(null);

  constructor() {
    // Cada vídeo aberto conta uma visualização.
    effect(() => {
      const id = this.videoId();

      if (id) {
        untracked(() => {
          this.store.countView(id);
          this.isConfirmingDelete.set(false);
          this.feedback.set(null);
        });
      }
    });
  }

  protected toggleLike(): void {
    this.store.toggleLike(this.videoId());
  }

  protected keepEffect(): void {
    if (this.store.setVideoEffect(this.videoId(), this.previewEffectId())) {
      this.feedback.set(`Pronto! O vídeo agora usa o efeito ${this.previewEffect().name}.`);
    }
  }

  protected async deleteVideo(): Promise<void> {
    const channelId = this.video()?.channelId;

    if (await this.store.deleteVideo(this.videoId())) {
      void this.router.navigate(channelId ? ['/pedro-tube/canal', channelId] : ['/pedro-tube']);
    }
  }
}
