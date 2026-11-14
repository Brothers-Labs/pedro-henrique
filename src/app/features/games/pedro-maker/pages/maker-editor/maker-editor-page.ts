import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { createId } from '../../../../../core/utils/format';
import { paintObjectIcon, SHARP_ICON_SCALE } from '../../art/texture-catalog';
import { MakerAchievementToast } from '../../components/maker-achievement-toast/maker-achievement-toast';
import { MakerGameHost } from '../../components/maker-game-host/maker-game-host';
import {
  DOOR_PAIRS,
  doorPairColor,
  EDITOR_CATEGORIES,
  EDITOR_PIECES,
  EDITOR_POWER_UPS,
  EDITOR_THEMES,
  type EditorCategoryId,
  type EditorPiece,
  findEditorPiece,
  POWER_UP_LABELS,
  THEME_LABELS,
} from '../../config/object-catalog';
import { DIFFICULTY_ORDER } from '../../config/rules.config';
import {
  type CellPointerEvent,
  EditorCanvas,
  type EditorTool,
  type GridArea,
  type GridViewport,
  MAX_EDITOR_ZOOM,
  MIN_EDITOR_ZOOM,
} from '../../editor/editor-canvas/editor-canvas';
import { clearEditorDraft, loadEditorDraft, saveEditorDraft } from '../../editor/editor-draft';
import { EditorMinimap } from '../../editor/editor-minimap/editor-minimap';
import {
  cellsInRect,
  cellsOnLine,
  changeTheme,
  commit,
  createHistory,
  createStarterLevel,
  type EditorHistory,
  type EditorLevel,
  type GridCell,
  moveObject,
  objectAt,
  placeMany,
  redo,
  removeMany,
  removeObjectAt,
  renameLevel,
  resizeLevel,
  undo,
  updatePropertiesAt,
} from '../../editor/editor-state';
import { generateLevel } from '../../levels/level-generator';
import { analyzeReachability } from '../../levels/level-reachability';
import { findStructuralProblems } from '../../levels/level-validation';
import { WORLD_ENEMIES } from '../../levels/worlds.data';
import type { LevelBlueprint, LevelObjectProperties, PlatformAxis, PowerUpKind, SurpriseContent } from '../../models/level.model';
import type { LevelRunResult } from '../../models/progress.model';
import { starsFor } from '../../progress/maker-progression';
import { CustomLevelService } from '../../services/custom-level.service';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';
import { MakerSettingsService } from '../../services/maker-settings.service';
import { LevelSyncService } from '../../sync/level-sync.service';

type EditorMode = 'editar' | 'testar' | 'resultado';

interface ToolOption {
  readonly id: EditorTool;
  readonly label: string;
  readonly emoji: string;
}

const TOOLS: readonly ToolOption[] = [
  { id: 'pincel', label: 'Pincel', emoji: '🖌️' },
  { id: 'retangulo', label: 'Retângulo', emoji: '⬛' },
  { id: 'apagar', label: 'Apagar', emoji: '🧽' },
  { id: 'selecionar', label: 'Selecionar', emoji: '👆' },
  { id: 'conta-gotas', label: 'Copiar peça', emoji: '💧' },
  { id: 'mover', label: 'Mover', emoji: '✋' },
];

const SURPRISE_OPTIONS: readonly { readonly id: SurpriseContent; readonly label: string }[] = [
  { id: 'coins', label: '🪙 Moedas' },
  { id: 'heart', label: '❤️ Coração' },
  { id: 'crystal', label: '💎 Cristal' },
  { id: 'power-up', label: '⚡ Poder' },
  { id: 'lucky', label: '🍀 Sorte (Lucky Block)' },
];

const POWER_UP_OPTIONS = (Object.keys(POWER_UP_LABELS) as PowerUpKind[]).map((id) => ({ id, ...POWER_UP_LABELS[id] }));
const EDITOR_POWER_UP_OPTIONS = POWER_UP_OPTIONS.filter((option) => EDITOR_POWER_UPS.includes(option.id));

/** No Testar, dois corações a mais: dá para conferir a fase toda sem recomeçar a cada tropeço. */
const TEST_BONUS_HEARTS = 2;
const RANGE_LIMITS = { min: 1, max: 12 } as const;

const ZOOM_STEP = 0.25;
const WIDTH_STEP = 10;
const NOTICE_MS = 2400;
const DRAFT_DELAY_MS = 600;
const PLACE_VIBRATION_MS = 8;

/** Ícone de cada peça da paleta, pintado uma vez por tema. */
interface PaletteEntry {
  readonly piece: EditorPiece;
  readonly icon: string;
}

/**
 * Criar minha fase.
 *
 * A página cuida das regras de edição e do histórico; a grade só diz onde o
 * dedo tocou. No celular: um dedo pinta (traço contínuo, sem buracos), dois
 * dedos aproximam e rolam, o retângulo enche uma área de uma vez e o
 * conta-gotas copia a peça tocada. O mapinha leva a qualquer trecho da fase.
 *
 * "Testar" abre o motor com exatamente o que está na tela, sem salvar nada;
 * "Salvar" guarda a fase no aparelho, em "Minhas fases". Entre um e outro, o
 * rascunho automático protege o trabalho se a aba for fechada.
 */
@Component({
  selector: 'app-maker-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EditorCanvas, EditorMinimap, MakerGameHost, MakerAchievementToast],
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
  private lastPaintedCell: GridCell | null = null;
  private paletteDrag: { readonly piece: EditorPiece; hasMoved: boolean } | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private draftTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly tools = TOOLS;
  protected readonly categories = EDITOR_CATEGORIES;
  protected readonly themes = EDITOR_THEMES.map((theme) => ({ id: theme, ...THEME_LABELS[theme] }));
  protected readonly surpriseOptions = SURPRISE_OPTIONS;
  protected readonly doorPairColor = doorPairColor;
  protected readonly doorPairs = DOOR_PAIRS;
  protected readonly testBonusHearts = TEST_BONUS_HEARTS;
  protected readonly rangeLimits = RANGE_LIMITS;

  protected readonly history = signal<EditorHistory>(createHistory(this.newLevel()));
  /** Traço em andamento: só vira histórico quando o dedo sai da tela. */
  private readonly working = signal<EditorLevel | null>(null);
  protected readonly level = computed(() => this.working() ?? this.history().present);

  protected readonly mode = signal<EditorMode>('editar');
  protected readonly tool = signal<EditorTool>('pincel');
  protected readonly category = signal<EditorCategoryId>('terreno');
  protected readonly piece = signal<EditorPiece>(EDITOR_PIECES[0]);
  protected readonly zoom = signal(1);
  protected readonly selected = signal<GridCell | null>(null);
  protected readonly ghost = signal<GridCell | null>(null);
  protected readonly area = signal<GridArea | null>(null);
  protected readonly viewport = signal<GridViewport | null>(null);
  protected readonly currentId = signal<string | null>(null);
  protected readonly isDirty = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly problems = signal<readonly string[]>([]);
  protected readonly testResult = signal<LevelRunResult | null>(null);
  protected readonly testBlueprint = signal<LevelBlueprint | null>(null);

  protected readonly canUndo = computed(() => this.history().past.length > 0);
  protected readonly canRedo = computed(() => this.history().future.length > 0);
  protected readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  protected readonly palette = computed<readonly PaletteEntry[]>(() => {
    const theme = this.level().theme;

    return EDITOR_PIECES.filter((piece) => piece.category === this.category()).map((piece) => ({
      piece,
      icon: paintObjectIcon(piece, theme, SHARP_ICON_SCALE).toDataURL(),
    }));
  });

  protected readonly selectedObject = computed(() => {
    const cell = this.selected();

    return cell ? (objectAt(this.level(), cell.x, cell.y) ?? null) : null;
  });

  /** As outras fases do Pedro: qualquer uma pode virar a fase secreta de uma porta dourada. */
  protected readonly secretLevelChoices = computed(() => this.customLevels.levels().filter((level) => level.id !== this.currentId()));

  /** Porta de madeira ou dourada: as duas escolhem a qual porta levam. */
  protected readonly isSelectedDoor = computed(() => {
    const type = this.selectedObject()?.type;

    return type === 'door' || type === 'golden-door';
  });

  protected readonly selectedLabel = computed(() => {
    const object = this.selectedObject();

    return object ? (findEditorPiece(object)?.label ?? object.type) : '';
  });

  protected readonly testStars = computed(() => {
    const result = this.testResult();

    return result ? starsFor(result, result.crystalsFound) : 0;
  });

  constructor() {
    // Com a sincronização ligada, a fase salva aqui sobe para os outros aparelhos em seguida.
    inject(LevelSyncService);

    // A lista das fases alimenta a escolha da fase secreta da porta dourada.
    void this.customLevels.load().catch((error: unknown) =>
      console.error('Pedro Maker: não foi possível listar as fases para a porta dourada.', error),
    );

    const customId = this.route.snapshot.paramMap.get('customId');

    if (customId) {
      void this.loadExisting(customId);
    } else {
      this.restoreDraft(null);
    }

    // Cada mudança ainda não salva vai para o rascunho, com um fôlego para juntar edições seguidas.
    effect(() => {
      const level = this.history().present;
      const levelId = this.currentId();

      if (!this.isDirty()) {
        return;
      }

      untracked(() => this.scheduleDraft(levelId, level));
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.noticeTimer !== null) {
        clearTimeout(this.noticeTimer);
      }

      this.flushDraft();
    });
  }

  /* Paleta e ferramentas --------------------------------------------------------------- */

  protected chooseCategory(id: EditorCategoryId): void {
    this.category.set(id);
    const first = EDITOR_PIECES.find((piece) => piece.category === id);

    if (first) {
      this.piece.set(first);
    }

    this.useDrawingTool();
  }

  protected choosePiece(piece: EditorPiece): void {
    this.piece.set(piece);
    this.useDrawingTool();
    this.audio.play('button');
  }

  protected chooseTool(tool: EditorTool): void {
    this.tool.set(tool);
    this.area.set(null);

    if (tool !== 'selecionar') {
      this.selected.set(null);
    }
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
      this.apply(placeMany(this.level(), drag.piece.type, [cell], () => createId('peca'), drag.piece.properties));
      this.tick();
    }
  }

  /** O navegador assumiu o toque para rolar a paleta: nada é colocado e a sombra da peça some. */
  protected cancelPaletteDrag(): void {
    this.paletteDrag = null;
    this.ghost.set(null);
  }

  /* Grade ------------------------------------------------------------------------------ */

  protected onCellPointer({ phase, cell }: CellPointerEvent): void {
    switch (this.tool()) {
      case 'pincel':
      case 'apagar':
        this.paint(phase, cell);
        return;
      case 'retangulo':
        this.drawRectangle(phase, cell);
        return;
      case 'selecionar':
        this.select(phase, cell);
        return;
      case 'conta-gotas':
        this.pickPiece(phase, cell);
        return;
      case 'mover':
        return;
    }
  }

  protected onZoomRequest(zoom: number): void {
    this.zoom.set(zoom);
  }

  protected onViewportChange(viewport: GridViewport): void {
    this.viewport.set(viewport);
  }

  protected jumpToColumn(column: number): void {
    this.canvas()?.scrollToColumn(column);
  }

  /** Um dedo pintando: o caminho entre um aviso e outro é preenchido, sem buracos. */
  private paint(phase: CellPointerEvent['phase'], cell: GridCell): void {
    if (phase === 'cancel') {
      this.working.set(null);
      this.lastPaintedCell = null;
      return;
    }

    const base = this.working() ?? this.history().present;
    const from = phase === 'down' ? null : this.lastPaintedCell;
    const cells = from ? cellsOnLine(from, cell) : [cell];
    const piece = this.piece();
    const next =
      this.tool() === 'apagar'
        ? removeMany(base, cells)
        : placeMany(base, piece.type, cells, () => createId('peca'), piece.properties);

    if (phase === 'down') {
      this.tick();
    }

    this.working.set(next);
    this.lastPaintedCell = cell;

    if (phase === 'up') {
      this.working.set(null);
      this.lastPaintedCell = null;
      this.apply(next);
    }
  }

  /** Arrastar marca um retângulo; soltar enche com a peça escolhida. */
  private drawRectangle(phase: CellPointerEvent['phase'], cell: GridCell): void {
    const area = this.area();

    switch (phase) {
      case 'down':
        this.area.set({ from: cell, to: cell });
        return;
      case 'move':
        if (area) {
          this.area.set({ from: area.from, to: cell });
        }
        return;
      case 'up': {
        this.area.set(null);

        if (!area) {
          return;
        }

        const piece = this.piece();
        this.apply(placeMany(this.level(), piece.type, cellsInRect(area.from, cell), () => createId('peca'), piece.properties));
        this.tick();
        return;
      }
      case 'cancel':
        this.area.set(null);
        return;
    }
  }

  private select(phase: CellPointerEvent['phase'], cell: GridCell): void {
    if (phase === 'down') {
      const hasObject = objectAt(this.level(), cell.x, cell.y) !== undefined;
      this.selected.set(hasObject ? cell : null);
      this.dragFrom = hasObject ? cell : null;
      return;
    }

    if (phase === 'cancel') {
      this.dragFrom = null;
      this.ghost.set(null);
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

  /** Conta-gotas: a peça tocada vira a peça do pincel. */
  private pickPiece(phase: CellPointerEvent['phase'], cell: GridCell): void {
    if (phase !== 'up') {
      return;
    }

    const object = objectAt(this.level(), cell.x, cell.y);
    const piece = object ? findEditorPiece(object) : undefined;

    if (!piece) {
      this.showNotice('Toque numa peça da fase para copiar.');
      return;
    }

    this.category.set(piece.category);
    this.choosePiece(piece);
    this.showNotice(`💧 Peça copiada: ${piece.label}`);
  }

  protected removeSelected(): void {
    const cell = this.selected();

    if (cell) {
      this.apply(removeObjectAt(this.level(), cell.x, cell.y));
      this.selected.set(null);
    }
  }

  /* Propriedades da peça selecionada ----------------------------------------------------- */

  protected setSignText(event: Event): void {
    this.updateSelected({ text: (event.target as HTMLInputElement).value.slice(0, 80) });
  }

  protected setAxis(axis: PlatformAxis): void {
    this.updateSelected({ axis });
  }

  protected changeRange(direction: number): void {
    const current = this.selectedObject()?.properties?.range ?? 3;
    const range = Math.min(RANGE_LIMITS.max, Math.max(RANGE_LIMITS.min, current + direction));

    this.updateSelected({ range });
  }

  protected setContents(event: Event): void {
    const contents = SURPRISE_OPTIONS.find((option) => option.id === (event.target as HTMLSelectElement).value)?.id;

    if (contents) {
      // Só a surpresa de poder guarda qual é o poder.
      this.updateSelected({ contents, powerUp: contents === 'power-up' ? 'mushroom' : undefined });
    }
  }

  /**
   * Poderes da lista do inspetor: os do editor e, numa fase antiga, também o
   * poder que a peça já tem, para a lista não mentir sobre ela.
   */
  protected powerUpChoices(current: PowerUpKind | undefined): readonly (typeof POWER_UP_OPTIONS)[number][] {
    const legacy = POWER_UP_OPTIONS.find((option) => option.id === current && !EDITOR_POWER_UPS.includes(option.id));

    return legacy ? [legacy, ...EDITOR_POWER_UP_OPTIONS] : EDITOR_POWER_UP_OPTIONS;
  }

  protected setPowerUp(event: Event): void {
    const powerUp = POWER_UP_OPTIONS.find((option) => option.id === (event.target as HTMLSelectElement).value)?.id;

    if (powerUp) {
      this.updateSelected({ powerUp });
    }
  }

  protected setPair(pair: string): void {
    this.updateSelected({ pair });
  }

  protected setSecretLevel(event: Event): void {
    const secretLevel = (event.target as HTMLSelectElement).value;

    this.updateSelected({ secretLevel: secretLevel === '' ? undefined : secretLevel });
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

  protected changeZoom(direction: number): void {
    this.zoom.update((zoom) => Math.min(MAX_EDITOR_ZOOM, Math.max(MIN_EDITOR_ZOOM, Math.round((zoom + direction * ZOOM_STEP) * 4) / 4)));
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

      this.cancelDraft();
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

    this.cancelDraft();
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
    } else if ((key === 'delete' || key === 'backspace') && this.selected()) {
      event.preventDefault();
      this.removeSelected();
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

  private updateSelected(changes: LevelObjectProperties): void {
    const cell = this.selected();
    const object = this.selectedObject();

    if (!cell || !object) {
      return;
    }

    const merged: Record<string, unknown> = { ...object.properties, ...changes };
    // Propriedade marcada como `undefined` sai de vez, em vez de ficar guardada vazia.
    const properties = Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined)) as LevelObjectProperties;

    this.apply(updatePropertiesAt(this.level(), cell.x, cell.y, properties));
  }

  private useDrawingTool(): void {
    if (this.tool() !== 'pincel' && this.tool() !== 'retangulo') {
      this.chooseTool('pincel');
    }
  }

  private markDirty(): void {
    this.isDirty.set(true);
    // Mudou a fase, o teste anterior deixa de valer para o "concluída".
    this.testResult.set(null);
  }

  /** Vibração curtinha ao colocar peça: o dedo sente que pegou. */
  private tick(): void {
    if (this.settings.settings().vibration && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PLACE_VIBRATION_MS);
    }
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
      this.restoreDraft(level.id);
    } catch (error) {
      console.error('Pedro Maker: não foi possível abrir a fase para editar.', error);
      this.showNotice('Não foi possível abrir essa fase agora.');
    }
  }

  /** Volta ao rascunho que ficou sem salvar da última vez, se houver. */
  private restoreDraft(levelId: string | null): void {
    const draft = loadEditorDraft(levelId);

    if (!draft) {
      return;
    }

    this.history.set(commit(this.history(), draft.level));
    this.isDirty.set(true);
    this.showNotice('📝 Recuperamos as mudanças que não foram salvas.');
  }

  private scheduleDraft(levelId: string | null, level: EditorLevel): void {
    if (this.draftTimer !== null) {
      clearTimeout(this.draftTimer);
    }

    this.draftTimer = setTimeout(() => {
      this.draftTimer = null;
      saveEditorDraft({ levelId, level });
    }, DRAFT_DELAY_MS);
  }

  /** Grava na hora o que estava esperando: sair da página não pode perder a última mudança. */
  private flushDraft(): void {
    if (this.draftTimer === null) {
      return;
    }

    clearTimeout(this.draftTimer);
    this.draftTimer = null;

    if (this.isDirty()) {
      saveEditorDraft({ levelId: this.currentId(), level: this.history().present });
    }
  }

  private cancelDraft(): void {
    if (this.draftTimer !== null) {
      clearTimeout(this.draftTimer);
      this.draftTimer = null;
    }

    clearEditorDraft();
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
