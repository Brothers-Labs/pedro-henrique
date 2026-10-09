import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PetService } from '../../../../core/services/pet.service';
import { ADVENTURE_CURIOSITIES } from '../../config/adventure-curiosities.config';
import { fillLine } from '../../config/companion-lines.config';
import { AdventureService } from '../../services/adventure.service';

interface DiaryEntry {
  readonly id: string;
  readonly emoji: string;
  readonly title: string;
  readonly text: string;
}

/**
 * Diário do mascote: as curiosidades que saíram dos baús.
 *
 * As que faltam aparecem como segredo guardado — saber que ainda existe algo
 * para descobrir é parte da graça.
 */
@Component({
  selector: 'app-adventure-diary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="diary" aria-labelledby="diario-titulo">
      <h3 id="diario-titulo" class="diary__title">
        <span aria-hidden="true">📖</span>
        {{ title() }}
      </h3>
      <p class="diary__count">{{ entries().length }} de {{ total }} curiosidades descobertas</p>

      <ul class="diary__list">
        @for (entry of entries(); track entry.id) {
          <li class="diary__entry">
            <span class="diary__emoji" aria-hidden="true">{{ entry.emoji }}</span>
            <div>
              <h4 class="diary__entry-title">{{ entry.title }}</h4>
              <p>{{ entry.text }}</p>
            </div>
          </li>
        }
        @for (slot of lockedSlots(); track $index) {
          <li class="diary__entry diary__entry--locked">
            <span class="diary__emoji" aria-hidden="true">🔒</span>
            <p>Um segredo ainda guardado num baú da aventura.</p>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    @use 'mixins' as *;

    .diary {
      @include card-surface(var(--color-purple-soft));

      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);

      &__title {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-lg);
      }

      &__count {
        font-size: var(--text-sm);
        color: var(--text-soft);
      }

      &__list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
        gap: var(--space-3);
        padding: 0;
        margin: 0;
        list-style: none;
      }

      &__entry {
        @include card-surface;

        display: flex;
        gap: var(--space-3);
        padding: var(--space-3);
        font-size: var(--text-sm);

        &--locked {
          align-items: center;
          border-style: dashed;
          color: var(--text-soft);
        }
      }

      &__emoji {
        font-size: var(--text-xl);
        line-height: 1;
      }

      &__entry-title {
        font-size: var(--text-md);
      }
    }
  `,
})
export class AdventureDiary {
  private readonly adventure = inject(AdventureService);
  private readonly pets = inject(PetService);

  protected readonly total = ADVENTURE_CURIOSITIES.length;
  protected readonly petName = computed(() => this.pets.pet()?.name ?? 'seu mascote');
  protected readonly title = computed(() => {
    const pet = this.pets.pet();

    return pet ? `Diário de ${pet.name}` : 'Diário do mascote';
  });

  protected readonly entries = computed<readonly DiaryEntry[]>(() =>
    this.adventure.curiosities().map(({ curiosity }) => ({
      id: curiosity.id,
      emoji: curiosity.emoji,
      title: fillLine(curiosity.title, { nome: this.petName() }),
      text: fillLine(curiosity.text, { nome: this.petName() }),
    })),
  );

  protected readonly lockedSlots = computed(() =>
    Array.from({ length: Math.max(0, this.total - this.entries().length) }),
  );
}
