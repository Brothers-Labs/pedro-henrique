import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';

import { GameProgressService } from '../../../../core/services/game-progress.service';

/** Tempo que o aviso fica na tela antes de dar a vez ao próximo. */
const VISIBLE_DURATION_IN_MS = 4200;

/**
 * Aviso de conquista nova.
 *
 * Mostra uma de cada vez, na ordem em que foram desbloqueadas: o serviço
 * guarda a fila e este componente só consome o topo dela. Duas conquistas no
 * mesmo desafio viram dois avisos em sequência, nunca dois modais sobrepostos.
 *
 * É um aviso, não um bloqueio: some sozinho e não interrompe o jogo.
 */
@Component({
  selector: 'app-achievement-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './achievement-toast.html',
  styleUrl: './achievement-toast.scss',
})
export class AchievementToast {
  private readonly progress = inject(GameProgressService);
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly achievement = computed(() => this.progress.pendingAchievement());

  constructor() {
    effect(() => {
      const current = this.achievement();

      untracked(() => {
        this.clearTimer();

        if (current) {
          this.hideTimeout = setTimeout(() => this.dismiss(), VISIBLE_DURATION_IN_MS);
        }
      });
    });

    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected dismiss(): void {
    this.clearTimer();
    this.progress.dismissAchievement();
  }

  private clearTimer(): void {
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}
