import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SUPPORT_TIPS, THERAPIES } from '../../../../core/data/therapies.data';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/**
 * Apresenta o autismo do Pedro Henrique em primeira pessoa e o time de
 * profissionais que o acompanha, com linguagem acessível a outras crianças.
 */
@Component({
  selector: 'app-my-way-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, RevealDirective],
  templateUrl: './my-way-section.html',
  styleUrl: './my-way-section.scss',
})
export class MyWaySection {
  protected readonly therapies = THERAPIES;
  protected readonly supportTips = SUPPORT_TIPS;
}
