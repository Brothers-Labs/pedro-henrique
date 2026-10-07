import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROFILE } from '../../core/data/profile.data';
import { SideNavService } from '../../core/services/side-nav.service';
import { calculateAgeInYears } from '../../core/utils/birthday';
import { CalmModeToggle } from '../calm-mode-toggle/calm-mode-toggle';
import { SIDE_NAV_ID } from '../side-nav/side-nav';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CalmModeToggle],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly sideNav = inject(SideNavService);
  protected readonly sideNavId = SIDE_NAV_ID;
  protected readonly profile = PROFILE;
  protected readonly age = calculateAgeInYears(PROFILE.birthDate);

  /** O mesmo botão abre a gaveta no toque e recolhe o trilho no desktop. */
  protected readonly menuButtonLabel = computed(() => {
    if (!this.sideNav.isDocked()) {
      return this.sideNav.isDrawerOpen() ? 'Fechar o menu' : 'Abrir o menu';
    }

    return this.sideNav.isCollapsed() ? 'Expandir o menu' : 'Recolher o menu';
  });
}
