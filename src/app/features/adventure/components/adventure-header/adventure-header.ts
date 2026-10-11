import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { GameProgressService } from '../../../../core/services/game-progress.service';
import { PetService } from '../../../../core/services/pet.service';
import { SoundService } from '../../../../core/services/sound.service';
import { AdventureService } from '../../services/adventure.service';

/**
 * Resumo da jornada no topo do mapa: estrelas, mundos, nível e mascote.
 *
 * Os números vêm dos mesmos serviços das outras páginas — o nível geral é o
 * mesmo da página de jogos, e o do mascote, o mesmo da casa dele.
 */
@Component({
  selector: 'app-adventure-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="header" aria-label="Resumo da aventura">
      <dl class="header__stats">
        <div class="header__stat">
          <dt>Estrelas</dt>
          <dd><span aria-hidden="true">⭐</span> {{ summary().stars }} / {{ summary().maxStars }}</dd>
        </div>
        <div class="header__stat">
          <dt>Mundos concluídos</dt>
          <dd><span aria-hidden="true">🏆</span> {{ summary().completedWorlds }} / {{ summary().totalWorlds }}</dd>
        </div>
        <div class="header__stat">
          <dt>Nível geral</dt>
          <dd><span aria-hidden="true">🎮</span> {{ overallLevel() }}</dd>
        </div>
        @if (pet(); as current) {
          <div class="header__stat">
            <dt>{{ current.name }}</dt>
            <dd><span aria-hidden="true">🐾</span> Nível {{ current.level }}</dd>
          </div>
        }
      </dl>

      <button
        type="button"
        class="button button--ghost button--small"
        [attr.aria-pressed]="isSoundOn()"
        (click)="toggleSound()"
      >
        <span aria-hidden="true">{{ isSoundOn() ? '🔊' : '🔇' }}</span>
        {{ isSoundOn() ? 'Som ligado' : 'Som desligado' }}
      </button>
    </section>
  `,
  styles: `
    @use 'mixins' as *;

    .header {
      @include card-surface;

      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);

      &__stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
        flex: 1 1 24rem;
        gap: var(--space-3);
        margin: 0;
      }

      &__stat {
        dt {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-soft);
        }

        dd {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: 800;
          color: var(--text-strong);
        }
      }
    }
  `,
})
export class AdventureHeader {
  private readonly adventure = inject(AdventureService);
  private readonly games = inject(GameProgressService);
  private readonly sound = inject(SoundService);

  protected readonly summary = this.adventure.summary;
  protected readonly pet = inject(PetService).pet;
  protected readonly overallLevel = computed(() => this.games.summary().overallLevel);
  protected readonly isSoundOn = this.sound.isEnabled;

  protected toggleSound(): void {
    this.sound.toggle();
  }
}
