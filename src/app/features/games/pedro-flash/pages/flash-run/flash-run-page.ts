import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { formatPlacement, formatRaceTime } from '../../../pedro-kart/race-format';
import { FlashPageFrame } from '../../components/flash-page-frame/flash-page-frame';
import { FlashRunHost } from '../../components/flash-run-host/flash-run-host';
import { findArena } from '../../course/default-courses';
import type { CourseDefinition } from '../../models/course.model';
import type { BossId, RunMode } from '../../models/runner.model';
import { FlashCourseService } from '../../services/flash-course.service';
import { FlashProgressService, type RunRecordOutcome } from '../../services/flash-progress.service';
import type { RunResult } from '../../simulation/run-simulation';

type PageStatus = 'carregando' | 'pronta' | 'nao-encontrada' | 'erro';

/** O que a partida precisa: a fase, o jeito de jogar e, na batalha, o chefão. */
interface RunPlan {
  readonly course: CourseDefinition;
  readonly mode: RunMode;
  readonly boss: BossId | null;
}

interface FinishedRun {
  readonly result: RunResult;
  readonly outcome: RunRecordOutcome;
}

const STAR_SLOTS = [1, 2, 3] as const;

/** O que dizer no fim; nunca soa como derrota. */
function finishMessage(result: RunResult, stars: number): string {
  if (result.mode === 'batalha') {
    return 'Você derrotou o chefão! 🏆';
  }

  if (result.mode === 'corrida') {
    if (result.placement === 1) {
      return 'Você venceu a corrida! 🥇';
    }

    return result.placement === 2 ? 'Segundo lugar! Quase lá! 🥈' : 'Você cruzou a chegada! Bora de novo? 💪';
  }

  return stars === 3 ? 'Fase perfeita! Velocidade do raio! ⚡' : 'Você chegou! Que corrida! 🎉';
}

function isRunMode(value: string): value is RunMode {
  return value === 'aventura' || value === 'corrida' || value === 'batalha';
}

/**
 * A tela da partida.
 *
 * Carrega a fase (oficial, criada ou arena), entrega para o anfitrião da
 * partida e mostra o resultado na chegada. "Correr de novo" troca a chave do
 * anfitrião, e o Angular cria uma partida novinha.
 */
@Component({
  selector: 'app-flash-run-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FlashPageFrame, FlashRunHost],
  templateUrl: './flash-run-page.html',
  styleUrl: './flash-run-page.scss',
})
export class FlashRunPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly courses = inject(FlashCourseService);
  private readonly progress = inject(FlashProgressService);
  private readonly params = toSignal(
    this.route.paramMap.pipe(map((params) => ({ mode: params.get('mode') ?? '', courseId: params.get('courseId') ?? '' }))),
    { initialValue: { mode: '', courseId: '' } },
  );

  protected readonly status = signal<PageStatus>('carregando');
  protected readonly plan = signal<RunPlan | null>(null);
  protected readonly finished = signal<FinishedRun | null>(null);
  protected readonly attempt = signal(0);
  /** Uma chave por tentativa: trocar a chave recria o anfitrião, e a partida recomeça limpa. */
  protected readonly runKeys = computed(() => [`${this.plan()?.course.id ?? ''}:${this.attempt()}`]);
  protected readonly isBattle = computed(() => this.plan()?.mode === 'batalha');
  protected readonly listLink = computed(() => (this.isBattle() ? '/jogos/pedro-flash/batalha' : '/jogos/pedro-flash/fases'));
  protected readonly listLabel = computed(() => (this.isBattle() ? 'Arenas' : 'Fases'));
  protected readonly formatTime = formatRaceTime;
  protected readonly formatPlacement = formatPlacement;
  protected readonly finishMessage = finishMessage;
  protected readonly starSlots = STAR_SLOTS;

  constructor() {
    effect(() => {
      const { mode, courseId } = this.params();

      untracked(() => void this.load(mode, courseId));
    });
  }

  protected onFinished(result: RunResult): void {
    const plan = this.plan();

    if (!plan) {
      return;
    }

    this.finished.set({ result, outcome: this.progress.recordRun(plan.course.id, result) });
  }

  protected runAgain(): void {
    this.finished.set(null);
    this.attempt.update((value) => value + 1);
  }

  protected leave(): void {
    void this.router.navigate([this.listLink()]);
  }

  private async load(mode: string, courseId: string): Promise<void> {
    this.status.set('carregando');
    this.finished.set(null);

    try {
      const plan = await this.findPlan(mode, courseId);

      this.plan.set(plan);
      this.status.set(plan ? 'pronta' : 'nao-encontrada');
    } catch (error) {
      console.error('Pedro Flash: não foi possível abrir a fase.', error);
      this.status.set('erro');
    }
  }

  private async findPlan(mode: string, courseId: string): Promise<RunPlan | null> {
    if (!isRunMode(mode)) {
      return null;
    }

    if (mode === 'batalha') {
      const arena = findArena(courseId);

      return arena ? { course: arena.course, mode, boss: arena.boss } : null;
    }

    const course = await this.courses.find(courseId);

    return course && !course.isCircuit ? { course, mode, boss: null } : null;
  }
}
