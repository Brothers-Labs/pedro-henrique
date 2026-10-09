import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROFILE } from '../../../../core/data/profile.data';
import { journeyGreeting } from '../../config/companion-lines.config';
import { AdventureService } from '../../services/adventure.service';
import { MapCompanion } from '../map-companion/map-companion';
import { StarRating } from '../star-rating/star-rating';

/** Onde o cartão está: na home ele conta a jornada; nos jogos, apresenta os dois modos. */
export type AdventureCardVariant = 'home' | 'jogos';

/**
 * Cartão da Aventura fora do mapa.
 *
 * Na home, o mascote conta onde a jornada parou e o botão leva de volta a
 * ela. Na página de jogos, separa os dois modos: a trilha da Aventura e o
 * jogar livre da própria página.
 */
@Component({
  selector: 'app-adventure-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MapCompanion, StarRating],
  templateUrl: './adventure-card.html',
  styleUrl: './adventure-card.scss',
})
export class AdventureCard {
  readonly variant = input<AdventureCardVariant>('home');

  private readonly adventure = inject(AdventureService);

  protected readonly world = this.adventure.currentWorld;
  protected readonly greeting = computed(() => journeyGreeting(this.world(), PROFILE.firstName));
}
