import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CalmModeService } from '../../core/services/calm-mode.service';

/**
 * Interruptor sensorial do site, fixo no cabeçalho.
 *
 * Fica fora do menu retrátil de propósito: quem precisa baixar o volume visual
 * da página tem que conseguir fazer isso sem antes abrir um menu animado.
 */
@Component({
  selector: 'app-calm-mode-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="calm-toggle"
      [class.calm-toggle--on]="calmMode.isEnabled()"
      [attr.aria-pressed]="calmMode.isEnabled()"
      [title]="hint()"
      (click)="calmMode.toggle()"
    >
      <span class="calm-toggle__icon" aria-hidden="true">🌿</span>
      <span class="calm-toggle__label">Modo calmo</span>
    </button>
  `,
  styleUrl: './calm-mode-toggle.scss',
})
export class CalmModeToggle {
  protected readonly calmMode = inject(CalmModeService);

  protected readonly hint = computed(() =>
    this.calmMode.isEnabled()
      ? 'Modo calmo ligado. Toque para voltar às cores fortes e às animações.'
      : 'Modo calmo desligado. Toque para deixar o site com cores suaves e sem animação.',
  );
}
