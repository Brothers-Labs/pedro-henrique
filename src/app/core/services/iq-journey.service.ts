import { computed, Injectable, signal } from '@angular/core';

import { IQ_EMPTY_LIFETIME_STATS } from '../data/iq-game.data';
import type { IqJourneyRecord, IqLifetimeStats, IqSkill } from '../models/iq-game.model';

/** A versão faz parte da chave: um formato novo começa do zero, sem quebrar. */
const STORAGE_KEY = 'pedro-henrique:iq-journey:v1';

/** Jornadas guardadas para o histórico dos responsáveis. */
const MAX_HISTORY_ENTRIES = 12;

interface IqStoredState {
  readonly lifetime: IqLifetimeStats;
  readonly history: readonly IqJourneyRecord[];
}

const EMPTY_STATE: IqStoredState = { lifetime: IQ_EMPTY_LIFETIME_STATS, history: [] };

/**
 * Guarda o progresso do Desafio da Mente no dispositivo de quem joga.
 *
 * Só ficam números do jogo e a data da jornada: nada além do que o próprio
 * perfil público do site já mostra. Não existe conta, envio para servidor nem
 * comparação entre crianças — o histórico serve para os responsáveis
 * acompanharem a evolução no próprio aparelho.
 *
 * O serviço apenas guarda e devolve: as regras de soma e de conquista vivem no
 * motor da feature, para que `core` não dependa de `features`.
 */
@Injectable({ providedIn: 'root' })
export class IqJourneyService {
  private readonly state = signal<IqStoredState>(readFromStorage());

  readonly lifetime = computed(() => this.state().lifetime);
  readonly history = computed(() => this.state().history);
  readonly lastJourney = computed<IqJourneyRecord | null>(() => this.history()[0] ?? null);

  /** Guarda a jornada concluída junto do acumulado já somado pelo motor. */
  saveJourney(record: IqJourneyRecord, mergedLifetime: IqLifetimeStats): void {
    this.state.update((current) => ({
      lifetime: mergedLifetime,
      history: [record, ...current.history].slice(0, MAX_HISTORY_ENTRIES),
    }));

    this.writeToStorage();
  }

  reset(): void {
    this.state.set(EMPTY_STATE);
    this.writeToStorage();
  }

  private writeToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch {
      // Guardar o progresso é um extra: a jornada segue normal na sessão atual.
    }
  }
}

function readFromStorage(): IqStoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return EMPTY_STATE;
    }

    const candidate = parsed as Partial<IqStoredState>;

    return {
      lifetime: isLifetimeStats(candidate.lifetime) ? candidate.lifetime : IQ_EMPTY_LIFETIME_STATS,
      // Um registro corrompido é descartado sozinho, sem levar o resto junto.
      history: Array.isArray(candidate.history) ? candidate.history.filter(isJourneyRecord) : [],
    };
  } catch {
    // Navegador em modo privado ou dado corrompido: recomeçamos do zero.
    return EMPTY_STATE;
  }
}

const SKILLS: readonly IqSkill[] = [
  'logica',
  'numeros',
  'visual',
  'memoria',
  'atencao',
  'linguagem',
];

function isLifetimeStats(value: unknown): value is IqLifetimeStats {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<IqLifetimeStats>;

  return (
    isCount(candidate.totalXp) &&
    isCount(candidate.bestStreak) &&
    isCorrectBySkill(candidate.correctBySkill) &&
    Array.isArray(candidate.clearedIslandIds) &&
    candidate.clearedIslandIds.every((id) => typeof id === 'string') &&
    isCount(candidate.perfectMemoryRuns) &&
    isCount(candidate.attentionRuns) &&
    isCount(candidate.journeysCompleted)
  );
}

function isCorrectBySkill(value: unknown): value is Readonly<Record<IqSkill, number>> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;

  return SKILLS.every((skill) => isCount(candidate[skill]));
}

function isJourneyRecord(value: unknown): value is IqJourneyRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<IqJourneyRecord>;
  const summary = candidate.summary;

  return (
    typeof candidate.completedAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.completedAt)) &&
    typeof summary === 'object' &&
    summary !== null &&
    isCount(summary.cognitiveIndex) &&
    isCount(summary.answered) &&
    isCount(summary.age) &&
    Array.isArray(summary.skills)
  );
}

/** Número finito e não negativo: tudo o que guardamos é contagem. */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
