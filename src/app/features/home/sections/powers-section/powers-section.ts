import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PROFILE } from '../../../../core/data/profile.data';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { MotionSceneDirective } from '../../../../shared/directives/motion-scene.directive';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

const REVEAL_STEP_IN_MS = 90;

@Component({
  selector: 'app-powers-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, RevealDirective, MotionSceneDirective],
  templateUrl: './powers-section.html',
  styleUrl: './powers-section.scss',
})
export class PowersSection {
  protected readonly powers = PROFILE.superPowers;

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
