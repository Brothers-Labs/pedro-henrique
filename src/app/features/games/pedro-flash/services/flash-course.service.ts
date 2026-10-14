import { computed, inject, Injectable, signal } from '@angular/core';

import { FLASH_COURSE_STORE, IndexedDbService } from '../../../../core/services/indexed-db.service';
import { createId } from '../../../../core/utils/format';
import type { CourseDraft } from '../course/course-editor';
import { findCourseProblems, normalizeCourseName, sanitizeCourse, sanitizePieces } from '../course/course-rules';
import { defaultCourse } from '../course/default-courses';
import type { CourseDefinition, CustomCourse } from '../models/course.model';

export type FlashCourseStatus = 'idle' | 'loading' | 'ready' | 'error';

/** O que o Pedro Flash Maker entrega para salvar; o serviço completa id e datas. */
export interface FlashCourseDraft extends CourseDraft {
  readonly id: string | null;
}

/**
 * As fases criadas no Pedro Flash Maker.
 *
 * Moram no IndexedDB do aparelho, como as pistas do Pedro Kart. As fases
 * oficiais não passam por aqui para serem guardadas, mas `find` acha as duas:
 * a tela da partida não precisa saber de onde a fase veio.
 */
@Injectable({ providedIn: 'root' })
export class FlashCourseService {
  private readonly database = inject(IndexedDbService);

  private readonly coursesState = signal<readonly CustomCourse[]>([]);
  private readonly statusState = signal<FlashCourseStatus>('idle');
  private loading: Promise<void> | null = null;

  readonly courses = this.coursesState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly isEmpty = computed(() => this.statusState() === 'ready' && this.coursesState().length === 0);

  /** Carrega uma vez só; chamadas seguintes esperam a mesma leitura. */
  load(): Promise<void> {
    this.loading ??= this.readAll();

    return this.loading;
  }

  /** Fase oficial ou criada pelo id; `null` quando ela não existe mais. */
  async find(id: string): Promise<CourseDefinition | null> {
    return defaultCourse(id) ?? this.findCustom(id);
  }

  async findCustom(id: string): Promise<CustomCourse | null> {
    await this.load();

    return this.coursesState().find((course) => course.id === id) ?? null;
  }

  async save(draft: FlashCourseDraft): Promise<CustomCourse> {
    const problems = findCourseProblems(draft.path);

    if (problems.length > 0) {
      throw new Error(`Pedro Flash: a fase ainda não dá para correr (${problems.join(', ')}).`);
    }

    await this.load();

    const now = new Date().toISOString();
    const existing = draft.id ? this.coursesState().find((course) => course.id === draft.id) : undefined;
    const course: CustomCourse = {
      id: existing?.id ?? createId('fase-flash'),
      name: normalizeCourseName(draft.name, `Minha fase ${this.coursesState().length + 1}`),
      theme: draft.theme,
      isCircuit: false,
      path: draft.path,
      pieces: sanitizePieces(draft.pieces, draft.path),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.database.put(FLASH_COURSE_STORE, course);
    this.coursesState.update((courses) => [course, ...courses.filter((candidate) => candidate.id !== course.id)]);

    return course;
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(FLASH_COURSE_STORE, id);
    this.coursesState.update((courses) => courses.filter((course) => course.id !== id));
  }

  private async readAll(): Promise<void> {
    this.statusState.set('loading');

    try {
      const stored = await this.database.getAll<unknown>(FLASH_COURSE_STORE);
      const courses = stored
        .map(sanitizeCustomCourse)
        .filter((course): course is CustomCourse => course !== null)
        .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

      this.coursesState.set(courses);
      this.statusState.set('ready');
    } catch (error) {
      console.error('Pedro Flash: não foi possível abrir as fases salvas.', error);
      this.statusState.set('error');
      // Uma próxima tentativa volta a ler, em vez de reaproveitar a falha.
      this.loading = null;
    }
  }
}

/** Fase guardada no aparelho, conferida peça por peça; data estranha vai para o fim da lista. */
export function sanitizeCustomCourse(value: unknown): CustomCourse | null {
  const course = sanitizeCourse(value);

  if (!course || typeof value !== 'object' || value === null) {
    return null;
  }

  const { createdAt, updatedAt } = value as Record<string, unknown>;
  const fallback = new Date(0).toISOString();

  return {
    ...course,
    createdAt: isIsoDate(createdAt) ? createdAt : fallback,
    updatedAt: isIsoDate(updatedAt) ? updatedAt : fallback,
  };
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
