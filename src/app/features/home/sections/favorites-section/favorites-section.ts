import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PROFILE } from '../../../../core/data/profile.data';
import { themeColorByIndex } from '../../../../core/theme/theme-colors';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

const REVEAL_STEP_IN_MS = 70;

@Component({
  selector: 'app-favorites-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, RevealDirective],
  templateUrl: './favorites-section.html',
  styleUrl: './favorites-section.scss',
})
export class FavoritesSection {
  protected readonly favorites = PROFILE.favorites;
  protected readonly colorFor = themeColorByIndex;

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
