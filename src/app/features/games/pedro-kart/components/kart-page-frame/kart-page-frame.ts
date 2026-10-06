import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Moldura das telas de menu do Pedro Kart.
 *
 * Mesmo céu e mesmo botão de voltar do Pedro Maker: quem já brinca lá
 * reconhece aqui onde fica cada coisa.
 */
@Component({
  selector: 'app-kart-page-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="frame">
      <a class="frame__back" [routerLink]="backLink()">
        <span aria-hidden="true">←</span> {{ backLabel() }}
      </a>

      @if (heading()) {
        <h1 class="frame__title"><span aria-hidden="true">{{ emoji() }}</span> {{ heading() }}</h1>
      }

      <ng-content />
    </div>
  `,
  styleUrl: './kart-page-frame.scss',
})
export class KartPageFrame {
  readonly heading = input('');
  readonly emoji = input('');
  readonly backLink = input('/jogos/pedro-kart');
  readonly backLabel = input('Voltar');
}
