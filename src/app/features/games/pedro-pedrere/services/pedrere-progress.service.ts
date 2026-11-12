import { computed, inject, Injectable, signal } from '@angular/core';

import { GameProgressService } from '../../../../core/services/game-progress.service';
import {
  DEFAULT_HERO_LOOK,
  type HatId,
  type HeroLook,
  isHatId,
  isPantsColorId,
  isShirtColorId,
  type PantsColorId,
  type ShirtColorId,
} from '../config/hero-look.config';
import { adventureLevel } from '../levels/adventure-levels';
import type { AdventureResult, BounceResult, RaceResult } from '../models/scene.model';

const STORAGE_KEY = 'pedro-henrique:pedro-pedrere:v1';

/** Do terceiro lugar para cima a corrida vale como desafio vencido na jornada. */
export const PODIUM_PLACEMENT = 3;
/** Subir isto no pula-pula vale como desafio vencido na jornada. */
export const BOUNCE_GOAL_METERS = 25;

/** Tudo o que o Pedro Pedrerê guarda no aparelho, fora as fases criadas. */
export interface PedrereProgress {
  readonly look: HeroLook;
  /** Melhores estrelas de cada fase pronta, pelo id da fase. */
  readonly adventureStars: Readonly<Record<string, number>>;
  readonly bestHeightMeters: number;
  readonly races: number;
  readonly raceWins: number;
  readonly bestRaceMs: number | null;
}

export interface RecordOutcome {
  readonly isNewRecord: boolean;
}

const INITIAL_PROGRESS: PedrereProgress = {
  look: DEFAULT_HERO_LOOK,
  adventureStars: {},
  bestHeightMeters: 0,
  races: 0,
  raceWins: 0,
  bestRaceMs: null,
};

/**
 * Roupa, estrelas e recordes do Pedro Pedrerê.
 *
 * Fica no `localStorage` porque é pouco e precisa estar pronto antes da
 * primeira tela. Cada partida boa também conta um desafio na jornada geral de
 * jogos, que é de onde o mascote ganha experiência.
 */
@Injectable({ providedIn: 'root' })
export class PedrereProgressService {
  private readonly siteProgress = inject(GameProgressService);
  private readonly state = signal<PedrereProgress>(loadProgress());

  readonly progress = this.state.asReadonly();
  readonly look = computed(() => this.state().look);
  readonly totalStars = computed(() =>
    Object.values(this.state().adventureStars).reduce((sum, stars) => sum + stars, 0),
  );

  starsOf(levelId: string): number {
    return this.state().adventureStars[levelId] ?? 0;
  }

  chooseShirt(shirt: ShirtColorId): void {
    this.commit({ ...this.state(), look: { ...this.state().look, shirt } });
  }

  choosePants(pants: PantsColorId): void {
    this.commit({ ...this.state(), look: { ...this.state().look, pants } });
  }

  chooseHat(hat: HatId): void {
    this.commit({ ...this.state(), look: { ...this.state().look, hat } });
  }

  /** Guarda a fase vencida. Só as fases prontas têm estrelas guardadas; as criadas valem na jornada. */
  recordAdventure(levelId: string, result: AdventureResult): RecordOutcome {
    if (!result.isVictory) {
      return { isNewRecord: false };
    }

    const current = this.state();
    const previous = current.adventureStars[levelId] ?? 0;
    const isBuiltIn = adventureLevel(levelId) !== null;
    const isNewRecord = isBuiltIn && result.stars > previous;

    if (isNewRecord) {
      this.commit({ ...current, adventureStars: { ...current.adventureStars, [levelId]: result.stars } });
    }

    this.siteProgress.registerChallenge('pedro-pedrere', true);

    return { isNewRecord };
  }

  recordBounce(result: BounceResult): RecordOutcome {
    const current = this.state();
    const isNewRecord = result.heightMeters > current.bestHeightMeters;

    if (isNewRecord) {
      this.commit({ ...current, bestHeightMeters: result.heightMeters });
    }

    this.siteProgress.registerChallenge('pedro-pedrere', result.heightMeters >= BOUNCE_GOAL_METERS);

    return { isNewRecord };
  }

  recordRace(result: RaceResult): RecordOutcome {
    const current = this.state();
    const isNewRecord = current.bestRaceMs === null || result.timeMs < current.bestRaceMs;

    this.commit({
      ...current,
      races: current.races + 1,
      raceWins: current.raceWins + (result.placement === 1 ? 1 : 0),
      bestRaceMs: isNewRecord ? result.timeMs : current.bestRaceMs,
    });
    this.siteProgress.registerChallenge('pedro-pedrere', result.placement <= PODIUM_PLACEMENT);

    return { isNewRecord };
  }

  private commit(next: PedrereProgress): void {
    this.state.set(next);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Pedro Pedrerê: não foi possível guardar o progresso neste aparelho.', error);
    }
  }
}

function loadProgress(): PedrereProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? reconcilePedrereProgress(JSON.parse(raw)) : INITIAL_PROGRESS;
  } catch (error) {
    console.warn('Pedro Pedrerê: o progresso guardado estava ilegível e foi recomeçado.', error);

    return INITIAL_PROGRESS;
  }
}

/**
 * Lê o que estava guardado campo por campo.
 *
 * Um campo estranho volta ao padrão sem apagar o resto: perder a cor da
 * camisa não pode custar as estrelas das fases.
 */
export function reconcilePedrereProgress(value: unknown): PedrereProgress {
  if (!isRecord(value)) {
    return INITIAL_PROGRESS;
  }

  const look: Record<string, unknown> = isRecord(value['look']) ? value['look'] : {};
  const bestRaceMs = count(value['bestRaceMs']);

  return {
    look: {
      shirt: isShirtColorId(look['shirt']) ? look['shirt'] : DEFAULT_HERO_LOOK.shirt,
      pants: isPantsColorId(look['pants']) ? look['pants'] : DEFAULT_HERO_LOOK.pants,
      hat: isHatId(look['hat']) ? look['hat'] : DEFAULT_HERO_LOOK.hat,
    },
    adventureStars: reconcileStars(value['adventureStars']),
    bestHeightMeters: count(value['bestHeightMeters']),
    races: count(value['races']),
    raceWins: count(value['raceWins']),
    bestRaceMs: bestRaceMs > 0 ? bestRaceMs : null,
  };
}

function reconcileStars(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const stars: Record<string, number> = {};

  for (const [levelId, levelStars] of Object.entries(value)) {
    const amount = count(levelStars);

    if (adventureLevel(levelId) !== null && amount >= 1) {
      stars[levelId] = Math.min(3, amount);
    }
  }

  return stars;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
