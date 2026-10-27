import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Moldura das telas de menu do PedroCraft.
 *
 * Mesmo céu e mesmo botão de voltar dos outros jogos 3D do site: quem já
 * brinca no Pedro Maker reconhece aqui onde fica cada coisa.
 */
@Component({
  selector: 'app-craft-page-frame',
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
export class CraftPageFrame {
  readonly heading = input('');
  readonly emoji = input('');
  readonly backLink = input('/jogos/pedro-craft');
  readonly backLabel = input('Voltar');
}
