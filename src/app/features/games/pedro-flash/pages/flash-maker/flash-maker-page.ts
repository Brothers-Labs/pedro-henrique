import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { CourseGrid, type CellPointerEvent } from '../../components/course-grid/course-grid';
import { FlashPageFrame } from '../../components/flash-page-frame/flash-page-frame';
import { pieceDefinition, PIECES } from '../../config/piece.config';
import { FLASH_THEMES } from '../../config/theme.config';
import {
  commitDraft,
  createEditorHistory,
  createEmptyDraft,
  erasePiece,
  extendPath,
  placePiece,
  undoDraft,
  type CourseDraft,
  type EditorHistory,
} from '../../course/course-editor';
import { COURSE_PROBLEM_MESSAGES, findCourseProblems, PIECE_PROBLEM_MESSAGES } from '../../course/course-rules';
import { COURSE_LIMITS, type FlashTheme, type PieceKind } from '../../models/course.model';
import { FlashCourseService } from '../../services/flash-course.service';

type EditorTool = 'caminho' | 'borracha' | PieceKind;
type PageStatus = 'carregando' | 'pronto' | 'nao-encontrada' | 'erro';
type SaveState = 'parado' | 'salvando' | 'erro';

const PIECE_GROUPS = [
  { id: 'ajuda', label: 'Ajudas' },
  { id: 'perigo', label: 'Perigos' },
  { id: 'robo', label: 'Robôs' },
].map((group) => ({ ...group, pieces: PIECES.filter((piece) => piece.group === group.id) }));

/**
 * O Pedro Flash Maker: o editor de fases.
 *
 * Primeiro o Pedro arrasta o dedo pela grade e o caminho vai nascendo atrás
 * dele, da largada até a chegada. Depois escolhe uma peça e toca nas casas
 * do caminho. Um traço inteiro de dedo vira um único passo de desfazer.
 */
@Component({
  selector: 'app-flash-maker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlashPageFrame, CourseGrid],
  templateUrl: './flash-maker-page.html',
  styleUrls: ['../../../pedro-kart/pages/kart-maker/kart-maker-page.scss', './flash-maker-page.scss'],
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class FlashMakerPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly courses = inject(FlashCourseService);
  private readonly courseId = toSignal(this.route.paramMap.pipe(map((params) => params.get('courseId'))), {
    initialValue: null,
  });

  private readonly history = signal<EditorHistory<CourseDraft>>(createEditorHistory(createEmptyDraft()));
  /** Começo do traço em andamento: ao soltar o dedo, o traço todo vira um passo só. */
  private strokeStart: CourseDraft | null = null;

  protected readonly pieceGroups = PIECE_GROUPS;
  protected readonly themes = FLASH_THEMES;
  protected readonly limits = COURSE_LIMITS;
  protected readonly tool = signal<EditorTool>('caminho');
  protected readonly status = signal<PageStatus>('carregando');
  protected readonly saveState = signal<SaveState>('parado');
  /** Por que a última peça não coube; some no próximo toque que dá certo. */
  protected readonly pieceMessage = signal<string | null>(null);
  protected readonly draft = computed(() => this.history().present);
  protected readonly canUndo = computed(() => this.history().past.length > 0);
  protected readonly problems = computed(() => findCourseProblems(this.draft().path));
  protected readonly isPlayable = computed(() => this.problems().length === 0);
  protected readonly problemMessage = computed(() => {
    const first = this.problems()[0];

    return first ? COURSE_PROBLEM_MESSAGES[first] : null;
  });
  protected readonly toolHint = computed(() => {
    const tool = this.tool();

    switch (tool) {
      case 'caminho':
        return 'Arraste o dedo pela grade, da largada 🚦 até a chegada 🏁. Volte o dedo para apagar.';
      case 'borracha':
        return 'Toque numa casa para tirar a peça dela.';
      default: {
        const piece = pieceDefinition(tool);
        const lane = piece.usesLane ? ' Toque de novo para mudar de faixa.' : '';

        return `${piece.emoji} ${piece.hint} Toque numa casa do caminho.${lane}`;
      }
    }
  });
  protected readonly isEditing = computed(() => this.courseId() !== null);

  constructor() {
    effect(() => {
      const id = this.courseId();

      untracked(() => void this.open(id));
    });
  }

  protected chooseTool(tool: EditorTool): void {
    this.tool.set(tool);
    this.pieceMessage.set(null);
  }

  protected onCellPointer(event: CellPointerEvent): void {
    if (event.phase === 'fim') {
      this.finishStroke();
      return;
    }

    if (!event.cell) {
      return;
    }

    if (event.phase === 'inicio') {
      this.strokeStart = this.draft();
    }

    const tool = this.tool();

    if (tool === 'caminho') {
      this.replacePresent(extendPath(this.draft(), event.cell));
      return;
    }

    // Peças e borracha valem um toque: arrastar por cima não fica pondo e tirando.
    if (event.phase === 'arrasto') {
      return;
    }

    if (tool === 'borracha') {
      this.replacePresent(erasePiece(this.draft(), event.cell));
      return;
    }

    const { draft, problem } = placePiece(this.draft(), event.cell, tool);

    this.pieceMessage.set(problem ? PIECE_PROBLEM_MESSAGES[problem] : null);
    this.replacePresent(draft);
  }

  protected rename(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.commit({ ...this.draft(), name: target.value.slice(0, COURSE_LIMITS.maximumNameLength) });
    }
  }

  protected chooseTheme(theme: FlashTheme): void {
    this.commit({ ...this.draft(), theme });
  }

  protected undo(): void {
    this.history.update(undoDraft);
  }

  protected clear(): void {
    this.commit({ ...this.draft(), path: [], pieces: [] });
  }

  protected async save(thenRun: boolean): Promise<void> {
    if (!this.isPlayable() || this.saveState() === 'salvando') {
      return;
    }

    this.saveState.set('salvando');

    try {
      const saved = await this.courses.save({ id: this.courseId(), ...this.draft() });

      this.saveState.set('parado');
      await this.router.navigate(thenRun ? ['/jogos/pedro-flash/correr', 'aventura', saved.id] : ['/jogos/pedro-flash/fases']);
    } catch (error) {
      console.error('Pedro Flash: não foi possível salvar a fase.', error);
      this.saveState.set('erro');
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z';

    if (isUndo && !(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
      this.undo();
    }
  }

  private finishStroke(): void {
    const start = this.strokeStart;

    this.strokeStart = null;

    if (start && start !== this.draft()) {
      this.history.update((history) => commitDraft({ past: history.past, present: start }, history.present));
    }
  }

  /** Durante o traço, a fase muda na tela sem empilhar um passo de desfazer por casa. */
  private replacePresent(next: CourseDraft): void {
    this.history.update((history) => (next === history.present ? history : { ...history, present: next }));
  }

  private commit(next: CourseDraft): void {
    this.history.update((history) => commitDraft(history, next));
  }

  private async open(id: string | null): Promise<void> {
    if (id === null) {
      this.history.set(createEditorHistory(createEmptyDraft()));
      this.status.set('pronto');
      return;
    }

    this.status.set('carregando');

    try {
      const course = await this.courses.findCustom(id);

      if (!course) {
        this.status.set('nao-encontrada');
        return;
      }

      const { name, theme, path, pieces } = course;

      this.history.set(createEditorHistory({ name, theme, path, pieces }));
      this.status.set('pronto');
    } catch (error) {
      console.error('Pedro Flash: não foi possível abrir a fase para editar.', error);
      this.status.set('erro');
    }
  }
}
