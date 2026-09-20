import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';

import {
  BRUSH_SIZES,
  DRAWING_COLORS,
  DRAWING_HEIGHT,
  DRAWING_STAMPS,
  DRAWING_WIDTH,
  ERASER_SIZE_MULTIPLIER,
  PAPER_COLOR,
} from '../../../core/data/drawing.data';
import type {
  BrushMark,
  DrawingMark,
  DrawingPoint,
  DrawingTool,
} from '../../../core/models/drawing.model';
import {
  isFarEnough,
  paintDot,
  paintMark,
  paintMarks,
  paintSegment,
  toPaperPoint,
} from '../drawing.logic';

/** Guarda o rascunho no aparelho para um recarregamento não apagar tudo. */
const DRAFT_STORAGE_KEY = 'pedro-henrique:drawing-draft:v1';

/** Espera antes de gravar o rascunho, para não escrever a cada traço. */
const DRAFT_SAVE_DELAY_IN_MS = 900;

/** Passos de histórico guardados. Acima disso, o mais antigo sai. */
const MAX_HISTORY_STEPS = 60;

/** Tempo que o botão de limpar fica pedindo confirmação. */
const CONFIRM_TIMEOUT_IN_MS = 4000;

/** Tamanho do carimbo em relação à espessura escolhida. */
const STAMP_SIZE_MULTIPLIER = 4;

/**
 * Prancheta de desenho.
 *
 * O desenho vive como uma lista de marcas, e o histórico guarda a lista
 * inteira a cada passo — são só referências, então desfazer, refazer e até
 * limpar a folha custam quase nada e funcionam do mesmo jeito.
 *
 * A folha tem resolução fixa e é exibida esticada por CSS: o traço sai igual
 * no celular e no monitor, e o PNG salvo tem sempre o mesmo tamanho.
 */
@Component({
  selector: 'app-drawing-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drawing-board.html',
  styleUrl: './drawing-board.scss',
})
export class DrawingBoard {
  /** Entrega a imagem pronta para quem sabe guardá-la. */
  readonly saved = output<{ readonly blob: Blob; readonly title: string }>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private context: CanvasRenderingContext2D | null = null;

  private currentStroke: BrushMark | null = null;
  private lastPoint: DrawingPoint | null = null;
  private draftTimeout: ReturnType<typeof setTimeout> | null = null;
  private confirmTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly paperWidth = DRAWING_WIDTH;
  protected readonly paperHeight = DRAWING_HEIGHT;
  protected readonly colors = DRAWING_COLORS;
  protected readonly sizes = BRUSH_SIZES;
  protected readonly stamps = DRAWING_STAMPS;

  protected readonly tool = signal<DrawingTool>('pincel');
  protected readonly color = signal(DRAWING_COLORS[0].value);
  protected readonly brushSize = signal(BRUSH_SIZES[1].value);
  protected readonly stamp = signal(DRAWING_STAMPS[0]);
  protected readonly title = signal('');
  protected readonly isSaving = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly isConfirmingClear = signal(false);

  /** Histórico completo; a posição atual diz o que está na folha. */
  private readonly history = signal<readonly (readonly DrawingMark[])[]>([[]]);
  private readonly historyIndex = signal(0);

  protected readonly marks = computed(() => this.history()[this.historyIndex()] ?? []);
  protected readonly canUndo = computed(() => this.historyIndex() > 0);
  protected readonly canRedo = computed(() => this.historyIndex() < this.history().length - 1);
  protected readonly isEmpty = computed(() => this.marks().length === 0);

  /** Espessura aplicada: a borracha é sempre mais larga que o pincel. */
  protected readonly activeSize = computed(() =>
    this.tool() === 'borracha'
      ? Math.round(this.brushSize() * ERASER_SIZE_MULTIPLIER)
      : this.brushSize(),
  );

  constructor() {
    afterNextRender(() => this.setUpCanvas());

    inject(DestroyRef).onDestroy(() => {
      this.clearTimer('draft');
      this.clearTimer('confirm');
    });
  }

  /* Ferramentas ------------------------------------------------------------ */

  protected selectTool(tool: DrawingTool): void {
    this.tool.set(tool);
  }

  protected selectColor(value: string): void {
    this.color.set(value);
    this.tool.set('pincel');
  }

  protected selectStamp(emoji: string): void {
    this.stamp.set(emoji);
    this.tool.set('carimbo');
  }

  protected isColorActive(value: string): boolean {
    return this.tool() === 'pincel' && this.color() === value;
  }

  /* Desenho ---------------------------------------------------------------- */

  protected startStroke(event: PointerEvent): void {
    const context = this.context;
    if (!context) {
      return;
    }

    // A captura garante que o traço continue mesmo se o dedo sair da folha.
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

    const point = this.toPaper(event);

    if (this.tool() === 'carimbo') {
      this.commit({
        kind: 'carimbo',
        emoji: this.stamp(),
        size: this.brushSize() * STAMP_SIZE_MULTIPLIER,
        point,
      });
      return;
    }

    const color = this.tool() === 'borracha' ? PAPER_COLOR : this.color();

    this.currentStroke = { kind: 'traco', color, size: this.activeSize(), points: [point] };
    this.lastPoint = point;

    paintDot(context, point, color, this.activeSize());
  }

  protected continueStroke(event: PointerEvent): void {
    const context = this.context;
    const stroke = this.currentStroke;
    const previous = this.lastPoint;

    if (!context || !stroke || !previous) {
      return;
    }

    const point = this.toPaper(event);

    if (!isFarEnough(previous, point)) {
      return;
    }

    paintSegment(context, previous, point, stroke.color, stroke.size);

    this.currentStroke = { ...stroke, points: [...stroke.points, point] };
    this.lastPoint = point;
  }

  protected endStroke(): void {
    const stroke = this.currentStroke;

    this.currentStroke = null;
    this.lastPoint = null;

    if (stroke) {
      // A folha já mostra o traço: só o histórico precisa ser atualizado.
      this.pushHistory([...this.marks(), stroke]);
    }
  }

  /* Histórico -------------------------------------------------------------- */

  protected undo(): void {
    if (!this.canUndo()) {
      return;
    }

    this.historyIndex.update((index) => index - 1);
    this.repaint();
    this.announce('Traço desfeito.');
  }

  protected redo(): void {
    if (!this.canRedo()) {
      return;
    }

    this.historyIndex.update((index) => index + 1);
    this.repaint();
    this.announce('Traço refeito.');
  }

  /**
   * Limpar pede confirmação e continua sendo desfazível.
   *
   * São duas redes de proteção de propósito: apagar por engano um desenho que
   * levou meia hora seria o pior erro possível desta tela.
   */
  protected clear(): void {
    if (this.isEmpty()) {
      return;
    }

    if (!this.isConfirmingClear()) {
      this.isConfirmingClear.set(true);
      this.confirmTimeout = setTimeout(() => this.isConfirmingClear.set(false), CONFIRM_TIMEOUT_IN_MS);
      return;
    }

    this.clearTimer('confirm');
    this.isConfirmingClear.set(false);
    this.pushHistory([]);
    this.repaint();
    this.announce('Folha limpa. Dá para desfazer.');
  }

  /* Guardar ---------------------------------------------------------------- */

  protected async save(): Promise<void> {
    if (this.isEmpty() || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    try {
      const blob = await toPngBlob(this.canvas().nativeElement);

      if (!blob) {
        this.announce('Não deu para guardar o desenho. Tente de novo.');
        return;
      }

      this.saved.emit({ blob, title: this.title() });
      this.title.set('');
      this.announce('Desenho guardado na sua pasta!');
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Baixa a folha como PNG, para imprimir ou mandar para alguém. */
  protected async download(): Promise<void> {
    if (this.isEmpty()) {
      return;
    }

    const blob = await toPngBlob(this.canvas().nativeElement);

    if (!blob) {
      this.announce('Não deu para preparar o arquivo. Tente de novo.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${sanitizeFileName(this.title())}.png`;
    link.click();

    URL.revokeObjectURL(url);
    this.announce('Arquivo baixado.');
  }

  private announce(message: string): void {
    this.statusMessage.set(message);
  }

  /* Interno ---------------------------------------------------------------- */

  private setUpCanvas(): void {
    const element = this.canvas().nativeElement;

    element.width = DRAWING_WIDTH;
    element.height = DRAWING_HEIGHT;

    this.context = element.getContext('2d');

    const restored = readDraft();

    if (restored.length > 0) {
      this.history.set([[], restored]);
      this.historyIndex.set(1);
      this.announce('Seu desenho anterior voltou.');
    }

    this.repaint();
  }

  private toPaper(event: PointerEvent): DrawingPoint {
    const bounds = this.canvas().nativeElement.getBoundingClientRect();

    return toPaperPoint(event.clientX, event.clientY, bounds, DRAWING_WIDTH, DRAWING_HEIGHT);
  }

  /** Grava um passo novo e descarta o que havia sido desfeito. */
  private pushHistory(marks: readonly DrawingMark[]): void {
    const kept = this.history().slice(0, this.historyIndex() + 1);
    const withStep = [...kept, marks].slice(-MAX_HISTORY_STEPS);

    this.history.set(withStep);
    this.historyIndex.set(withStep.length - 1);
    this.scheduleDraftSave();
  }

  private commit(mark: DrawingMark): void {
    const context = this.context;

    if (!context) {
      return;
    }

    paintMark(context, mark);
    this.pushHistory([...this.marks(), mark]);
  }

  private repaint(): void {
    const context = this.context;

    if (context) {
      paintMarks(context, this.marks(), DRAWING_WIDTH, DRAWING_HEIGHT);
    }

    this.scheduleDraftSave();
  }

  private scheduleDraftSave(): void {
    this.clearTimer('draft');
    this.draftTimeout = setTimeout(() => writeDraft(this.marks()), DRAFT_SAVE_DELAY_IN_MS);
  }

  private clearTimer(which: 'draft' | 'confirm'): void {
    const handle = which === 'draft' ? this.draftTimeout : this.confirmTimeout;

    if (handle !== null) {
      clearTimeout(handle);
    }

    if (which === 'draft') {
      this.draftTimeout = null;
      return;
    }

    this.confirmTimeout = null;
  }
}

/** Nome de arquivo seguro a partir do que a criança escreveu. */
function sanitizeFileName(title: string): string {
  const cleaned = title
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'desenho';
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function readDraft(): readonly DrawingMark[] {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    return Array.isArray(parsed) ? (parsed as DrawingMark[]) : [];
  } catch {
    // Rascunho corrompido ou storage bloqueado: começamos com a folha limpa.
    return [];
  }
}

function writeDraft(marks: readonly DrawingMark[]): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(marks));
  } catch {
    // Sem espaço ou em modo privado: o desenho segue valendo na sessão atual.
  }
}
