import { computed, inject, Injectable, signal } from '@angular/core';

import { GameProgressService } from '../../../../core/services/game-progress.service';
import { DEFAULT_RUNNER_SETUP, isFlashDifficulty, isShoeId, isTrailColorId } from '../config/runner.config';
import type { FlashDifficulty, RunMode, RunnerSetup, ShoeId, TrailColorId } from '../models/runner.model';
import type { RunResult } from '../simulation/run-simulation';

const STORAGE_KEY = 'pedro-henrique:pedro-flash:v1';

/** Fração dos raios da fase que vale a estrela dos raios na aventura. */
const RAIO_STAR_FRACTION = 0.6;
/** Na batalha, até tantos machucados ainda valem duas estrelas. */
const BATTLE_HITS_FOR_TWO_STARS = 3;
/** Duas estrelas ou mais contam como acerto na jornada de jogos. */
const SUCCESS_STARS = 2;

export interface RunRecord {
  readonly bestTimeMs: number;
  readonly bestStars: number;
  readonly bestRaios: number;
}

/** Tudo o que o Pedro Flash guarda no aparelho, fora as fases criadas. */
export interface FlashProgress {
  readonly setup: RunnerSetup;
  readonly difficulty: FlashDifficulty;
  /** Recordes por modo e fase, na chave `modo:id`. */
  readonly records: Readonly<Record<string, RunRecord>>;
  readonly runs: number;
  readonly wins: number;
  readonly raiosCollected: number;
  readonly enemiesDefeated: number;
  readonly bossesDefeated: number;
}

export interface RunRecordOutcome {
  readonly stars: number;
  readonly isNewBestTime: boolean;
}

const INITIAL_PROGRESS: FlashProgress = {
  setup: DEFAULT_RUNNER_SETUP,
  difficulty: 'facil',
  records: {},
  runs: 0,
  wins: 0,
  raiosCollected: 0,
  enemiesDefeated: 0,
  bossesDefeated: 0,
};

/**
 * Vestiário, dificuldade e recordes do Pedro Flash.
 *
 * Fica no `localStorage` porque é pouco e precisa estar pronto antes da
 * primeira tela. Cada partida terminada também conta um desafio na jornada
 * geral de jogos, que é de onde o mascote ganha experiência.
 */
@Injectable({ providedIn: 'root' })
export class FlashProgressService {
  private readonly siteProgress = inject(GameProgressService);
  private readonly state = signal<FlashProgress>(loadProgress());

  readonly progress = this.state.asReadonly();
  readonly setup = computed(() => this.state().setup);
  readonly difficulty = computed(() => this.state().difficulty);

  recordOf(mode: RunMode, courseId: string): RunRecord | null {
    return this.state().records[recordKey(mode, courseId)] ?? null;
  }

  chooseShoe(shoe: ShoeId): void {
    this.commit({ ...this.state(), setup: { ...this.state().setup, shoe } });
  }

  chooseTrail(trail: TrailColorId): void {
    this.commit({ ...this.state(), setup: { ...this.state().setup, trail } });
  }

  chooseDifficulty(difficulty: FlashDifficulty): void {
    this.commit({ ...this.state(), difficulty });
  }

  recordRun(courseId: string, result: RunResult): RunRecordOutcome {
    const current = this.state();
    const key = recordKey(result.mode, courseId);
    const previous: RunRecord | undefined = current.records[key];
    const stars = starsFor(result);
    const isNewBestTime = !previous || result.timeMs < previous.bestTimeMs;
    const isWin = result.mode === 'corrida' && result.placement === 1;

    this.commit({
      ...current,
      runs: current.runs + 1,
      wins: current.wins + (isWin ? 1 : 0),
      raiosCollected: current.raiosCollected + result.raios,
      enemiesDefeated: current.enemiesDefeated + result.enemiesDefeated,
      bossesDefeated: current.bossesDefeated + (result.bossDefeated ? 1 : 0),
      records: {
        ...current.records,
        [key]: {
          bestTimeMs: previous && !isNewBestTime ? previous.bestTimeMs : result.timeMs,
          bestStars: Math.max(previous?.bestStars ?? 0, stars),
          bestRaios: Math.max(previous?.bestRaios ?? 0, result.raios),
        },
      },
    });
    this.siteProgress.registerChallenge('pedro-flash', stars >= SUCCESS_STARS);

    return { stars, isNewBestTime };
  }

  private commit(next: FlashProgress): void {
    this.state.set(next);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Pedro Flash: não foi possível guardar o progresso neste aparelho.', error);
    }
  }
}

/**
 * Estrelas da partida, de uma a três: chegar sempre vale uma.
 *
 * - Aventura: mais uma pelo "tempo de ouro" e mais uma por juntar a maior
 *   parte dos raios da fase.
 * - Corrida: três para o primeiro lugar, duas para o segundo.
 * - Batalha: três sem nenhum machucado, duas com poucos.
 */
export function starsFor(result: RunResult): number {
  switch (result.mode) {
    case 'aventura': {
      const isFast = result.timeMs <= result.parTimeMs;
      const hasRaios = result.totalRaios > 0 && result.raios >= Math.ceil(result.totalRaios * RAIO_STAR_FRACTION);

      return 1 + (isFast ? 1 : 0) + (hasRaios ? 1 : 0);
    }
    case 'corrida':
      if (result.placement === 1) {
        return 3;
      }

      return result.placement === 2 ? 2 : 1;
    case 'batalha':
      if (result.hitsTaken === 0) {
        return 3;
      }

      return result.hitsTaken <= BATTLE_HITS_FOR_TWO_STARS ? 2 : 1;
  }
}

function recordKey(mode: RunMode, courseId: string): string {
  return `${mode}:${courseId}`;
}

function loadProgress(): FlashProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? reconcileFlashProgress(JSON.parse(raw)) : INITIAL_PROGRESS;
  } catch (error) {
    console.warn('Pedro Flash: o progresso guardado estava ilegível e foi recomeçado.', error);

    return INITIAL_PROGRESS;
  }
}

/**
 * Lê o que estava guardado campo por campo.
 *
 * Um campo estranho volta ao padrão sem apagar o resto: perder a cor do
 * rastro não pode custar os recordes.
 */
export function reconcileFlashProgress(value: unknown): FlashProgress {
  if (!isRecord(value)) {
    return INITIAL_PROGRESS;
  }

  const setup: Record<string, unknown> = isRecord(value['setup']) ? value['setup'] : {};

  return {
    setup: {
      shoe: isShoeId(setup['shoe']) ? setup['shoe'] : DEFAULT_RUNNER_SETUP.shoe,
      trail: isTrailColorId(setup['trail']) ? setup['trail'] : DEFAULT_RUNNER_SETUP.trail,
    },
    difficulty: isFlashDifficulty(value['difficulty']) ? value['difficulty'] : INITIAL_PROGRESS.difficulty,
    records: reconcileRecords(value['records']),
    runs: count(value['runs']),
    wins: count(value['wins']),
    raiosCollected: count(value['raiosCollected']),
    enemiesDefeated: count(value['enemiesDefeated']),
    bossesDefeated: count(value['bossesDefeated']),
  };
}

function reconcileRecords(value: unknown): Record<string, RunRecord> {
  if (!isRecord(value)) {
    return {};
  }

  const records: Record<string, RunRecord> = {};

  for (const [key, record] of Object.entries(value)) {
    if (isRecord(record) && count(record['bestTimeMs']) > 0) {
      records[key] = {
        bestTimeMs: count(record['bestTimeMs']),
        bestStars: Math.min(3, count(record['bestStars'])),
        bestRaios: count(record['bestRaios']),
      };
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
