import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { evaluatePasswordStrength } from '../../auth-form';

const SEGMENTS = [1, 2, 3, 4] as const;

/** Medidor de força da senha em quatro barrinhas, com o nome do nível ao lado. */
@Component({
  selector: 'app-password-strength-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-level]': 'strength().level' },
  template: `
    <div class="meter" aria-hidden="true">
      @for (segment of segments; track segment) {
        <span class="meter__bar" [class.meter__bar--filled]="segment <= strength().score"></span>
      }
    </div>
    <p class="meter__label" aria-live="polite">
      @if (strength().label) {
        Força da senha: <strong>{{ strength().label }}</strong>
      }
    </p>
  `,
  styleUrl: './password-strength-meter.scss',
})
export class PasswordStrengthMeter {
  readonly password = input.required<string>();

  protected readonly segments = SEGMENTS;
  protected readonly strength = computed(() => evaluatePasswordStrength(this.password()));
}
