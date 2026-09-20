import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';

import type { DrawingCardData } from '../../../core/models/drawing.model';
import { DrawingLibraryService } from '../../../core/services/drawing-library.service';

/** Tempo que o botão de apagar fica pedindo confirmação. */
const CONFIRM_TIMEOUT_IN_MS = 4000;

/**
 * Estante dos desenhos guardados.
 *
 * Apagar é em dois toques de propósito: é a única ação desta tela que não tem
 * volta, e um desenho perdido por engano não se refaz.
 */
@Component({
  selector: 'app-drawing-shelf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './drawing-shelf.html',
  styleUrl: './drawing-shelf.scss',
})
export class DrawingShelf {
  readonly drawings = input.required<readonly DrawingCardData[]>();

  private readonly library = inject(DrawingLibraryService);
  private confirmTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly statusMessage = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected async remove(drawing: DrawingCardData): Promise<void> {
    if (this.pendingDeleteId() !== drawing.id) {
      this.clearTimer();
      this.pendingDeleteId.set(drawing.id);
      this.confirmTimeout = setTimeout(() => this.pendingDeleteId.set(null), CONFIRM_TIMEOUT_IN_MS);
      return;
    }

    this.clearTimer();
    this.pendingDeleteId.set(null);

    await this.library.remove(drawing.id);
    this.statusMessage.set(`Desenho "${drawing.title}" apagado.`);
  }

  protected isConfirming(id: string): boolean {
    return this.pendingDeleteId() === id;
  }

  private clearTimer(): void {
    if (this.confirmTimeout !== null) {
      clearTimeout(this.confirmTimeout);
      this.confirmTimeout = null;
    }
  }
}
