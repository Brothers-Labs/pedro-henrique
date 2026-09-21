import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Pet } from '../../../core/models/pet.model';

const XP_FORMAT = new Intl.NumberFormat('pt-BR');

/**
 * Felicidade, energia e experiência.
 *
 * São retorno visual, e não cobrança: nada aqui cai sozinho com o tempo, e
 * ficar dias sem entrar não deixa o mascote triste. Brincar sobe os números,
 * e é só isso que eles significam.
 */
@Component({
  selector: 'app-pet-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let current = pet();

    <dl class="status">
      <div class="status__item" data-color="pink">
        <dt class="status__label">
          <span aria-hidden="true">❤️</span>
          Felicidade
        </dt>
        <dd class="status__value">
          <span class="status__bar">
            <span class="status__fill" [style.width.%]="current.happiness"></span>
          </span>
          <strong>{{ current.happiness }}%</strong>
        </dd>
      </div>

      <div class="status__item" data-color="yellow">
        <dt class="status__label">
          <span aria-hidden="true">⚡</span>
          Energia
        </dt>
        <dd class="status__value">
          <span class="status__bar">
            <span class="status__fill" [style.width.%]="current.energy"></span>
          </span>
          <strong>{{ current.energy }}%</strong>
        </dd>
      </div>

      <div class="status__item" data-color="purple">
        <dt class="status__label">
          <span aria-hidden="true">⭐</span>
          Experiência
        </dt>
        <dd class="status__value status__value--single">
          <strong>{{ totalXp() }} XP</strong>
          <span class="status__hint">juntos até aqui</span>
        </dd>
      </div>
    </dl>
  `,
  styleUrl: './pet-status.scss',
})
export class PetStatus {
  readonly pet = input.required<Pet>();

  protected readonly totalXp = computed(() => XP_FORMAT.format(this.pet().totalXp));
}
