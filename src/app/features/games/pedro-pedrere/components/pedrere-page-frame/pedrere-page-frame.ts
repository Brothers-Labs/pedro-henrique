import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Moldura das telas de menu do Pedro Pedrerê.
 *
 * Mesmo céu e mesmo botão de voltar do Pedro Maker e do Pedro Kart: quem já
 * brinca lá reconhece aqui onde fica cada coisa.
 */
@Component({
  selector: 'app-pedrere-page-frame',
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
  styleUrl: '../../../pedro-kart/components/kart-page-frame/kart-page-frame.scss',
})
export class PedrerePageFrame {
  readonly heading = input('');
  readonly emoji = input('');
  readonly backLink = input('/jogos/pedro-pedrere');
  readonly backLabel = input('Voltar');
}
