import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CraftGameHost } from '../../components/craft-game-host/craft-game-host';
import type { CraftCatalog } from '../../content/craft-catalog';
import type { WorldSave } from '../../models/world-save.model';
import { CraftContentService } from '../../services/craft-content.service';
import { CraftWorldsService, EXPLORATION_WORLD, type WorldLookup } from '../../services/craft-worlds.service';

/** Por que o mundo não abriu: cada caso tem a sua frase para a criança. */
type PlayStatus = 'loading' | 'ready' | 'missing' | 'broken' | 'error';

interface OpenWorld {
  readonly catalog: CraftCatalog;
  readonly world: WorldSave;
}

/**
 * Tela de jogo: busca o conteúdo e o mundo pedido no endereço e abre o jogo.
 *
 * Um mundo estragado ou apagado não derruba a tela: a criança lê o que
 * aconteceu e volta para escolher outro mundo (CA04).
 */
@Component({
  selector: 'app-craft-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CraftGameHost],
  template: `
    @switch (status()) {
      @case ('ready') {
        @if (open(); as current) {
          <app-craft-game-host [catalog]="current.catalog" [world]="current.world" (exited)="exit()" />
        }
      }
      @case ('loading') {
        <div class="message" role="status">
          <p class="message__emoji" aria-hidden="true">🧱</p>
          <p class="message__title">Abrindo o mundo…</p>
        </div>
      }
      @case ('missing') {
        <div class="message" role="alert">
          <p class="message__emoji" aria-hidden="true">🔎</p>
          <h1 class="message__title">Esse mundo não está aqui</h1>
          <p class="message__text">Ele pode ter sido apagado. Escolha outro mundo ou crie um novo.</p>
          <a class="message__button" routerLink="/jogos/pedro-craft">🌍 Meus mundos</a>
        </div>
      }
      @case ('broken') {
        <div class="message" role="alert">
          <p class="message__emoji" aria-hidden="true">🧩</p>
          <h1 class="message__title">Esse mundo se quebrou</h1>
          <p class="message__text">Não dá para abrir este mundo salvo. Escolha outro mundo ou crie um novo.</p>
          <a class="message__button" routerLink="/jogos/pedro-craft">🌍 Meus mundos</a>
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
  private readonly worlds = inject(CraftWorldsService);

  protected readonly status = signal<PlayStatus>('loading');
  protected readonly open = signal<OpenWorld | null>(null);

  constructor() {
    void this.load(this.route.snapshot.paramMap.get('worldId') ?? '');
  }

  protected exit(): void {
    void this.router.navigate(['/jogos/pedro-craft']);
  }

  private async load(worldId: string): Promise<void> {
    try {
      const [catalog, lookup] = await Promise.all([this.content.load(), this.findWorld(worldId)]);

      if (lookup.type !== 'found') {
        this.status.set(lookup.type);
        return;
      }

      this.open.set({ catalog, world: lookup.save });
      this.status.set('ready');
    } catch (error) {
      console.error('PedroCraft: o mundo não pôde ser aberto.', error);
      this.status.set('error');
    }
  }

  /** A Fazenda do Pedro sempre existe: o endereço antigo `/jogar/fazenda` a abre ou a cria. */
  private async findWorld(worldId: string): Promise<WorldLookup> {
    if (worldId === EXPLORATION_WORLD.id) {
      return { type: 'found', save: await this.worlds.openExploration() };
    }

    return this.worlds.find(worldId);
  }
}
