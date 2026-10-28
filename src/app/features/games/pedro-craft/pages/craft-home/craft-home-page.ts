import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CraftPageFrame } from '../../components/craft-page-frame/craft-page-frame';
import type { GameMode, WorldSave } from '../../models/world-save.model';
import { CraftWorldsService, EXPLORATION_WORLD, MAX_WORLDS } from '../../services/craft-worlds.service';
import { WORLD_NAME_MAX_LENGTH } from '../../world/world-save';

/** Os modos como a criança escolhe: figura, nome e o que muda, em uma frase. */
const MODES: readonly { readonly id: GameMode; readonly emoji: string; readonly name: string; readonly summary: string }[] = [
  { id: 'adventure', emoji: '🗺️', name: 'Aventura', summary: 'O jogo de sempre: colher, construir e cuidar da fazenda.' },
  { id: 'creative', emoji: '🎨', name: 'Criativo', summary: 'Todos os blocos, sem inimigos e dá para voar. Só construir!' },
  { id: 'survival', emoji: '🍎', name: 'Sobrevivência', summary: 'Com energia: lembre de comer. A energia nunca tira vida.' },
];

const MODE_NAMES: Readonly<Record<GameMode, string>> = { adventure: '🗺️ Aventura', creative: '🎨 Criativo', survival: '🍎 Sobrevivência' };

const SAVED_AT = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/**
 * Tela de abertura do PedroCraft: continuar, criar um mundo e escolher entre
 * os mundos guardados.
 *
 * O botão grande sempre leva a um mundo com um toque: o último jogado ou, na
 * primeira vez, a Fazenda do Pedro.
 */
@Component({
  selector: 'app-craft-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CraftPageFrame],
  templateUrl: './craft-home-page.html',
  styleUrl: './craft-home-page.scss',
})
export class CraftHomePage {
  private readonly worldsService = inject(CraftWorldsService);
  private readonly router = inject(Router);

  protected readonly maxWorlds = MAX_WORLDS;
  protected readonly nameMaxLength = WORLD_NAME_MAX_LENGTH;
  protected readonly explorationWorld = EXPLORATION_WORLD;
  protected readonly worlds = this.worldsService.worlds;
  protected readonly broken = this.worldsService.broken;
  protected readonly status = this.worldsService.status;
  protected readonly canCreate = this.worldsService.canCreate;
  protected readonly latest = computed<WorldSave | null>(() => this.worlds()[0] ?? null);
  protected readonly suggestedName = computed(() => this.worldsService.suggestedName());

  protected readonly modes = MODES;
  protected readonly modeNames = MODE_NAMES;
  protected readonly newName = signal('');
  protected readonly newMode = signal<GameMode>('adventure');
  protected readonly isCreating = signal(false);
  protected readonly pendingDeletion = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);

  constructor() {
    void this.worldsService.load();
  }

  protected savedAt(world: WorldSave): string {
    return world.state ? `Salvo em ${SAVED_AT.format(new Date(world.updatedAt))}` : 'Ainda não explorado';
  }

  protected updateName(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  protected async createWorld(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (this.isCreating() || !this.canCreate()) {
      return;
    }

    this.isCreating.set(true);
    this.problem.set(null);

    try {
      const world = await this.worldsService.create(this.newName(), this.newMode());

      await this.router.navigate(['/jogos/pedro-craft/jogar', world.id]);
    } catch (error) {
      console.error('PedroCraft: não foi possível criar o mundo.', error);
      this.problem.set('Não deu para criar o mundo agora. Tente de novo daqui a pouquinho.');
    } finally {
      this.isCreating.set(false);
    }
  }

  protected askDeletion(id: string): void {
    this.pendingDeletion.set(id);
  }

  protected cancelDeletion(): void {
    this.pendingDeletion.set(null);
  }

  protected async confirmDeletion(id: string): Promise<void> {
    this.pendingDeletion.set(null);
    this.problem.set(null);

    try {
      await this.worldsService.remove(id);
    } catch (error) {
      console.error('PedroCraft: não foi possível apagar o mundo.', error);
      this.problem.set('Não deu para apagar o mundo agora. Tente de novo daqui a pouquinho.');
    }
  }

  protected retryLoading(): void {
    void this.worldsService.load();
  }
}
