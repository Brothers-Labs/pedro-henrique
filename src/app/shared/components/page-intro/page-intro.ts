import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ThemeColor } from '../../../core/models/profile.model';

/** Abertura padrão das páginas internas, com emoji flutuante e texto. */
@Component({
  selector: 'app-page-intro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-color]': 'color()' },
  template: `
    <div class="intro">
      <p class="intro__emoji" aria-hidden="true">{{ emoji() }}</p>
      <div class="intro__text">
        <h1 class="intro__title">{{ title() }}</h1>
        <p class="intro__subtitle">{{ subtitle() }}</p>
      </div>
    </div>
  `,
  styleUrl: './page-intro.scss',
})
export class PageIntro {
  readonly emoji = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly color = input<ThemeColor>('pink');
}
