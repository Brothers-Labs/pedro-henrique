import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { PedrerePageFrame } from '../../components/pedrere-page-frame/pedrere-page-frame';
import { paintEditorLevel } from '../../engine/editor-painter';
import { THEME_LABELS } from '../../engine/world-painter';
import { createBlankRows, LEVEL_SIZES, type LevelSize, paintTile, resizeRows } from '../../levels/level-editor';
import { LEVEL_HEIGHT, type LevelTheme, TILE, type TileChar } from '../../models/level.model';
import {
  DEFAULT_LEVEL_NAME,
  MAX_LEVEL_NAME_LENGTH,
  PedrereLevelsService,
} from '../../services/pedrere-levels.service';

interface EditorTool {
  readonly tile: TileChar;
  readonly label: string;
  readonly emoji: string;
}

/** A paleta na ordem em que a criança costuma montar: chão, obstáculos, prêmios e marcos. */
const TOOLS: readonly EditorTool[] = [
  { tile: TILE.ground, label: 'Chão', emoji: '🟫' },
  { tile: TILE.brick, label: 'Tijolo', emoji: '🧱' },
  { tile: TILE.trampoline, label: 'Pula-pula', emoji: '🤸' },
  { tile: TILE.coin, label: 'Moeda', emoji: '🪙' },
  { tile: TILE.spike, label: 'Espinho', emoji: '🔺' },
  { tile: TILE.pebble, label: 'Pedrinha brava', emoji: '🪨' },
  { tile: TILE.checkpoint, label: 'Marco', emoji: '🚩' },
  { tile: TILE.start, label: 'Início', emoji: '🙂' },
  { tile: TILE.goal, label: 'Chegada', emoji: '🏁' },
  { tile: TILE.empty, label: 'Borracha', emoji: '🧽' },
];

const THEMES: readonly LevelTheme[] = ['campo', 'praia', 'noite', 'neve'];

/** Tamanho de cada bloco na tela do editor, em pixels: grande o bastante para um dedo. */
const CELL_SIZE = 36;
const DEFAULT_SIZE: LevelSize = LEVEL_SIZES[0];

/**
 * Modo maker: a criança monta a própria fase bloco por bloco.
 *
 * Um toque pinta um bloco; arrastar o dedo rola a fase, para o tablet não
 * pintar sem querer enquanto a criança só procura um lugar. Com o mouse,
 * arrastar pinta em sequência.
 */
@Component({
  selector: 'app-pedrere-maker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PedrerePageFrame],
  templateUrl: './pedrere-maker-page.html',
  styleUrl: './pedrere-maker-page.scss',
})
export class PedrereMakerPage {
  private readonly router = inject(Router);
  private readonly levelsService = inject(PedrereLevelsService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly routeLevelId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('levelId'))),
    { initialValue: null },
  );
  /** A fase sendo editada; nasce da rota e passa a existir no primeiro "salvar" de uma fase nova. */
  private readonly levelId = signal<string | null>(null);

  protected readonly tools = TOOLS;
  protected readonly themes = THEMES;
  protected readonly themeLabels = THEME_LABELS;
  protected readonly sizes = LEVEL_SIZES;
  protected readonly maxNameLength = MAX_LEVEL_NAME_LENGTH;
  protected readonly cellSize = CELL_SIZE;
  protected readonly levelHeight = LEVEL_HEIGHT;

  protected readonly rows = signal<readonly string[]>(createBlankRows(DEFAULT_SIZE.width));
  protected readonly name = signal(DEFAULT_LEVEL_NAME);
  protected readonly theme = signal<LevelTheme>('campo');
  protected readonly tool = signal<EditorTool>(TOOLS[0]);
  protected readonly messages = signal<readonly string[]>([]);
  protected readonly notice = signal<string | null>(null);
  protected readonly isMissingLevel = signal(false);
  protected readonly columns = computed(() => this.rows()[0]?.length ?? 0);
  protected readonly isEditing = computed(() => this.levelId() !== null);

  constructor() {
    effect(() => {
      const id = this.routeLevelId();

      untracked(() => this.load(id));
    });

    afterRenderEffect(() => this.paint(this.rows(), this.theme()));
  }

  protected chooseTool(tool: EditorTool): void {
    this.tool.set(tool);
  }

  protected chooseTheme(theme: LevelTheme): void {
    this.theme.set(theme);
  }

  protected chooseSize(size: LevelSize): void {
    this.rows.update((rows) => resizeRows(rows, size.width));
  }

  protected rename(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.name.set(target.value);
    }
  }

  /**
   * Com o mouse, pinta assim que o botão desce e continua pintando no arraste.
   * No toque, quem pinta é o `click`, que o navegador só dispara num toque
   * rápido — começar a rolar a fase nunca pinta nada.
   */
  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.paintAt(event);
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.buttons === 1) {
      this.paintAt(event);
    }
  }

  protected onTap(event: MouseEvent): void {
    this.paintAt(event);
  }

  protected save(): void {
    if (this.saveLevel()) {
      this.notice.set('Fase salva! Ela já aparece em Aventuras, em "Minhas fases".');
    }
  }

  protected saveAndPlay(): void {
    const levelId = this.saveLevel();

    if (levelId) {
      void this.router.navigate(['/jogos/pedro-pedrere/aventuras', levelId]);
    }
  }

  protected startOver(): void {
    if (!confirm('Começar uma fase nova? O que não foi salvo nesta vai se perder.')) {
      return;
    }

    this.reset();

    if (this.routeLevelId() !== null) {
      void this.router.navigate(['/jogos/pedro-pedrere/maker']);
    }
  }

  private saveLevel(): string | null {
    const outcome = this.levelsService.save(
      { name: this.name(), theme: this.theme(), rows: this.rows() },
      this.levelId() ?? undefined,
    );

    if (!outcome.isSaved) {
      this.notice.set(null);
      this.messages.set(outcome.messages);

      return null;
    }

    this.messages.set([]);
    this.name.set(outcome.level.name);
    this.levelId.set(outcome.level.id);

    return outcome.level.id;
  }

  private load(levelId: string | null): void {
    if (levelId === null) {
      return;
    }

    const level = this.levelsService.find(levelId);

    this.isMissingLevel.set(level === null);

    if (!level) {
      return;
    }

    this.levelId.set(level.id);
    this.rows.set(level.rows);
    this.name.set(level.name);
    this.theme.set(level.theme);
    this.messages.set([]);
    this.notice.set(null);
  }

  private reset(): void {
    this.levelId.set(null);
    this.isMissingLevel.set(false);
    this.rows.set(createBlankRows(DEFAULT_SIZE.width));
    this.name.set(DEFAULT_LEVEL_NAME);
    this.theme.set('campo');
    this.messages.set([]);
    this.notice.set(null);
  }

  private paintAt(event: MouseEvent): void {
    const canvas = this.canvas().nativeElement;
    const bounds = canvas.getBoundingClientRect();
    const column = Math.floor(((event.clientX - bounds.left) / bounds.width) * this.columns());
    const row = Math.floor(((event.clientY - bounds.top) / bounds.height) * LEVEL_HEIGHT);
    const tile = this.tool().tile;

    this.notice.set(null);
    this.rows.update((rows) => paintTile(rows, column, row, tile));
  }

  private paint(rows: readonly string[], theme: LevelTheme): void {
    const canvas = this.canvas().nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = (rows[0]?.length ?? 0) * CELL_SIZE;
    const height = rows.length * CELL_SIZE;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintEditorLevel(context, rows, theme, CELL_SIZE);
  }
}
