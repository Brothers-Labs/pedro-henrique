import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { KartPageFrame } from '../../components/kart-page-frame/kart-page-frame';
import { TrackGrid, type CellPointerEvent } from '../../components/track-grid/track-grid';
import { TRACK_THEMES } from '../../config/theme.config';
import { TRACK_GRID, type TrackTheme } from '../../models/track.model';
import { KartTrackService } from '../../services/kart-track.service';
import {
  changeLaps,
  commitDraft,
  createEditorHistory,
  createEmptyDraft,
  extendPath,
  toggleMarker,
  undoDraft,
  type EditorHistory,
  type MarkerKind,
  type TrackDraft,
} from '../../tracks/track-editor';
import { findTrackProblems, TRACK_PROBLEM_MESSAGES } from '../../tracks/track-rules';

type EditorTool = 'pista' | MarkerKind;
type PageStatus = 'carregando' | 'pronto' | 'nao-encontrada' | 'erro';
type SaveState = 'parado' | 'salvando' | 'erro';

interface ToolOption {
  readonly id: EditorTool;
  readonly label: string;
  readonly emoji: string;
}

const TOOLS: readonly ToolOption[] = [
  { id: 'pista', label: 'Desenhar pista', emoji: '✏️' },
  { id: 'turbo', label: 'Turbo', emoji: '💨' },
  { id: 'caixa', label: 'Caixa surpresa', emoji: '🎁' },
];

/**
 * O Pedro Kart Maker: o editor de pistas.
 *
 * O Pedro arrasta o dedo pela grade e a pista vai nascendo atrás dele.
 * Quando o traço encosta de novo na largada, a volta fecha e dá para correr.
 * Um traço inteiro de dedo vira um único passo de desfazer.
 */
@Component({
  selector: 'app-kart-maker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KartPageFrame, TrackGrid],
  templateUrl: './kart-maker-page.html',
  styleUrl: './kart-maker-page.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class KartMakerPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tracks = inject(KartTrackService);
  private readonly trackId = toSignal(this.route.paramMap.pipe(map((params) => params.get('trackId'))), {
    initialValue: null,
  });

  private readonly history = signal<EditorHistory>(createEditorHistory(createEmptyDraft()));
  /** Começo do traço em andamento: ao soltar o dedo, o traço todo vira um passo só. */
  private strokeStart: TrackDraft | null = null;

  protected readonly tools = TOOLS;
  protected readonly themes = TRACK_THEMES;
  protected readonly grid = TRACK_GRID;
  protected readonly tool = signal<EditorTool>('pista');
  protected readonly status = signal<PageStatus>('carregando');
  protected readonly saveState = signal<SaveState>('parado');
  protected readonly draft = computed(() => this.history().present);
  protected readonly canUndo = computed(() => this.history().past.length > 0);
  protected readonly problems = computed(() => findTrackProblems(this.draft().path));
  protected readonly isRaceable = computed(() => this.problems().length === 0);
  protected readonly problemMessage = computed(() => {
    const first = this.problems()[0];

    return first ? TRACK_PROBLEM_MESSAGES[first] : null;
  });
  protected readonly isEditing = computed(() => this.trackId() !== null);

  constructor() {
    effect(() => {
      const id = this.trackId();

      untracked(() => void this.open(id));
    });
  }

  protected chooseTool(tool: EditorTool): void {
    this.tool.set(tool);
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

    // Turbo e caixa trocam com um toque; arrastar por cima não fica ligando e desligando.
    if (tool !== 'pista' && event.phase === 'arrasto') {
      return;
    }

    const next = tool === 'pista' ? extendPath(this.draft(), event.cell) : toggleMarker(this.draft(), event.cell, tool);

    this.replacePresent(next);
  }

  protected rename(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.commit({ ...this.draft(), name: target.value.slice(0, TRACK_GRID.maximumNameLength) });
    }
  }

  protected chooseTheme(theme: TrackTheme): void {
    this.commit({ ...this.draft(), theme });
  }

  protected changeLaps(delta: number): void {
    this.commit(changeLaps(this.draft(), delta));
  }

  protected undo(): void {
    this.history.update(undoDraft);
  }

  protected clear(): void {
    this.commit({ ...this.draft(), path: [], boostCells: [], itemCells: [] });
  }

  protected async save(thenRace: boolean): Promise<void> {
    if (!this.isRaceable() || this.saveState() === 'salvando') {
      return;
    }

    this.saveState.set('salvando');

    try {
      const saved = await this.tracks.save({ id: this.trackId(), ...this.draft() });

      this.saveState.set('parado');
      await this.router.navigate(thenRace ? ['/jogos/pedro-kart/corrida', saved.id] : ['/jogos/pedro-kart/pistas']);
    } catch (error) {
      console.error('Pedro Kart: não foi possível salvar a pista.', error);
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

  /** Durante o traço, a pista muda na tela sem empilhar um passo de desfazer por casa. */
  private replacePresent(next: TrackDraft): void {
    this.history.update((history) => (next === history.present ? history : { ...history, present: next }));
  }

  private commit(next: TrackDraft): void {
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
      const track = await this.tracks.findCustom(id);

      if (!track) {
        this.status.set('nao-encontrada');
        return;
      }

      const { name, theme, laps, path, boostCells, itemCells } = track;

      this.history.set(createEditorHistory({ name, theme, laps, path, boostCells, itemCells }));
      this.status.set('pronto');
    } catch (error) {
      console.error('Pedro Kart: não foi possível abrir a pista para editar.', error);
      this.status.set('erro');
    }
  }
}
