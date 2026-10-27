import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { seedFromText } from '../../../pedro-maker/levels/seeded-random';
import { CraftGameHost } from '../../components/craft-game-host/craft-game-host';
import type { CraftCatalog } from '../../content/craft-catalog';
import { CraftContentService } from '../../services/craft-content.service';

type PlayStatus = 'loading' | 'ready' | 'error';

interface OpenWorld {
  readonly catalog: CraftCatalog;
  readonly seed: number;
  readonly name: string;
}

/** Nome do mundo de exploração aberto pela tela inicial. */
const EXPLORATION_WORLD_NAME = 'Fazenda do Pedro';

/**
 * Tela de jogo: busca o conteúdo e abre o mundo pedido no endereço.
 *
 * A semente vem do próprio endereço: o mesmo `/jogar/fazenda` abre sempre a
 * mesma fazenda.
 */
@Component({
  selector: 'app-craft-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CraftGameHost],
  template: `
    @switch (status()) {
      @case ('ready') {
        @if (world(); as open) {
          <app-craft-game-host [catalog]="open.catalog" [seed]="open.seed" [worldName]="open.name" (exited)="exit()" />
        }
      }
      @case ('loading') {
        <div class="message" role="status">
          <p class="message__emoji" aria-hidden="true">🧱</p>
          <p class="message__title">Abrindo o mundo…</p>
        </div>
      }
      @case ('error') {
        <div class="message" role="alert">
          <p class="message__emoji" aria-hidden="true">🧰</p>
          <h1 class="message__title">Ops! O mundo não abriu</h1>
          <p class="message__text">Verifique a internet e tente de novo daqui a pouquinho.</p>
          <a class="message__button" routerLink="/jogos/pedro-craft">🏠 Voltar ao PedroCraft</a>
        </div>
      }
    }
  `,
  styleUrl: './craft-play-page.scss',
})
export class CraftPlayPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly content = inject(CraftContentService);

  protected readonly status = signal<PlayStatus>('loading');
  protected readonly world = signal<OpenWorld | null>(null);

  constructor() {
    void this.load(this.route.snapshot.paramMap.get('worldId') ?? '');
  }

  protected exit(): void {
    void this.router.navigate(['/jogos/pedro-craft']);
  }

  private async load(worldId: string): Promise<void> {
    try {
      const catalog = await this.content.load();

      this.world.set({ catalog, seed: seedFromText(worldId), name: EXPLORATION_WORLD_NAME });
      this.status.set('ready');
    } catch (error) {
      console.error('PedroCraft: o conteúdo do jogo não pôde ser carregado.', error);
      this.status.set('error');
    }
  }
}
