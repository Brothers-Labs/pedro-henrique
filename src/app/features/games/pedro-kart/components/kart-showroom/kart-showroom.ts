import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { MotionPreferenceService } from '../../../../../core/services/motion-preference.service';
import { MakerProgressService } from '../../../pedro-maker/services/maker-progress.service';
import type { Showroom } from '../../engine/showroom';
import type { KartSetup } from '../../models/kart.model';

/**
 * Vitrine 3D da garagem.
 *
 * O Three.js chega só quando a vitrine aparece, num pedaço separado. Se o
 * aparelho não abrir 3D, a garagem continua funcionando: só a vitrine some.
 */
@Component({
  selector: 'app-kart-showroom',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #stage class="showroom" role="img" [attr.aria-label]="label()"></div>
    @if (hasFailed()) {
      <p class="showroom__fallback">A vitrine 3D não abriu neste aparelho, mas o kart escolhido está guardado.</p>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      aspect-ratio: 4 / 3;
    }

    .showroom {
      width: 100%;
      height: 100%;
    }

    .showroom__fallback {
      position: absolute;
      inset: auto 1rem 1rem;
      font-weight: 700;
      text-align: center;
    }
  `,
})
export class KartShowroom {
  readonly setup = input.required<KartSetup>();
  readonly label = input('Vitrine do kart');

  private readonly zone = inject(NgZone);
  private readonly character = inject(MakerProgressService).character;
  private readonly motion = inject(MotionPreferenceService);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private showroom: Showroom | null = null;
  private isDestroyed = false;

  protected readonly hasFailed = signal(false);

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const setup = this.setup();

      untracked(() => this.zone.runOutsideAngular(() => this.showroom?.show(setup)));
    });

    inject(DestroyRef).onDestroy(() => {
      this.isDestroyed = true;
      this.showroom?.dispose();
      this.showroom = null;
    });
  }

  private async start(): Promise<void> {
    try {
      const { launchShowroom } = await import('../../engine/showroom');

      if (this.isDestroyed) {
        return;
      }

      this.showroom = this.zone.runOutsideAngular(() =>
        launchShowroom({
          parent: this.stage().nativeElement,
          setup: this.setup(),
          driver: this.character(),
          isAnimated: this.motion.isAllowed(),
        }),
      );
    } catch (error) {
      console.error('Pedro Kart: a vitrine 3D da garagem não abriu.', error);
      this.hasFailed.set(true);
    }
  }
}
