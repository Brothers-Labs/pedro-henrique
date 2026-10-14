import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { formatRaceTime } from '../../../pedro-kart/race-format';
import { CourseThumbnail } from '../../components/course-thumbnail/course-thumbnail';
import { FlashDifficultyPicker } from '../../components/flash-difficulty-picker/flash-difficulty-picker';
import { FlashPageFrame } from '../../components/flash-page-frame/flash-page-frame';
import { flashTheme } from '../../config/theme.config';
import { DEFAULT_COURSES } from '../../course/default-courses';
import type { CourseDefinition } from '../../models/course.model';
import type { RunMode } from '../../models/runner.model';
import { FlashCourseService } from '../../services/flash-course.service';
import { FlashProgressService } from '../../services/flash-progress.service';

type CourseMode = Extract<RunMode, 'aventura' | 'corrida'>;

interface ModeOption {
  readonly id: CourseMode;
  readonly label: string;
  readonly emoji: string;
  readonly hint: string;
}

const MODES: readonly ModeOption[] = [
  { id: 'aventura', label: 'Aventura', emoji: '⚡', hint: 'Só você, atrás dos raios e do tempo de ouro.' },
  { id: 'corrida', label: 'Corrida', emoji: '🏁', hint: 'A mesma fase contra Ventania, Faísca e Cometa.' },
];

const STAR_SLOTS = [1, 2, 3] as const;

/**
 * Escolha da fase: as seis oficiais e as que o Pedro criou.
 *
 * O jeito de jogar (aventura ou corrida) vem no endereço, para o botão
 * "Corrida" do menu abrir esta mesma tela já no modo certo.
 */
@Component({
  selector: 'app-flash-courses-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FlashPageFrame, FlashDifficultyPicker, CourseThumbnail],
  templateUrl: './flash-courses-page.html',
  styleUrl: './flash-courses-page.scss',
})
export class FlashCoursesPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly progressService = inject(FlashProgressService);
  private readonly courseService = inject(FlashCourseService);

  protected readonly modes = MODES;
  protected readonly starSlots = STAR_SLOTS;
  protected readonly officialCourses = DEFAULT_COURSES;
  protected readonly customCourses = this.courseService.courses;
  protected readonly status = this.courseService.status;
  protected readonly isEmpty = this.courseService.isEmpty;
  protected readonly mode = toSignal(
    this.route.queryParamMap.pipe(map((params): CourseMode => (params.get('modo') === 'corrida' ? 'corrida' : 'aventura'))),
    { initialValue: 'aventura' },
  );
  protected readonly hint = computed(() => MODES.find((option) => option.id === this.mode())?.hint ?? '');
  /** Fase com o "apagar mesmo?" aberto; apagar é para sempre, então pede confirmação. */
  protected readonly pendingDeletion = signal<string | null>(null);

  constructor() {
    void this.courseService.load();
  }

  protected chooseMode(mode: CourseMode): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { modo: mode === 'corrida' ? 'corrida' : null }, replaceUrl: true });
  }

  protected themeLabel(course: CourseDefinition): string {
    const theme = flashTheme(course.theme);

    return `${theme.emoji} ${theme.label}`;
  }

  protected starsOf(course: CourseDefinition): number {
    return this.progressService.recordOf(this.mode(), course.id)?.bestStars ?? 0;
  }

  protected recordLabel(course: CourseDefinition): string | null {
    const record = this.progressService.recordOf(this.mode(), course.id);

    return record ? `Recorde ${formatRaceTime(record.bestTimeMs)} · ${record.bestRaios} raios` : null;
  }

  protected askToDelete(id: string): void {
    this.pendingDeletion.set(id);
  }

  protected cancelDeletion(): void {
    this.pendingDeletion.set(null);
  }

  protected async confirmDeletion(id: string): Promise<void> {
    this.pendingDeletion.set(null);

    try {
      await this.courseService.remove(id);
    } catch (error) {
      console.error('Pedro Flash: não foi possível apagar a fase.', error);
    }
  }

  protected retryLoading(): void {
    void this.courseService.load();
  }
}
