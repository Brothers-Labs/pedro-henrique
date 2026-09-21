import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { petAccessory, petStage, petType } from '../../../core/data/pet.data';
import type { PetAccessoryId, PetStageId, PetTypeId } from '../../../core/models/pet.model';
import { DinoArtwork } from './artwork/dino-artwork';
import { DogArtwork } from './artwork/dog-artwork';
import { DragonArtwork } from './artwork/dragon-artwork';
import { RobotArtwork } from './artwork/robot-artwork';

/** Humor do desenho. Muda a animação, nunca o que está desenhado. */
export type PetMood = 'parado' | 'feliz' | 'comemorando';

export type PetAvatarSize = 'pequeno' | 'medio' | 'grande';

/**
 * O mascote desenhado.
 *
 * Recebe tipo, estágio e acessório soltos — e não o objeto do mascote — para
 * poder mostrar também o que ainda não foi conquistado: a prévia da próxima
 * evolução e os companheiros da coleção usam o mesmo componente.
 *
 * O desenho inteiro é um `role="img"` com descrição própria: quem usa leitor
 * de tela ouve "Foguinho, dragão jovem" em vez de uma sopa de formas.
 */
@Component({
  selector: 'app-pet-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-color]': 'definition().color' },
  imports: [DragonArtwork, RobotArtwork, DinoArtwork, DogArtwork],
  templateUrl: './pet-avatar.html',
  styleUrl: './pet-avatar.scss',
})
export class PetAvatar {
  readonly type = input.required<PetTypeId>();
  readonly stage = input.required<PetStageId>();
  readonly accessoryId = input<PetAccessoryId | null>(null);
  readonly mood = input<PetMood>('parado');
  readonly size = input<PetAvatarSize>('medio');

  /** Esconde o desenho atrás de uma silhueta, para o que ainda é surpresa. */
  readonly isMystery = input(false);

  /** Descrição falada; sem ela, o componente monta uma a partir do catálogo. */
  readonly label = input<string>('');

  protected readonly definition = computed(() => petType(this.type()));

  protected readonly accessory = computed(() => {
    const id = this.accessoryId();

    return id && !this.isMystery() ? petAccessory(id) : null;
  });

  protected readonly description = computed(() => {
    if (this.isMystery()) {
      return 'Silhueta misteriosa do próximo companheiro';
    }

    const custom = this.label();

    if (custom) {
      return custom;
    }

    return `${this.definition().label} ${petStage(this.stage()).label.toLowerCase()}`;
  });
}
