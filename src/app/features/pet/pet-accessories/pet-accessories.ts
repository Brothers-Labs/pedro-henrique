import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { PET_ACCESSORIES } from '../../../core/data/pet.data';
import type { Pet, PetAccessory, PetAccessoryId, PetAccessoryState } from '../../../core/models/pet.model';
import { accessoryStateOf } from '../../../core/pet/pet-progress';

/** Acessório já com a situação resolvida, para o template não decidir nada. */
interface AccessoryView {
  readonly accessory: PetAccessory;
  readonly state: PetAccessoryState;
}

/**
 * Acessórios do mascote.
 *
 * Um de cada vez: com sete enfeites, deixar vestir tudo junto empilharia coroa
 * sobre boné sobre fone. Escolher qual usar hoje é parte da brincadeira.
 *
 * O que ainda está bloqueado continua visível, com o nível que falta — saber
 * o que vem é o que dá vontade de continuar.
 */
@Component({
  selector: 'app-pet-accessories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="accessories">
      @for (item of items(); track item.accessory.id) {
        <li>
          <article class="accessory" [attr.data-state]="item.state">
            <span class="accessory__emoji" aria-hidden="true">{{ item.accessory.emoji }}</span>
            <h3 class="accessory__name">{{ item.accessory.label }}</h3>

            @switch (item.state) {
              @case ('bloqueado') {
                <p class="accessory__lock">
                  <span aria-hidden="true">🔒</span>
                  Nível {{ item.accessory.unlockLevel }}
                </p>
              }
              @case ('equipado') {
                <p class="accessory__badge">
                  <span aria-hidden="true">✅</span>
                  Vestido
                </p>
                <button
                  type="button"
                  class="button button--ghost button--small button--block"
                  (click)="equipped.emit(null)"
                >
                  Tirar
                </button>
              }
              @default {
                <p class="accessory__hint">{{ item.accessory.description }}</p>
                <button
                  type="button"
                  class="button button--primary button--small button--block"
                  (click)="equipped.emit(item.accessory.id)"
                >
                  Vestir
                </button>
              }
            }
          </article>
        </li>
      }
    </ul>
  `,
  styleUrl: './pet-accessories.scss',
})
export class PetAccessories {
  readonly pet = input.required<Pet>();

  /** Acessório escolhido; `null` quando a criança tira o que estava vestido. */
  readonly equipped = output<PetAccessoryId | null>();

  protected readonly items = computed<readonly AccessoryView[]>(() =>
    PET_ACCESSORIES.map((accessory) => ({
      accessory,
      state: accessoryStateOf(this.pet(), accessory.id),
    })),
  );
}
