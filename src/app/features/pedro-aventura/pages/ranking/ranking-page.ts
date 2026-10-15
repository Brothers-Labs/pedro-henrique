import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { formatNumber, formatStopwatch } from '../../components/format';
import { AventuraStore } from '../../services/aventura-store.service';

/**
 * Ranking: os recordes do próprio jogador, fase por fase.
 *
 * Ranking entre jogadores precisa de servidor, e o site ainda não tem um. Em
 * vez de inventar adversários, a tela mostra só números de verdade e diz isso
 * com clareza.
 */
@Component({
  selector: 'app-ranking-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page__header">
        <h1 class="page__title">Ranking</h1>
        <p class="page__lead">Seus recordes neste aparelho. O ranking com outros jogadores chega quando o jogo tiver servidor.</p>
      </header>

      @let totals = summary();
      <dl class="totals">
        <div><dt>Estrelas</dt><dd>⭐ {{ totals.stars }}/{{ totals.maxStars }}</dd></div>
        <div><dt>Fases vencidas</dt><dd>🏁 {{ totals.won }}/{{ totals.levels }}</dd></div>
        <div><dt>Pontuação total</dt><dd>🏆 {{ formatNumber(totals.score) }}</dd></div>
      </dl>

      @for (view of regions(); track view.region.id) {
        <section class="group" [attr.aria-labelledby]="'ranking-' + view.region.id">
          <h2 class="group__title" [id]="'ranking-' + view.region.id">{{ view.region.emoji }} {{ view.region.name }}</h2>
          <table class="records">
            <thead>
              <tr>
                <th scope="col">Fase</th>
                <th scope="col">Estrelas</th>
                <th scope="col">Melhor tempo</th>
                <th scope="col">Pontuação</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of view.levels; track entry.level.id) {
                <tr>
                  <th scope="row">{{ entry.level.id }} · {{ entry.level.name }}</th>
                  <td>{{ entry.progress?.bestStars ?? 0 }}/3</td>
                  <td>
                    @if (entry.progress?.bestTimeMs; as best) {
                      {{ formatStopwatch(best) }}
                    } @else {
                      —
                    }
                  </td>
                  <td>
                    @if (entry.progress?.bestScore; as score) {
                      {{ formatNumber(score) }}
                    } @else {
                      —
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
  styleUrls: ['../page.scss', './ranking-page.scss'],
})
export class RankingPage {
  private readonly store = inject(AventuraStore);

  protected readonly regions = this.store.regions;
  protected readonly formatNumber = formatNumber;
  protected readonly formatStopwatch = formatStopwatch;

  protected readonly summary = computed(() => {
    const levels = this.regions().flatMap((view) => view.levels);

    return {
      stars: levels.reduce((sum, entry) => sum + (entry.progress?.bestStars ?? 0), 0),
      maxStars: levels.length * 3,
      won: levels.filter((entry) => (entry.progress?.wins ?? 0) > 0).length,
      levels: levels.length,
      score: levels.reduce((sum, entry) => sum + (entry.progress?.bestScore ?? 0), 0),
    };
  });
}
