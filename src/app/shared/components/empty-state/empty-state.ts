import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Estado vazio amigável, com espaço opcional para uma ação via `ng-content`. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <p class="empty__emoji" aria-hidden="true">{{ emoji() }}</p>
      <h3 class="empty__title">{{ title() }}</h3>
      <p class="empty__message">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly emoji = input<string>('🐣');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}
