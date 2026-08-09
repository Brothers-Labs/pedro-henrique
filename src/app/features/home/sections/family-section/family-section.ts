import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FAMILY_MEMBERS } from '../../../../core/data/family.data';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

const REVEAL_STEP_IN_MS = 90;

@Component({
  selector: 'app-family-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, RevealDirective],
  templateUrl: './family-section.html',
  styleUrl: './family-section.scss',
})
export class FamilySection {
  protected readonly members = FAMILY_MEMBERS;

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
