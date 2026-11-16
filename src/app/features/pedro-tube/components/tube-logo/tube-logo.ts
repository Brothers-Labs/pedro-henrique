import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A marca do PedroTube: "Pedro" prateado e "Tube" na caixinha vermelha. */
@Component({
  selector: 'app-tube-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.logo--large]': 'large()' },
  template: `<span class="logo__pedro">Pedro</span><span class="logo__tube">Tube</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.15em;
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-style: italic;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }

    :host(.logo--large) {
      font-size: clamp(2.2rem, 1.5rem + 3vw, 3.6rem);
    }

    .logo__pedro {
      background: linear-gradient(180deg, #ffffff 30%, #a9c7ff 60%, #ffffff 90%);
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 2px 0 #1d3c8f);
    }

    .logo__tube {
      padding: 0.08em 0.28em 0.12em;
      border-radius: 0.3em;
      background: linear-gradient(180deg, #ff4b4b, #c4001a);
      color: #ffffff;
      box-shadow: 0 0 0.6em rgb(255 40 60 / 55%);
    }
  `,
})
export class TubeLogo {
  readonly large = input(false);
}
