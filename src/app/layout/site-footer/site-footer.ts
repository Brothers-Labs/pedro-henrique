import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROFILE } from '../../core/data/profile.data';
import { SITE_SECTIONS } from '../../core/data/site-sections.data';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly profile = PROFILE;
  protected readonly sections = SITE_SECTIONS;
  protected readonly currentYear = new Date().getFullYear();
}
