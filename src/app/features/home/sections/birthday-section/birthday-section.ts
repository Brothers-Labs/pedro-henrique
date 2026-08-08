import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DatePipe } from '@angular/common';

import { PROFILE } from '../../../../core/data/profile.data';
import { calculateBirthdayCountdown } from '../../../../core/utils/birthday';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-birthday-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RevealDirective],
  templateUrl: './birthday-section.html',
  styleUrl: './birthday-section.scss',
})
export class BirthdaySection {
  protected readonly profile = PROFILE;
  protected readonly countdown = calculateBirthdayCountdown(PROFILE.birthDate);
}
