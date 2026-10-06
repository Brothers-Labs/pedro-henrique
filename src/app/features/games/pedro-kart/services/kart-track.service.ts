import { computed, inject, Injectable, signal } from '@angular/core';

import { IndexedDbService, KART_TRACK_STORE } from '../../../../core/services/indexed-db.service';
import { createId } from '../../../../core/utils/format';
import type { CustomTrack, GridCell, TrackDefinition, TrackTheme } from '../models/track.model';
import { defaultTrack } from '../tracks/default-tracks';
import { clampLaps, findTrackProblems, normalizeTrackName, sanitizeCellIndexes, sanitizeTrack } from '../tracks/track-rules';

export type KartTrackStatus = 'idle' | 'loading' | 'ready' | 'error';

/** O que o Pedro Kart Maker entrega para salvar; o serviço completa id e datas. */
export interface KartTrackDraft {
  readonly id: string | null;
  readonly name: string;
  readonly theme: TrackTheme;
  readonly laps: number;
  readonly path: readonly GridCell[];
  readonly boostCells: readonly number[];
  readonly itemCells: readonly number[];
}

/**
 * As pistas criadas no Pedro Kart Maker.
 *
 * Moram no IndexedDB do aparelho, como as fases do Pedro Maker. As pistas
 * oficiais não passam por aqui para serem guardadas, mas `find` acha as duas:
 * a tela de corrida não precisa saber de onde a pista veio.
 */
@Injectable({ providedIn: 'root' })
export class KartTrackService {
  private readonly database = inject(IndexedDbService);

  private readonly tracksState = signal<readonly CustomTrack[]>([]);
  private readonly statusState = signal<KartTrackStatus>('idle');
  private loading: Promise<void> | null = null;

  readonly tracks = this.tracksState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly isEmpty = computed(() => this.statusState() === 'ready' && this.tracksState().length === 0);

  /** Carrega uma vez só; chamadas seguintes esperam a mesma leitura. */
  load(): Promise<void> {
    this.loading ??= this.readAll();

    return this.loading;
  }

  /** Pista oficial ou criada pelo id; `null` quando ela não existe mais. */
  async find(id: string): Promise<TrackDefinition | null> {
    const official = defaultTrack(id);

    if (official) {
      return official;
    }

    return this.findCustom(id);
  }

  async findCustom(id: string): Promise<CustomTrack | null> {
    await this.load();

    return this.tracksState().find((track) => track.id === id) ?? null;
  }

  async save(draft: KartTrackDraft): Promise<CustomTrack> {
    const problems = findTrackProblems(draft.path);

    if (problems.length > 0) {
      throw new Error(`Pedro Kart: a pista ainda não fecha (${problems.join(', ')}).`);
    }

    await this.load();

    const now = new Date().toISOString();
    const existing = draft.id ? this.tracksState().find((track) => track.id === draft.id) : undefined;
    const track: CustomTrack = {
      id: existing?.id ?? createId('pista'),
      name: normalizeTrackName(draft.name, `Minha pista ${this.tracksState().length + 1}`),
      theme: draft.theme,
      laps: clampLaps(draft.laps),
      path: draft.path,
      boostCells: sanitizeCellIndexes(draft.boostCells, draft.path.length),
      itemCells: sanitizeCellIndexes(draft.itemCells, draft.path.length),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.database.put(KART_TRACK_STORE, track);
    this.tracksState.update((tracks) => [track, ...tracks.filter((candidate) => candidate.id !== track.id)]);

    return track;
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(KART_TRACK_STORE, id);
    this.tracksState.update((tracks) => tracks.filter((track) => track.id !== id));
  }

  private async readAll(): Promise<void> {
    this.statusState.set('loading');

    try {
      const stored = await this.database.getAll<unknown>(KART_TRACK_STORE);
      const tracks = stored
        .map(sanitizeCustomTrack)
        .filter((track): track is CustomTrack => track !== null)
        .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

      this.tracksState.set(tracks);
      this.statusState.set('ready');
    } catch (error) {
      console.error('Pedro Kart: não foi possível abrir as pistas salvas.', error);
      this.statusState.set('error');
      // Uma próxima tentativa volta a ler, em vez de reaproveitar a falha.
      this.loading = null;
    }
  }
}

/** Pista guardada no aparelho, conferida peça por peça; data estranha vai para o fim da lista. */
export function sanitizeCustomTrack(value: unknown): CustomTrack | null {
  const track = sanitizeTrack(value);

  if (!track || typeof value !== 'object' || value === null) {
    return null;
  }

  const { createdAt, updatedAt } = value as Record<string, unknown>;
  const fallback = new Date(0).toISOString();

  return {
    ...track,
    createdAt: isIsoDate(createdAt) ? createdAt : fallback,
    updatedAt: isIsoDate(updatedAt) ? updatedAt : fallback,
  };
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
