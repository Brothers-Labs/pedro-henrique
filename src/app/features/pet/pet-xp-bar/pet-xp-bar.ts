import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Pet } from '../../../core/models/pet.model';
import { levelPercentage, xpForLevel, xpToNextLevel } from '../../../core/pet/pet-progress';

/**
 * Nível e barra de XP do mascote.
 *
 * A barra nunca informa sozinha pela cor: o mesmo dado aparece escrito em
 * "720 / 1.000 XP" e no texto do que falta para o próximo nível.
 */
@Component({
  selector: 'app-pet-xp-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let current = pet();

    <div class="xp">
      <div class="xp__head">
        <p class="xp__level">
          <span aria-hidden="true">⭐</span>
          Nível {{ current.level }}
        </p>
        <p class="xp__numbers">{{ current.xp }} / {{ total() }} XP</p>
      </div>

      <div
        class="xp__bar"
        role="progressbar"
        [attr.aria-valuenow]="current.xp"
        aria-valuemin="0"
        [attr.aria-valuemax]="total()"
        [attr.aria-label]="'Faltam ' + remaining() + ' XP para o nível ' + (current.level + 1)"
      >
        <span class="xp__fill" [style.width.%]="percentage()"></span>
      </div>

      @if (!isCompact()) {
        <p class="xp__caption">
          Faltam <strong>{{ remaining() }} XP</strong> para o próximo nível!
        </p>
      }
    </div>
  `,
  styleUrl: './pet-xp-bar.scss',
})
export class PetXpBar {
  readonly pet = input.required<Pet>();

  /** Versão curta, sem a frase final, para caber em cartões pequenos. */
  readonly isCompact = input(false);

  protected readonly total = computed(() => xpForLevel(this.pet().level));
  protected readonly remaining = computed(() => xpToNextLevel(this.pet()));
  protected readonly percentage = computed(() => levelPercentage(this.pet()));
}
