import { computed, inject, Injectable, signal } from '@angular/core';

import { GameProgressService } from '../../../../core/services/game-progress.service';
import { DEFAULT_KART_SETUP, isKartBodyId, isKartColorId, isRaceDifficulty } from '../config/kart.config';
import type { KartBodyId, KartColorId, KartSetup, RaceDifficulty } from '../models/kart.model';

const STORAGE_KEY = 'pedro-henrique:pedro-kart:v1';

/** Do pódio para cima vale como desafio vencido na jornada de jogos. */
const PODIUM_PLACEMENT = 3;

export interface TrackRecord {
  readonly bestTimeMs: number;
  readonly bestPlacement: number;
}

/** Tudo o que o Pedro Kart guarda no aparelho, fora as pistas criadas. */
export interface KartProgress {
  readonly setup: KartSetup;
  readonly difficulty: RaceDifficulty;
  readonly records: Readonly<Record<string, TrackRecord>>;
  readonly races: number;
  readonly wins: number;
}

export interface RaceRecordOutcome {
  readonly isNewBestTime: boolean;
  readonly isPodium: boolean;
  /** Estrelas da corrida: três para o primeiro lugar, duas para o pódio e uma para quem chegou. */
  readonly stars: number;
}

const INITIAL_PROGRESS: KartProgress = {
  setup: DEFAULT_KART_SETUP,
  difficulty: 'facil',
  records: {},
  races: 0,
  wins: 0,
};

/**
 * Garagem, dificuldade e recordes do Pedro Kart.
 *
 * Fica no `localStorage` porque é pouco e precisa estar pronto antes da
 * primeira tela. Cada corrida terminada no pódio também conta um desafio na
 * jornada geral de jogos, que é de onde o mascote ganha experiência.
 */
@Injectable({ providedIn: 'root' })
export class KartProgressService {
  private readonly siteProgress = inject(GameProgressService);
  private readonly state = signal<KartProgress>(loadProgress());

  readonly progress = this.state.asReadonly();
  readonly setup = computed(() => this.state().setup);
  readonly difficulty = computed(() => this.state().difficulty);

  recordOf(trackId: string): TrackRecord | null {
    return this.state().records[trackId] ?? null;
  }

  chooseBody(body: KartBodyId): void {
    this.commit({ ...this.state(), setup: { ...this.state().setup, body } });
  }

  chooseColor(color: KartColorId): void {
    this.commit({ ...this.state(), setup: { ...this.state().setup, color } });
  }

  chooseDifficulty(difficulty: RaceDifficulty): void {
    this.commit({ ...this.state(), difficulty });
  }

  recordRace(trackId: string, placement: number, timeMs: number): RaceRecordOutcome {
    const current = this.state();
    const previous = current.records[trackId];
    const isNewBestTime = !previous || timeMs < previous.bestTimeMs;
    const isPodium = placement <= PODIUM_PLACEMENT;

    this.commit({
      ...current,
      races: current.races + 1,
      wins: current.wins + (placement === 1 ? 1 : 0),
      records: {
        ...current.records,
        [trackId]: {
          bestTimeMs: previous && !isNewBestTime ? previous.bestTimeMs : timeMs,
          bestPlacement: previous ? Math.min(previous.bestPlacement, placement) : placement,
        },
      },
    });
    this.siteProgress.registerChallenge('pedro-kart', isPodium);

    return { isNewBestTime, isPodium, stars: starsFor(placement) };
  }

  private commit(next: KartProgress): void {
    this.state.set(next);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Pedro Kart: não foi possível guardar a garagem neste aparelho.', error);
    }
  }
}

export function starsFor(placement: number): number {
  if (placement === 1) {
    return 3;
  }

  return placement <= PODIUM_PLACEMENT ? 2 : 1;
}

function loadProgress(): KartProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? reconcileKartProgress(JSON.parse(raw)) : INITIAL_PROGRESS;
  } catch (error) {
    console.warn('Pedro Kart: a garagem guardada estava ilegível e foi recomeçada.', error);

    return INITIAL_PROGRESS;
  }
}

/**
 * Lê o que estava guardado campo por campo.
 *
 * Um campo estranho volta ao padrão sem apagar o resto: perder a cor do kart
 * não pode custar os recordes.
 */
export function reconcileKartProgress(value: unknown): KartProgress {
  if (!isRecord(value)) {
    return INITIAL_PROGRESS;
  }

  const setup: Record<string, unknown> = isRecord(value['setup']) ? value['setup'] : {};

  return {
    setup: {
      body: isKartBodyId(setup['body']) ? setup['body'] : DEFAULT_KART_SETUP.body,
      color: isKartColorId(setup['color']) ? setup['color'] : DEFAULT_KART_SETUP.color,
    },
    difficulty: isRaceDifficulty(value['difficulty']) ? value['difficulty'] : INITIAL_PROGRESS.difficulty,
    records: reconcileRecords(value['records']),
    races: count(value['races']),
    wins: count(value['wins']),
  };
}

function reconcileRecords(value: unknown): Record<string, TrackRecord> {
  if (!isRecord(value)) {
    return {};
  }

  const records: Record<string, TrackRecord> = {};

  for (const [trackId, record] of Object.entries(value)) {
    if (isRecord(record) && count(record['bestTimeMs']) > 0 && count(record['bestPlacement']) >= 1) {
      records[trackId] = { bestTimeMs: count(record['bestTimeMs']), bestPlacement: count(record['bestPlacement']) };
    }
  }

  return records;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
