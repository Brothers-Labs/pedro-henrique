import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROFILE } from '../../../core/data/profile.data';
import { PetService } from '../../../core/services/pet.service';
import { PetAvatar } from '../pet-avatar/pet-avatar';
import { PetXpBar } from '../pet-xp-bar/pet-xp-bar';

/** Onde o cartão está: muda o texto e o tamanho, nunca o dado mostrado. */
export type PetSummaryVariant = 'home' | 'jogos';

/**
 * Cartão do mascote fora da página dele.
 *
 * É a ponte entre jogar e cuidar: aparece na home e na página de jogos com o
 * mesmo nível e o mesmo XP da casa do mascote, porque lê do mesmo serviço.
 *
 * Quando ainda não há mascote, o cartão vira convite — é assim que a criança
 * descobre a funcionalidade sem precisar caçar no menu.
 */
@Component({
  selector: 'app-pet-summary-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PetAvatar, PetXpBar],
  templateUrl: './pet-summary-card.html',
  styleUrl: './pet-summary-card.scss',
})
export class PetSummaryCard {
  readonly variant = input<PetSummaryVariant>('jogos');

  private readonly petService = inject(PetService);

  protected readonly childName = PROFILE.firstName;
  protected readonly pet = computed(() => this.petService.pet());
  protected readonly stage = computed(() => this.petService.stage()?.id ?? 'bebe');
  protected readonly color = computed(() => this.petService.type()?.color ?? 'purple');
  protected readonly typeEmoji = computed(() => this.petService.type()?.emoji ?? '🐣');

  /** Saudação pela hora do aparelho: é o que faz o site parecer atento. */
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Bom dia';
    }

    return hour < 18 ? 'Boa tarde' : 'Boa noite';
  });
}
