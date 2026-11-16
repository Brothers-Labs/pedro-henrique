import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { PedroTubeStore } from '../../services/pedro-tube-store.service';

/** "Inscreva-se" vermelho que vira "Inscrito 🔔" ao tocar, e volta ao tocar de novo. */
@Component({
  selector: 'app-subscribe-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="subscribe"
      [class.subscribe--on]="isSubscribed()"
      [attr.aria-pressed]="isSubscribed()"
      (click)="toggle()"
    >
      @if (isSubscribed()) {
        <span aria-hidden="true" class="subscribe__bell">🔔</span> Inscrito
      } @else {
        <span aria-hidden="true">▶</span> Inscreva-se
      }
    </button>
  `,
  styles: `
    .subscribe {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 2.75rem;
      padding: 0.5rem 1.15rem;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(180deg, #ff4b4b, #c4001a);
      color: #ffffff;
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 800;
      box-shadow: 0 0 0.9rem rgb(255 40 60 / 45%);
      cursor: pointer;

      &:focus-visible {
        outline: 3px solid #ffffff;
        outline-offset: 2px;
      }
    }

    .subscribe--on {
      background: rgb(255 255 255 / 14%);
      box-shadow: none;
    }

    .subscribe__bell {
      display: inline-block;
      animation: subscribe-ring 0.9s ease-in-out 2;
    }

    @media (prefers-reduced-motion: reduce) {
      .subscribe__bell {
        animation: none;
      }
    }

    @keyframes subscribe-ring {
      0%,
      100% {
        transform: rotate(0deg);
      }

      25% {
        transform: rotate(-20deg);
      }

      75% {
        transform: rotate(20deg);
      }
    }
  `,
})
export class SubscribeButton {
  readonly channelId = input.required<string>();

  private readonly store = inject(PedroTubeStore);

  protected readonly isSubscribed = computed(() => this.store.subscriptions().has(this.channelId()));

  protected toggle(): void {
    this.store.toggleSubscription(this.channelId());
  }
}
