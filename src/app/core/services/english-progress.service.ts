import { computed, Injectable, signal } from '@angular/core';

import { ENGLISH_RANKS } from '../data/english-quiz.data';
import type { EnglishProgress, EnglishRank } from '../models/english-quiz.model';

const STORAGE_KEY = 'pedro-henrique:english-progress';

const EMPTY_PROGRESS: EnglishProgress = { totalXp: 0, bestStreak: 0, masteredIds: [] };

/**
 * XP e fases dominadas do jogo de inglês, guardados em `localStorage`.
 *
 * O progresso é uma comemoração pessoal e fica só no dispositivo de quem joga:
 * não existe conta, ranking entre crianças nem envio de dados para fora.
 */
@Injectable({ providedIn: 'root' })
export class EnglishProgressService {
  private readonly progressState = signal<EnglishProgress>(readFromStorage());

  readonly totalXp = computed(() => this.progressState().totalXp);
  readonly bestStreak = computed(() => this.progressState().bestStreak);
  readonly masteredIds = computed<ReadonlySet<string>>(
    () => new Set(this.progressState().masteredIds),
  );

  readonly currentRank = computed(() => rankFor(this.totalXp()));
  readonly nextRank = computed(() => nextRankAfter(this.totalXp()));

  /** Quanto falta, em porcentagem, para alcançar a próxima patente. */
  readonly rankProgressPercentage = computed(() => {
    const next = this.nextRank();
    if (!next) {
      return 100;
    }

    const floor = this.currentRank().requiredXp;
    const span = next.requiredXp - floor;

    return Math.round(((this.totalXp() - floor) / span) * 100);
  });

  /** Soma o XP de uma fase concluída e guarda a melhor sequência já feita. */
  registerVictory(challengeId: string, earnedXp: number, streak: number): void {
    if (!Number.isFinite(earnedXp) || earnedXp < 0) {
      throw new Error(`XP inválido para a fase "${challengeId}": ${earnedXp}.`);
    }

    this.progressState.update((progress) => ({
      totalXp: progress.totalXp + earnedXp,
      bestStreak: Math.max(progress.bestStreak, streak),
      masteredIds: progress.masteredIds.includes(challengeId)
        ? progress.masteredIds
        : [...progress.masteredIds, challengeId],
    }));

    this.writeToStorage();
  }

  reset(): void {
    this.progressState.set(EMPTY_PROGRESS);
    this.writeToStorage();
  }

  private writeToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progressState()));
    } catch {
      // Guardar o progresso é um extra: o jogo segue normalmente na sessão atual.
    }
  }
}

/** Maior patente já alcançada com o XP informado. */
function rankFor(totalXp: number): EnglishRank {
  return ENGLISH_RANKS.reduce((reached, rank) => (totalXp >= rank.requiredXp ? rank : reached));
}

/** Próxima patente a conquistar, ou `null` quando o jogador chegou ao topo. */
function nextRankAfter(totalXp: number): EnglishRank | null {
  return ENGLISH_RANKS.find((rank) => rank.requiredXp > totalXp) ?? null;
}

function readFromStorage(): EnglishProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_PROGRESS;
    }

    const parsed: unknown = JSON.parse(raw);
    return isEnglishProgress(parsed) ? parsed : EMPTY_PROGRESS;
  } catch {
    // Navegador em modo privado ou dado corrompido: recomeçamos do zero.
    return EMPTY_PROGRESS;
  }
}

function isEnglishProgress(value: unknown): value is EnglishProgress {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<EnglishProgress>;

  return (
    typeof candidate.totalXp === 'number' &&
    Number.isFinite(candidate.totalXp) &&
    typeof candidate.bestStreak === 'number' &&
    Array.isArray(candidate.masteredIds) &&
    candidate.masteredIds.every((id) => typeof id === 'string')
  );
}
