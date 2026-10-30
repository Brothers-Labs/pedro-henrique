import { computed, inject, Injectable, signal } from '@angular/core';

import { createId } from '../../../../core/utils/format';
import { seedFromText } from '../../pedro-maker/levels/seeded-random';
import { type GameMode, WORLD_SAVE_VERSION, type WorldSave } from '../models/world-save.model';
import { normalizeWorldName, parseWorldSave } from '../world/world-save';
import { WORLD_SAVE_GATEWAY } from './world-save.gateway';

/** Quantos mundos cabem no aparelho: o bastante para escolher, pouco para a lista não confundir. */
export const MAX_WORLDS = 5;

/** A fazenda que a criança já conhecia antes de existir "meus mundos": endereço e semente fixos. */
export const EXPLORATION_WORLD = { id: 'fazenda', name: 'Fazenda do Pedro' } as const;

export type CraftWorldsStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Um mundo guardado que não dá mais para abrir: a tela oferece apagar. */
export interface BrokenWorld {
  readonly id: string;
  readonly name: string;
  readonly problem: string;
}

export type WorldLookup =
  | { readonly type: 'found'; readonly save: WorldSave }
  | { readonly type: 'broken'; readonly world: BrokenWorld }
  | { readonly type: 'missing' };

/**
 * Os mundos do PedroCraft guardados no aparelho.
 *
 * Lê tudo uma vez e mantém a lista em signals, do mais recente para o mais
 * antigo. Cada registro passa por `parseWorldSave`: o que não tem conserto
 * vai para `broken`, e o resto da lista abre normalmente (CA04).
 */
@Injectable({ providedIn: 'root' })
export class CraftWorldsService {
  private readonly gateway = inject(WORLD_SAVE_GATEWAY);

  private readonly worldsState = signal<readonly WorldSave[]>([]);
  private readonly brokenState = signal<readonly BrokenWorld[]>([]);
  private readonly statusState = signal<CraftWorldsStatus>('idle');
  private loading: Promise<void> | null = null;

  readonly worlds = this.worldsState.asReadonly();
  readonly broken = this.brokenState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly canCreate = computed(() => this.worldsState().length + this.brokenState().length < MAX_WORLDS);

  /** Carrega uma vez só; chamadas seguintes esperam a mesma leitura. */
  load(): Promise<void> {
    this.loading ??= this.readAll();

    return this.loading;
  }

  async find(id: string): Promise<WorldLookup> {
    await this.load();

    const save = this.worldsState().find((world) => world.id === id);

    if (save) {
      return { type: 'found', save };
    }

    const broken = this.brokenState().find((world) => world.id === id);

    return broken ? { type: 'broken', world: broken } : { type: 'missing' };
  }

  /** Nome sugerido para o próximo mundo; a criança pode aceitar com um toque. */
  suggestedName(): string {
    return `Mundo ${this.worldsState().length + 1}`;
  }

  /** Um mundo novo, de semente sorteada, ainda sem nada jogado. */
  async create(name: string, mode: GameMode = 'adventure'): Promise<WorldSave> {
    await this.load();

    if (!this.canCreate()) {
      throw new Error(`PedroCraft: o aparelho já guarda ${MAX_WORLDS} mundos.`);
    }

    return this.store(newWorld(createId('mundo'), normalizeWorldName(name, this.suggestedName()), randomSeed(), mode));
  }

  /** A Fazenda do Pedro: abre a que existe, ou nasce de novo com a mesma semente de sempre. */
  async openExploration(): Promise<WorldSave> {
    const lookup = await this.find(EXPLORATION_WORLD.id);

    if (lookup.type === 'found') {
      return lookup.save;
    }

    return this.store(newWorld(EXPLORATION_WORLD.id, EXPLORATION_WORLD.name, seedFromText(EXPLORATION_WORLD.id), 'adventure'));
  }

  /** Guarda o mundo e o põe no topo da lista. */
  async save(save: WorldSave): Promise<void> {
    await this.store(save);
  }

  async remove(id: string): Promise<void> {
    await this.gateway.remove(id);
    this.worldsState.update((worlds) => worlds.filter((world) => world.id !== id));
    this.brokenState.update((worlds) => worlds.filter((world) => world.id !== id));
  }

  private async store(save: WorldSave): Promise<WorldSave> {
    await this.gateway.put(save);
    this.worldsState.update((worlds) => [save, ...worlds.filter((world) => world.id !== save.id)]);

    return save;
  }

  private async readAll(): Promise<void> {
    this.statusState.set('loading');

    try {
      const worlds: WorldSave[] = [];
      const broken: BrokenWorld[] = [];

      for (const stored of await this.gateway.list()) {
        try {
          worlds.push(parseWorldSave(stored));
        } catch (error) {
          console.warn('PedroCraft: um mundo salvo não pôde ser lido.', error);
          broken.push(describeBroken(stored, error));
        }
      }

      this.worldsState.set(worlds.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)));
      this.brokenState.set(broken);
      this.statusState.set('ready');
    } catch (error) {
      console.error('PedroCraft: não foi possível abrir os mundos salvos.', error);
      this.statusState.set('error');
      // Uma próxima tentativa volta a ler, em vez de reaproveitar a falha.
      this.loading = null;
    }
  }
}

function newWorld(id: string, name: string, seed: number, mode: GameMode): WorldSave {
  const now = new Date().toISOString();

  return { version: WORLD_SAVE_VERSION, id, name, seed, mode, createdAt: now, updatedAt: now, state: null };
}

/** Semente de 32 bits do gerador do navegador: dois mundos novos quase nunca saem iguais. */
function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** O pouco que dá para aproveitar de um registro estragado: o id (para apagar) e o nome (para reconhecer). */
function describeBroken(stored: unknown, error: unknown): BrokenWorld {
  const record = typeof stored === 'object' && stored !== null ? (stored as Readonly<Record<string, unknown>>) : {};
  const id = typeof record['id'] === 'string' ? record['id'] : '';
  const name = typeof record['name'] === 'string' ? record['name'] : 'Mundo sem nome';

  return { id, name, problem: error instanceof Error ? error.message : String(error) };
}
