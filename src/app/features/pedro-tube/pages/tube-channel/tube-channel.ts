import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SubscribeButton } from '../../components/subscribe-button/subscribe-button';
import { TubeAvatar } from '../../components/tube-avatar/tube-avatar';
import { TubeVideoCard } from '../../components/tube-video-card/tube-video-card';
import { PedroTubeStore } from '../../services/pedro-tube-store.service';

/** Página do canal: banner, bolinha, @, botão de inscrição e todos os vídeos dele. */
@Component({
  selector: 'app-tube-channel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyState, SubscribeButton, TubeAvatar, TubeVideoCard],
  templateUrl: './tube-channel.html',
  styleUrl: './tube-channel.scss',
})
export class TubeChannelPage {
  protected readonly store = inject(PedroTubeStore);
  private readonly router = inject(Router);

  private readonly channelId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly channel = computed(() => this.store.channel(this.channelId()));
  protected readonly videos = computed(() => this.store.videosOf(this.channelId()));
  protected readonly isOwn = computed(() => this.store.isOwnChannel(this.channelId()));
  protected readonly isConfirmingDelete = signal(false);

  protected async deleteChannel(): Promise<void> {
    if (await this.store.deleteChannel(this.channelId())) {
      void this.router.navigate(['/pedro-tube']);
    }
  }
}
