import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Porta de entrada do Pedro Flash na página de jogos.
 *
 * Só um cartão com links, com o mesmo desenho dos cartões do Pedro Maker e do
 * Pedro Kart, e um céu de tempestade no lugar do céu azul. O motor 3D não é
 * carregado aqui: a página de jogos continua leve.
 */
@Component({
  selector: 'app-flash-launcher-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="launcher">
      <div class="launcher__art launcher__art--storm" aria-hidden="true">
        <span class="launcher__hero">🏃</span>
        <span class="launcher__coin">⚡</span>
        <span class="launcher__crystal">🤖</span>
        <span class="launcher__ground launcher__ground--road"></span>
      </div>

      <div class="launcher__body">
        <h2 class="launcher__title launcher__title--flash">PEDRO FLASH</h2>
        <p class="launcher__subtitle">Corra na velocidade do raio!</p>
        <ul class="launcher__features">
          <li>⚡ 6 fases em 3D com loopings, molas e rampas</li>
          <li>🏁 Corridas contra 3 corredores</li>
          <li>🤖 Batalhas contra os chefões do Doutor Apagão</li>
          <li>🛠️ Pedro Flash Maker para criar as suas fases</li>
        </ul>
        <div class="launcher__actions">
          <a class="button button--primary" routerLink="/jogos/pedro-flash">
            <span aria-hidden="true">▶</span> Correr agora
          </a>
          <a class="button button--secondary" routerLink="/jogos/pedro-flash/criar">
            <span aria-hidden="true">🛠️</span> Criar fase
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrls: ['../../../pedro-maker/components/maker-launcher-card/maker-launcher-card.scss', './flash-launcher-card.scss'],
})
export class FlashLauncherCard {}
