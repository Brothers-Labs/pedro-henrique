import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PET_TYPES } from '../../../core/data/pet.data';
import type { Pet, PetType } from '../../../core/models/pet.model';
import { stageFor } from '../../../core/pet/pet-progress';
import { PetAvatar } from '../pet-avatar/pet-avatar';

/** Tipo do catálogo com a situação dele para esta criança. */
interface CollectionEntry {
  readonly type: PetType;
  readonly isCompanion: boolean;
}

/**
 * Coleção de companheiros.
 *
 * Hoje um é o parceiro e os outros são silhuetas. Nenhum deles se compra: a
 * porta para desbloqueá-los — por nível, conquista ou evento — já está
 * prevista no estado, e abre sem migrar nada.
 */
@Component({
  selector: 'app-pet-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PetAvatar],
  template: `
    @let companion = pet();

    <ul class="collection">
      @for (entry of entries(); track entry.type.id) {
        <li>
          <article
            class="collection__card"
            [attr.data-color]="entry.type.color"
            [attr.data-state]="entry.isCompanion ? 'companheiro' : 'bloqueado'"
          >
            <app-pet-avatar
              [type]="entry.type.id"
              [stage]="entry.isCompanion ? stage() : 'bebe'"
              [isMystery]="!entry.isCompanion"
              size="medio"
              [label]="entry.isCompanion ? companion.name : ''"
            />

            <h3 class="collection__name">
              <span aria-hidden="true">{{ entry.type.emoji }}</span>
              {{ entry.isCompanion ? companion.name : entry.type.label }}
            </h3>

            @if (entry.isCompanion) {
              <p class="collection__badge">
                <span aria-hidden="true">💛</span>
                Meu companheiro
              </p>
            } @else {
              <p class="collection__hint">Descubra novas aventuras para desbloquear.</p>
            }
          </article>
        </li>
      }
    </ul>
  `,
  styleUrl: './pet-collection.scss',
})
export class PetCollection {
  readonly pet = input.required<Pet>();

  protected readonly stage = computed(() => stageFor(this.pet().level).id);

  protected readonly entries = computed<readonly CollectionEntry[]>(() =>
    PET_TYPES.map((type) => ({ type, isCompanion: type.id === this.pet().type })),
  );
}
