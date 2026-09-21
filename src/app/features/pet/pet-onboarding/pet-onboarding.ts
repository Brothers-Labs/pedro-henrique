import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import { PET_CONFIG, PET_TYPES, petType } from '../../../core/data/pet.data';
import type { PetTypeId } from '../../../core/models/pet.model';
import { PROFILE } from '../../../core/data/profile.data';
import { sanitizePetName } from '../../../core/pet/pet-progress';
import { PageIntro } from '../../../shared/components/page-intro/page-intro';
import { PetAvatar } from '../pet-avatar/pet-avatar';

/** Escolha feita pela criança, pronta para virar um mascote. */
export interface PetAdoption {
  readonly type: PetTypeId;
  readonly name: string;
}

/**
 * Primeiro acesso: escolher o companheiro e dar um nome a ele.
 *
 * São duas etapas, e não um formulário só, porque escolher com quem vai
 * brincar e batizar quem já foi escolhido são decisões diferentes — e porque
 * a segunda tela é o momento em que o mascote deixa de ser uma opção e vira
 * alguém com nome.
 *
 * A etapa do nome deixa voltar: uma escolha errada de dragão não pode virar
 * um beco sem saída.
 */
@Component({
  selector: 'app-pet-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, PetAvatar],
  templateUrl: './pet-onboarding.html',
  styleUrl: './pet-onboarding.scss',
})
export class PetOnboarding {
  readonly chosen = output<PetAdoption>();

  protected readonly types = PET_TYPES;
  protected readonly childName = PROFILE.firstName;
  protected readonly maxNameLength = PET_CONFIG.maxNameLength;

  protected readonly name = signal('');
  private readonly selectedType = signal<PetTypeId | null>(null);

  protected readonly chosenType = computed(() => {
    const id = this.selectedType();

    return id ? petType(id) : null;
  });

  protected readonly cleanName = computed(() => sanitizePetName(this.name()));
  protected readonly canConfirm = computed(() => this.cleanName().length > 0);

  protected select(type: PetTypeId): void {
    this.selectedType.set(type);
    this.name.set('');
  }

  protected goBack(): void {
    this.selectedType.set(null);
    this.name.set('');
  }

  protected confirm(): void {
    const type = this.selectedType();

    if (!type || !this.canConfirm()) {
      return;
    }

    this.chosen.emit({ type, name: this.cleanName() });
  }
}
