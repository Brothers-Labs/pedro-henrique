import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { CalmModeService } from './calm-mode.service';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Decide se o site pode animar.
 *
 * São dois interruptores, e qualquer um deles sozinho desliga o movimento: a
 * preferência do sistema operacional e o modo calmo do próprio site. Como o
 * resultado é um signal, uma cena em andamento pode ser revertida na hora em
 * que a pessoa liga o modo calmo — sem esperar o próximo carregamento.
 */
@Injectable({ providedIn: 'root' })
export class MotionPreferenceService {
  private readonly calmMode = inject(CalmModeService);
  private readonly systemPrefersReducedMotion = signal(readSystemPreference());

  readonly isAllowed = computed(
    () => !this.calmMode.isEnabled() && !this.systemPrefersReducedMotion(),
  );

  constructor() {
    const query = matchReducedMotion();

    if (!query) {
      return;
    }

    const onChange = (event: MediaQueryListEvent): void =>
      this.systemPrefersReducedMotion.set(event.matches);

    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }
}

function readSystemPreference(): boolean {
  return matchReducedMotion()?.matches ?? false;
}

function matchReducedMotion(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia(REDUCED_MOTION_QUERY) : null;
}
