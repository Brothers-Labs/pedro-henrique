import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EXPLORABLE_SECTIONS } from '../../../../core/data/site-sections.data';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

const REVEAL_STEP_IN_MS = 90;

@Component({
  selector: 'app-explore-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SectionHeading, RevealDirective],
  templateUrl: './explore-section.html',
  styleUrl: './explore-section.scss',
})
export class ExploreSection {
  protected readonly sections = EXPLORABLE_SECTIONS;

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
