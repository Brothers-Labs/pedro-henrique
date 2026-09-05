import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EXPLORABLE_SECTIONS } from '../../../../core/data/site-sections.data';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { MotionSceneDirective } from '../../../../shared/directives/motion-scene.directive';

@Component({
  selector: 'app-explore-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SectionHeading, MotionSceneDirective],
  templateUrl: './explore-section.html',
  styleUrl: './explore-section.scss',
})
export class ExploreSection {
  protected readonly sections = EXPLORABLE_SECTIONS;
}
