import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, untracked } from '@angular/core';

import { MakerProgressService } from '../../services/maker-progress.service';

const VISIBLE_MS = 3800;

/**
 * Aviso de conquista nova do Pedro Maker.
 *
 * Consome a fila do serviço uma de cada vez — duas conquistas juntas viram
 * dois avisos em sequência, nunca dois por cima um do outro. Some sozinho e
 * não bloqueia nada.
 */
@Component({
  selector: 'app-maker-achievement-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (achievement(); as current) {
      <button type="button" class="toast" role="status" (click)="dismiss()">
        <span class="toast__emoji" aria-hidden="true">{{ current.emoji }}</span>
        <span class="toast__text">
          <small>Conquista nova!</small>
          <strong>{{ current.title }}</strong>
        </span>
      </button>
    }
  `,
  styleUrl: './maker-achievement-toast.scss',
})
export class MakerAchievementToast {
  private readonly progress = inject(MakerProgressService);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly achievement = this.progress.pendingAchievement;

  constructor() {
    effect(() => {
      const current = this.achievement();

      untracked(() => {
        this.clearTimer();

        if (current) {
          this.timer = setTimeout(() => this.dismiss(), VISIBLE_MS);
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
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
