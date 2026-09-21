import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { petType } from '../../../core/data/pet.data';
import type { Pet } from '../../../core/models/pet.model';
import { evolutionPreview, stageFor } from '../../../core/pet/pet-progress';
import { PetAvatar } from '../pet-avatar/pet-avatar';

/**
 * Próxima evolução.
 *
 * A silhueta é proposital: mostrar o desenho pronto entregaria a surpresa, e a
 * surpresa é metade do motivo para continuar jogando. O que fica claro é
 * quanto falta — nunca o que vai aparecer.
 */
@Component({
  selector: 'app-pet-next-evolution',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PetAvatar],
  template: `
    @let current = pet();
    @let preview = evolution();

    <div class="next">
      @if (preview) {
        <app-pet-avatar [type]="current.type" [stage]="preview.next.id" [isMystery]="true" size="medio" />

        <div class="next__text">
          <p class="next__path">
            <strong>{{ current.name }}</strong>
            {{ preview.current.label }} → {{ preview.next.label }}
          </p>

          <div
            class="next__bar"
            role="progressbar"
            [attr.aria-valuenow]="preview.percentage"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-label]="'Faltam ' + preview.levelsRemaining + ' níveis para evoluir'"
          >
            <span class="next__fill" [style.width.%]="preview.percentage"></span>
          </div>

          <dl class="next__levels">
            <div>
              <dt>Nível atual</dt>
              <dd>{{ preview.level }}</dd>
            </div>
            <div>
              <dt>Próxima evolução</dt>
              <dd>{{ preview.next.minLevel }}</dd>
            </div>
          </dl>

          <p class="next__remaining">
            <span aria-hidden="true">✨</span>
            @if (preview.levelsRemaining === 1) {
              Falta <strong>1 nível</strong>!
            } @else {
              Faltam <strong>{{ preview.levelsRemaining }} níveis</strong>!
            }
          </p>
        </div>
      } @else {
        <app-pet-avatar
          [type]="current.type"
          [stage]="stage().id"
          mood="feliz"
          size="medio"
          [label]="current.name + ' lendário'"
        />

        <div class="next__text">
          <p class="next__path">
            <strong>{{ current.name }}</strong>
            chegou ao estágio Lendário!
          </p>
          <p class="next__remaining">
            <span aria-hidden="true">👑</span>
            Vocês foram até o fim da evolução. Agora é só aproveitar juntos.
          </p>
        </div>
      }
    </div>
  `,
  styleUrl: './pet-next-evolution.scss',
})
export class PetNextEvolution {
  readonly pet = input.required<Pet>();

  protected readonly evolution = computed(() => evolutionPreview(this.pet()));
  protected readonly stage = computed(() => stageFor(this.pet().level));
  protected readonly definition = computed(() => petType(this.pet().type));
}
