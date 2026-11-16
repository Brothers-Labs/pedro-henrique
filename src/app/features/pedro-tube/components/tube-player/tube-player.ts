import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import type { TubeEffect, TubeVideo } from '../../models/tube.model';
import { TubeMediaService } from '../../services/tube-media.service';
import { EffectStage } from '../effect-stage/effect-stage';
import { ScenePlayer } from '../scene-player/scene-player';

type MediaState = { readonly status: 'loading' } | { readonly status: 'ready'; readonly url: string } | { readonly status: 'missing' };

/**
 * O player do PedroTube: a animação toca no player de cenas; o vídeo enviado
 * ou gravado toca no `<video>` do navegador, buscado no banco do aparelho.
 * Os dois recebem o mesmo efeito por cima.
 */
@Component({
  selector: 'app-tube-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EffectStage, ScenePlayer],
  template: `
    @if (video().source === 'animacao') {
      <app-scene-player [scenes]="video().scenes" [effect]="effect()" />
    } @else {
      <app-effect-stage [effect]="effect()">
        @switch (media().status) {
          @case ('ready') {
            <video
              class="player__video"
              controls
              playsinline
              [src]="$any(media()).url"
              [attr.poster]="video().posterDataUrl"
              [attr.aria-label]="video().title"
            ></video>
          }
          @case ('missing') {
            <p class="player__message">📼 Este vídeo foi guardado em outro aparelho e não está aqui.</p>
          }
          @default {
            <p class="player__message">Carregando o vídeo…</p>
          }
        }
      </app-effect-stage>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .player__video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000000;
    }

    .player__message {
      display: grid;
      height: 100%;
      margin: 0;
      padding: 1rem;
      place-items: center;
      color: #ffffff;
      font-family: var(--font-display);
      text-align: center;
    }
  `,
})
export class TubePlayer {
  readonly video = input.required<TubeVideo>();
  readonly effect = input.required<TubeEffect>();

  private readonly mediaService = inject(TubeMediaService);

  protected readonly media = signal<MediaState>({ status: 'loading' });

  constructor() {
    effect((onCleanup) => {
      const mediaId = this.video().mediaId;
      let isCurrent = true;

      onCleanup(() => (isCurrent = false));
      this.media.set({ status: 'loading' });

      if (!mediaId) {
        return;
      }

      void this.mediaService.urlFor(mediaId).then((url) => {
        if (isCurrent) {
          this.media.set(url ? { status: 'ready', url } : { status: 'missing' });
        }
      });
    });
  }
}
