import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROFILE } from '../../../../core/data/profile.data';
import { calculateAgeInYears } from '../../../../core/utils/birthday';
import { MotionSceneDirective } from '../../../../shared/directives/motion-scene.directive';

@Component({
  selector: 'app-hero-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MotionSceneDirective],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
})
export class HeroSection {
  protected readonly profile = PROFILE;
  protected readonly age = calculateAgeInYears(PROFILE.birthDate);
  protected readonly floatingEmojis = ['🚀', '🎨', '⚽', '🦕', '⭐', '🎈'] as const;
}
