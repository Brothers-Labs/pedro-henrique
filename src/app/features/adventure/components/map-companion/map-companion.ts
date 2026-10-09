import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { PetService } from '../../../../core/services/pet.service';
import { PetAvatar, type PetAvatarSize, type PetMood } from '../../../pet/pet-avatar/pet-avatar';

/**
 * O mascote acompanhando a criança na Aventura, com o balão de fala.
 *
 * Sem mascote adotado, quem aparece é o ovo: a jornada funciona do mesmo
 * jeito, e o ovo lembra que existe um companheiro esperando por ela.
 */
@Component({
  selector: 'app-map-companion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PetAvatar],
  template: `
    <div class="companion" [class.companion--with-line]="!!line()">
      @if (pet(); as current) {
        <app-pet-avatar
          [type]="current.type"
          [stage]="stage()"
          [accessoryId]="current.equippedAccessory"
          [mood]="mood()"
          [size]="size()"
          [label]="current.name"
        />
      } @else {
        <span class="companion__egg" aria-hidden="true">🥚</span>
      }

      @if (line(); as text) {
        <p class="companion__bubble" role="status">
          <strong>{{ name() }}:</strong> {{ text }}
        </p>
      }
    </div>
  `,
  styleUrl: './map-companion.scss',
})
export class MapCompanion {
  readonly line = input<string | null>(null);
  readonly size = input<PetAvatarSize>('pequeno');
  readonly mood = input<PetMood>('parado');

  private readonly petService = inject(PetService);

  protected readonly pet = this.petService.pet;
  protected readonly stage = computed(() => this.petService.stage()?.id ?? 'bebe');
  protected readonly name = computed(() => this.pet()?.name ?? 'Seu mascote');
}
