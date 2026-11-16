import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatDuration } from '../../../../core/utils/format';
import { formatViews, timeAgo } from '../../engine/tube-feed';
import type { TubeVideo } from '../../models/tube.model';
import { PedroTubeStore } from '../../services/pedro-tube-store.service';
import { EffectStage } from '../effect-stage/effect-stage';
import { SceneView } from '../scene-view/scene-view';
import { TubeAvatar } from '../tube-avatar/tube-avatar';

/** Card de vídeo das listas: miniatura com o efeito, título, canal e visualizações. */
@Component({
  selector: 'app-tube-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EffectStage, SceneView, TubeAvatar],
  host: { '[class.card--row]': 'layout() === "row"' },
  templateUrl: './tube-video-card.html',
  styleUrl: './tube-video-card.scss',
})
export class TubeVideoCard {
  readonly video = input.required<TubeVideo>();
  /** `grade` no início e no canal; `linha` na lista de próximos vídeos. */
  readonly layout = input<'grid' | 'row'>('grid');
  readonly showChannel = input(true);

  private readonly store = inject(PedroTubeStore);

  protected readonly channel = computed(() => this.store.channel(this.video().channelId));
  protected readonly effect = computed(() => this.store.effect(this.video().effectId));
  protected readonly duration = computed(() => formatDuration(this.video().durationSeconds));
  protected readonly meta = computed(
    () => `${formatViews(this.store.viewsOf(this.video().id))} • ${timeAgo(this.video().createdAt, Date.now())}`,
  );
  protected readonly link = computed(() => ['/pedro-tube/assistir', this.video().id]);
}
