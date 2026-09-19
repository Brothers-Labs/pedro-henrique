import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { SITE_SECTIONS } from '../../core/data/site-sections.data';
import { PROFILE } from '../../core/data/profile.data';
import { calculateAgeInYears } from '../../core/utils/birthday';
import { CalmModeToggle } from '../calm-mode-toggle/calm-mode-toggle';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, CalmModeToggle],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly sections = SITE_SECTIONS;
  protected readonly profile = PROFILE;
  protected readonly age = calculateAgeInYears(PROFILE.birthDate);
}
