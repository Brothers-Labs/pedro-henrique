import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Cabeçalho padrão das seções: etiqueta colorida, título e subtítulo. */
@Component({
  selector: 'app-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="heading" [class.heading--center]="isCentered()">
      <p class="heading__eyebrow">
        <span aria-hidden="true">{{ emoji() }}</span>
        {{ eyebrow() }}
      </p>
      <h2 class="heading__title">{{ title() }}</h2>
      @if (subtitle()) {
        <p class="heading__subtitle">{{ subtitle() }}</p>
      }
    </header>
  `,
  styleUrl: './section-heading.scss',
})
export class SectionHeading {
  readonly emoji = input.required<string>();
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly isCentered = input<boolean>(true);
}
