import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Porta de entrada do Pedro Pedrerê na página de jogos.
 *
 * O mesmo desenho dos cartões do Pedro Maker, Kart e Flash. Nada do jogo é
 * carregado aqui: a página de jogos continua leve.
 */
@Component({
  selector: 'app-pedrere-launcher-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="launcher">
      <div class="launcher__art" aria-hidden="true">
        <span class="launcher__cloud"></span>
        <span class="launcher__hero">🤸</span>
        <span class="launcher__coin">🪙</span>
        <span class="launcher__crystal">🏁</span>
        <span class="launcher__ground"></span>
      </div>

      <div class="launcher__body">
        <h2 class="launcher__title">PEDRO PEDRERÊ</h2>
        <p class="launcher__subtitle">Corra, pule e quique com o Pedro!</p>
        <ul class="launcher__features">
          <li>🗺️ Aventuras em quatro fases, com moedas e pedrinhas bravas</li>
          <li>🤸 Pula-pula: suba o mais alto que conseguir</li>
          <li>🏁 Corrida contra a Lia, o Tito e a Nina</li>
          <li>👕 Personagem: escolha a roupa e o chapéu do Pedro</li>
          <li>🛠️ Modo maker para criar as suas fases</li>
        </ul>
        <div class="launcher__actions">
          <a class="button button--primary" routerLink="/jogos/pedro-pedrere">
            <span aria-hidden="true">▶</span> Jogar agora
          </a>
          <a class="button button--secondary" routerLink="/jogos/pedro-pedrere/maker">
            <span aria-hidden="true">🛠️</span> Criar fase
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrl: '../../../pedro-maker/components/maker-launcher-card/maker-launcher-card.scss',
})
export class PedrereLauncherCard {}
