import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PROFILE } from '../../../../core/data/profile.data';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

const REVEAL_STEP_IN_MS = 110;

@Component({
  selector: 'app-achievements-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, RevealDirective],
  templateUrl: './achievements-section.html',
  styleUrl: './achievements-section.scss',
})
export class AchievementsSection {
  protected readonly achievements = PROFILE.achievements;

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
