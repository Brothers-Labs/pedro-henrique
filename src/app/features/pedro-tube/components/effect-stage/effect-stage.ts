import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';
import { filterToCss, overlayFlow, particlesFor } from '../../engine/effect-style';
import type { TubeEffect } from '../../models/tube.model';

/** Nas miniaturas, só algumas partículas: o card fica leve e não vira bagunça. */
const COMPACT_PARTICLES = 6;

/**
 * A tela onde o vídeo toca, com o efeito por cima.
 *
 * O conteúdo (vídeo, animação) entra por `ng-content` e recebe só o filtro
 * de cor; partículas, moldura e figurinha ficam em camadas à parte, que não
 * pegam o toque — os controles do vídeo continuam funcionando embaixo delas.
 */
@Component({
  selector: 'app-effect-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-frame]': 'effect().frame',
    '[class.stage--compact]': 'compact()',
    '[class.stage--still]': '!motion.isAllowed()',
    '[attr.data-effect]': 'effect().id',
  },
  templateUrl: './effect-stage.html',
  styleUrl: './effect-stage.scss',
})
export class EffectStage {
  readonly effect = input.required<TubeEffect>();
  readonly compact = input(false);

  protected readonly motion = inject(MotionPreferenceService);

  protected readonly filterCss = computed(() => filterToCss(this.effect().filter));
  protected readonly flow = computed(() => overlayFlow(this.effect().overlay));
  protected readonly particles = computed(() => {
    const particles = particlesFor(this.effect().overlay);

    return this.compact() ? particles.slice(0, COMPACT_PARTICLES) : particles;
  });
}
