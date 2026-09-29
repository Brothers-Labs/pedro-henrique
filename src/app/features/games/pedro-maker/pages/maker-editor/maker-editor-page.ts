import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { createId } from '../../../../../core/utils/format';
import { paintObjectIcon } from '../../art/texture-catalog';
import { MakerAchievementToast } from '../../components/maker-achievement-toast/maker-achievement-toast';
import { MakerGameHost } from '../../components/maker-game-host/maker-game-host';
import {
  EDITOR_CATEGORIES,
  EDITOR_PIECES,
  EDITOR_THEMES,
  type EditorCategoryId,
  type EditorPiece,
  THEME_LABELS,
} from '../../config/object-catalog';
import { DIFFICULTY_ORDER } from '../../config/rules.config';
import { EditorCanvas, type CellPointerEvent, type EditorTool, type GridCell } from '../../editor/editor-canvas/editor-canvas';
import {
  changeTheme,
  commit,
  createHistory,
  createStarterLevel,
  type EditorHistory,
  type EditorLevel,
  moveObject,
  objectAt,
  placeObject,
  redo,
  removeObjectAt,
  renameLevel,
  resizeLevel,
  undo,
} from '../../editor/editor-state';
import { generateLevel } from '../../levels/level-generator';
import { analyzeReachability } from '../../levels/level-reachability';
import { findStructuralProblems } from '../../levels/level-validation';
import { WORLD_ENEMIES } from '../../levels/worlds.data';
import type { LevelBlueprint } from '../../models/level.model';
import type { LevelRunResult } from '../../models/progress.model';
import { starsFor } from '../../progress/maker-progression';
import { CustomLevelService } from '../../services/custom-level.service';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';
import { MakerSettingsService } from '../../services/maker-settings.service';

type EditorMode = 'editar' | 'testar' | 'resultado';

interface ToolOption {
  readonly id: EditorTool;
  readonly label: string;
  readonly emoji: string;
}

const TOOLS: readonly ToolOption[] = [
  { id: 'selecionar', label: 'Selecionar', emoji: '🖱️' },
  { id: 'mover', label: 'Mover', emoji: '✋' },
  { id: 'pincel', label: 'Bloco', emoji: '🧱' },
  { id: 'apagar', label: 'Apagar', emoji: '🗑️' },
];

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5] as const;
const WIDTH_STEP = 10;
const NOTICE_MS = 2400;

/** Ícone de cada peça da paleta, pintado uma vez por tema. */
interface PaletteEntry {
  readonly piece: EditorPiece;
  readonly icon: string;
}

/**
 * Criar minha fase.
 *
 * A página cuida das regras de edição e do histórico; a grade só diz onde o
 * dedo tocou. Peças vão para a grade tocando nela com a ferramenta Bloco ou
 * arrastando direto da paleta — os dois caminhos funcionam no toque.
 *
 * "Testar" abre o motor com exatamente o que está na tela, sem salvar nada;
 * "Salvar" guarda a fase no aparelho, em "Minhas fases".
 */
@Component({
  selector: 'app-maker-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EditorCanvas, MakerGameHost, MakerAchievementToast],
  templateUrl: './maker-editor-page.html',
  styleUrl: './maker-editor-page.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class MakerEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly customLevels = inject(CustomLevelService);
  private readonly progress = inject(MakerProgressService);
  private readonly settings = inject(MakerSettingsService);
  private readonly audio = inject(MakerAudioService);
  private readonly canvas = viewChild(EditorCanvas);

  private dragFrom: GridCell | null = null;
  private paletteDrag: { readonly piece: EditorPiece; hasMoved: boolean } | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly tools = TOOLS;
  protected readonly categories = EDITOR_CATEGORIES;
  protected readonly themes = EDITOR_THEMES.map((theme) => ({ id: theme, ...THEME_LABELS[theme] }));

  protected readonly history = signal<EditorHistory>(createHistory(this.newLevel()));
  /** Traço em andamento: só vira histórico quando o dedo sai da tela. */
  private readonly working = signal<EditorLevel | null>(null);
  protected readonly level = computed(() => this.working() ?? this.history().present);

  protected readonly mode = signal<EditorMode>('editar');
  protected readonly tool = signal<EditorTool>('pincel');
  protected readonly category = signal<EditorCategoryId>('terreno');
  protected readonly piece = signal<EditorPiece>(EDITOR_PIECES[0]);
  protected readonly zoomIndex = signal(2);
  protected readonly zoom = computed(() => ZOOM_STEPS[this.zoomIndex()] ?? 1);
  protected readonly selected = signal<GridCell | null>(null);
  protected readonly ghost = signal<GridCell | null>(null);
  protected readonly currentId = signal<string | null>(null);
  protected readonly isDirty = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly problems = signal<readonly string[]>([]);
  protected readonly testResult = signal<LevelRunResult | null>(null);
  protected readonly testBlueprint = signal<LevelBlueprint | null>(null);

  protected readonly canUndo = computed(() => this.history().past.length > 0);
  protected readonly canRedo = computed(() => this.history().future.length > 0);

  protected readonly palette = computed<readonly PaletteEntry[]>(() => {
    const theme = this.level().theme;

    return EDITOR_PIECES.filter((piece) => piece.category === this.category()).map((piece) => ({
      piece,
      icon: paintObjectIcon(piece, theme).toDataURL(),
    }));
  });

  protected readonly selectedObject = computed(() => {
    const cell = this.selected();

    return cell ? (objectAt(this.level(), cell.x, cell.y) ?? null) : null;
  });

  protected readonly selectedLabel = computed(() => {
    const object = this.selectedObject();

    return object ? (EDITOR_PIECES.find((piece) => piece.type === object.type)?.label ?? object.type) : '';
  });

  protected readonly testStars = computed(() => {
    const result = this.testResult();

    return result ? starsFor(result, result.crystalsFound) : 0;
  });

  constructor() {
    const customId = this.route.snapshot.paramMap.get('customId');

    if (customId) {
      void this.loadExisting(customId);
    }

    inject(DestroyRef).onDestroy(() => {
      if (this.noticeTimer !== null) {
        clearTimeout(this.noticeTimer);
      }
    });
  }

  /* Paleta e ferramentas --------------------------------------------------------------- */

  protected chooseCategory(id: EditorCategoryId): void {
    this.category.set(id);
    const first = EDITOR_PIECES.find((piece) => piece.category === id);

    if (first) {
      this.piece.set(first);
    }

    this.tool.set('pincel');
  }

  protected choosePiece(piece: EditorPiece): void {
    this.piece.set(piece);
    this.tool.set('pincel');
    this.audio.play('button');
  }

  protected chooseTool(tool: EditorTool): void {
    this.tool.set(tool);
    this.selected.set(null);
  }

  /** Arrastar da paleta: o toque começa na peça e termina na grade. */
  protected startPaletteDrag(event: PointerEvent, piece: EditorPiece): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.paletteDrag = { piece, hasMoved: false };
  }

  protected movePaletteDrag(event: PointerEvent): void {
    if (!this.paletteDrag) {
      return;
    }

    this.paletteDrag.hasMoved = true;
    this.ghost.set(this.canvas()?.cellAt(event.clientX, event.clientY) ?? null);
  }

  protected endPaletteDrag(event: PointerEvent): void {
    const drag = this.paletteDrag;
    this.paletteDrag = null;
    this.ghost.set(null);

    if (!drag) {
      return;
    }

    this.choosePiece(drag.piece);

    const cell = drag.hasMoved ? this.canvas()?.cellAt(event.clientX, event.clientY) : null;

    if (cell) {
      this.apply(placeObject(this.level(), drag.piece.type, cell.x, cell.y, createId('peca'), drag.piece.properties));
    }
  }

  /* Grade ------------------------------------------------------------------------------ */

  protected onCellPointer({ phase, cell }: CellPointerEvent): void {
    switch (this.tool()) {
      case 'pincel':
      case 'apagar':
        this.paint(phase, cell);
        return;
      case 'selecionar':
        this.select(phase, cell);
        return;
      case 'mover':
        return;
    }
  }

  private paint(phase: CellPointerEvent['phase'], cell: GridCell): void {
    const base = this.working() ?? this.history().present;
    const piece = this.piece();
    const next =
      this.tool() === 'apagar'
        ? removeObjectAt(base, cell.x, cell.y)
        : placeObject(base, piece.type, cell.x, cell.y, createId('peca'), piece.properties);

    this.working.set(next);

    if (phase === 'up') {
      this.working.set(null);
      this.apply(next);
    }
  }

  private select(phase: CellPointerEvent['phase'], cell: GridCell): void {
    if (phase === 'down') {
      const hasObject = objectAt(this.level(), cell.x, cell.y) !== undefined;
      this.selected.set(hasObject ? cell : null);
      this.dragFrom = hasObject ? cell : null;
      return;
    }

    if (phase === 'move' && this.dragFrom) {
      this.ghost.set(cell);
      return;
    }

    if (phase === 'up' && this.dragFrom) {
      const from = this.dragFrom;
      this.dragFrom = null;
      this.ghost.set(null);

      if (from.x !== cell.x || from.y !== cell.y) {
        this.apply(moveObject(this.level(), from.x, from.y, cell.x, cell.y));
        this.selected.set(cell);
      }
    }
  }

  protected removeSelected(): void {
    const cell = this.selected();

    if (cell) {
      this.apply(removeObjectAt(this.level(), cell.x, cell.y));
      this.selected.set(null);
    }
  }

  /* Histórico, tamanho e aparência ------------------------------------------------------- */

  protected undo(): void {
    this.history.update(undo);
    this.markDirty();
  }

  protected redo(): void {
    this.history.update(redo);
    this.markDirty();
  }

  protected changeZoom(step: number): void {
    this.zoomIndex.update((index) => Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + step)));
  }

  protected changeWidth(direction: number): void {
    const level = this.level();
    this.apply(resizeLevel(level, level.width + direction * WIDTH_STEP));
  }

  protected rename(event: Event): void {
    this.apply(renameLevel(this.level(), (event.target as HTMLInputElement).value));
  }

  protected changeTheme(event: Event): void {
    const theme = EDITOR_THEMES.find((candidate) => candidate === (event.target as HTMLSelectElement).value);

    if (theme) {
      this.apply(changeTheme(this.level(), theme));
    }
  }

  /** Fase surpresa: o gerador monta uma fase completável do tamanho e tema atuais. */
  protected surprise(): void {
    const level = this.level();
    const difficulty = DIFFICULTY_ORDER.indexOf(this.settings.settings().difficulty) + 1;
    const generated = generateLevel({
      id: 'surpresa',
      name: 'Fase surpresa',
      seed: Date.now(),
      theme: level.theme,
      difficulty,
      width: Math.max(80, level.width),
      enemies: WORLD_ENEMIES[1],
    });

    this.apply({ ...level, width: generated.width, height: generated.height, objects: generated.objects });
    this.showNotice('🎲 Fase surpresa criada! Teste para ver como ficou.');
    this.audio.play('powerup');
  }

  /* Testar e salvar ---------------------------------------------------------------------- */

  protected test(): void {
    const blueprint = this.toBlueprint();
    const problems = findStructuralProblems(blueprint);

    this.problems.set(problems);

    if (problems.length > 0) {
      return;
    }

    if (!analyzeReachability(blueprint).isPortalReachable) {
      this.showNotice('Dica: parece difícil chegar até o portal. Teste para conferir!');
    }

    this.testResult.set(null);
    this.testBlueprint.set(blueprint);
    this.mode.set('testar');
  }

  protected onTestCompleted(result: LevelRunResult): void {
    this.testResult.set(result);
    this.mode.set('resultado');
  }

  protected backToEditor(): void {
    this.mode.set('editar');
    this.testBlueprint.set(null);
  }

  protected async save(): Promise<void> {
    const level = this.level();
    const problems = findStructuralProblems(this.toBlueprint());

    this.problems.set(problems);

    if (problems.length > 0 || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    try {
      const isNew = this.currentId() === null;
      const saved = await this.customLevels.save({ id: this.currentId(), ...level });
      const result = this.testResult();

      if (result) {
        await this.customLevels.recordCompletion(saved.id, this.testStars());
      }

      if (isNew) {
        this.progress.registerCustomLevelSaved();
      }

      this.currentId.set(saved.id);
      this.isDirty.set(false);
      this.mode.set('editar');
      this.location.replaceState(`/jogos/pedro-maker/criar/${saved.id}`);
      this.showNotice('💾 Fase salva em "Minhas fases"!');
      this.audio.play('checkpoint');
    } catch (error) {
      console.error('Pedro Maker: não foi possível salvar a fase.', error);
      this.showNotice('Não foi possível salvar agora. Tente de novo.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected exit(): void {
    if (this.isDirty() && !confirm('Sair sem salvar? As mudanças desta fase vão se perder.')) {
      return;
    }

    void this.router.navigate(['/jogos/pedro-maker/minhas-fases']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;

    if (this.mode() !== 'editar' || target?.closest('input, select, textarea')) {
      return;
    }

    const isShortcut = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (isShortcut && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    } else if (isShortcut && (key === 'y' || (key === 'z' && event.shiftKey))) {
      event.preventDefault();
      this.redo();
    }
  }

  /* Auxiliares --------------------------------------------------------------------------- */

  private apply(next: EditorLevel): void {
    const before = this.history();
    const after = commit(before, next);

    if (after !== before) {
      this.history.set(after);
      this.markDirty();
    }
  }

  private markDirty(): void {
    this.isDirty.set(true);
    // Mudou a fase, o teste anterior deixa de valer para o "concluída".
    this.testResult.set(null);
  }

  private toBlueprint(): LevelBlueprint {
    const level = this.level();

    return {
      id: this.currentId() ?? 'rascunho',
      name: level.name.trim() || 'Minha fase',
      theme: level.theme,
      width: level.width,
      height: level.height,
      objects: level.objects,
      targetTimeSeconds: Math.round(level.width * 0.6),
    };
  }

  private newLevel(): EditorLevel {
    return createStarterLevel('Minha fase', 'vale', () => createId('peca'));
  }

  private async loadExisting(id: string): Promise<void> {
    try {
      const level = await this.customLevels.find(id);

      if (!level) {
        this.showNotice('Essa fase não foi encontrada. Começamos uma nova!');
        this.location.replaceState('/jogos/pedro-maker/criar');
        return;
      }

      this.history.set(createHistory({ name: level.name, theme: level.theme, width: level.width, height: level.height, objects: level.objects }));
      this.currentId.set(level.id);
      this.isDirty.set(false);
    } catch (error) {
      console.error('Pedro Maker: não foi possível abrir a fase para editar.', error);
      this.showNotice('Não foi possível abrir essa fase agora.');
    }
  }

  private showNotice(text: string): void {
    if (this.noticeTimer !== null) {
      clearTimeout(this.noticeTimer);
    }

    this.notice.set(text);
    this.noticeTimer = setTimeout(() => {
      this.notice.set(null);
      this.noticeTimer = null;
    }, NOTICE_MS);
  }
}
