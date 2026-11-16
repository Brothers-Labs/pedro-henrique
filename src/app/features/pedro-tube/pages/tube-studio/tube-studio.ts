import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { ChannelCreator } from '../../studio/channel-creator/channel-creator';
import { EffectCreator } from '../../studio/effect-creator/effect-creator';
import { VideoCreator } from '../../studio/video-creator/video-creator';

type StudioTab = 'canal' | 'video' | 'efeito';

interface StudioTabOption {
  readonly id: StudioTab;
  readonly label: string;
  readonly emoji: string;
}

const TABS: readonly StudioTabOption[] = [
  { id: 'video', label: 'Criar vídeo', emoji: '🎬' },
  { id: 'canal', label: 'Criar canal', emoji: '📺' },
  { id: 'efeito', label: 'Criar efeito', emoji: '✨' },
];

/** Estúdio do PedroTube: criar canal, criar vídeo e criar efeito, cada um na sua aba. */
@Component({
  selector: 'app-tube-studio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChannelCreator, EffectCreator, VideoCreator],
  templateUrl: './tube-studio.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .studio-page__title {
      margin: 0;
      font-size: var(--text-2xl);
    }

    .studio-page__tabs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      border-bottom: 2px solid rgb(255 255 255 / 12%);
    }

    .studio-page__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 2.75rem;
      margin-bottom: -2px;
      padding: 0.5rem 1rem;
      border: 0;
      border-bottom: 4px solid transparent;
      background: transparent;
      color: #b9b3d9;
      font-family: var(--font-display);
      font-size: var(--text-md);
      font-weight: 800;
      cursor: pointer;

      &[aria-selected='true'] {
        border-bottom-color: #e5243b;
        color: #ffffff;
      }

      &:focus-visible {
        outline: 3px solid #c86bff;
        outline-offset: -3px;
      }
    }
  `,
})
export class TubeStudio {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly tabs = TABS;
  protected readonly tab = computed<StudioTab>(() => {
    const wanted = this.params().get('aba');

    return TABS.find((option) => option.id === wanted)?.id ?? 'video';
  });
  protected readonly channelId = computed(() => this.params().get('canal'));
  protected readonly effectId = computed(() => this.params().get('efeito'));

  protected select(tab: StudioTab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { aba: tab }, replaceUrl: true });
  }
}
