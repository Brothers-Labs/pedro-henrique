import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { TubeAvatar } from '../../components/tube-avatar/tube-avatar';
import { TubeLogo } from '../../components/tube-logo/tube-logo';
import { TubeVideoCard } from '../../components/tube-video-card/tube-video-card';
import { searchVideos } from '../../engine/tube-feed';
import { PedroTubeStore } from '../../services/pedro-tube-store.service';

const SUBSCRIPTIONS_FILTER = 'inscricoes';

/**
 * Início do PedroTube: os vídeos de todos os canais, com filtro por canal,
 * pelas inscrições e pela busca da barra de cima. Os filtros moram na URL.
 */
@Component({
  selector: 'app-tube-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyState, TubeAvatar, TubeLogo, TubeVideoCard],
  templateUrl: './tube-home.html',
  styleUrl: './tube-home.scss',
})
export class TubeHome {
  protected readonly store = inject(PedroTubeStore);

  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  protected readonly subscriptionsFilter = SUBSCRIPTIONS_FILTER;
  protected readonly term = computed(() => this.params().get('busca')?.trim() ?? '');
  protected readonly filter = computed(() => this.params().get('canal') ?? '');

  protected readonly visibleVideos = computed(() => {
    const filter = this.filter();
    const subscriptions = this.store.subscriptions();
    const videos = this.store.videos().filter((video) => {
      if (filter === SUBSCRIPTIONS_FILTER) {
        return subscriptions.has(video.channelId);
      }

      return !filter || video.channelId === filter;
    });

    return searchVideos(videos, this.store.channels(), this.term());
  });

  protected readonly heading = computed(() => {
    const filter = this.filter();

    if (filter === SUBSCRIPTIONS_FILTER) {
      return 'Das suas inscrições';
    }

    return this.store.channel(filter)?.name ?? 'Vídeos para você';
  });
}
