import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A bolinha do canal: o emoji dele sobre a cor do canal. */
@Component({
  selector: 'app-tube-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.background]': 'color()',
    '[style.--avatar-size]': 'size() + "rem"',
  },
  template: `{{ avatar() }}`,
  styles: `
    :host {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: var(--avatar-size);
      height: var(--avatar-size);
      border: 2px solid rgb(255 255 255 / 70%);
      border-radius: 50%;
      font-size: calc(var(--avatar-size) * 0.55);
      line-height: 1;
    }
  `,
})
export class TubeAvatar {
  readonly avatar = input.required<string>();
  readonly color = input.required<string>();
  readonly size = input(2.5);
}
