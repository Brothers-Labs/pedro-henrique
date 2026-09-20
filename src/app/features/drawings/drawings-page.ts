import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import {
  DRAWING_FALLBACK_TITLES,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
} from '../../core/data/drawing.data';
import { DrawingLibraryService } from '../../core/services/drawing-library.service';
import { pickRandom } from '../../core/utils/shuffle';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { SectionHeading } from '../../shared/components/section-heading/section-heading';
import { DrawingBoard } from './drawing-board/drawing-board';
import { DrawingShelf } from './drawing-shelf/drawing-shelf';

/**
 * Página de desenhos.
 *
 * Compõe a prancheta e a estante: a prancheta entrega a imagem pronta e a
 * página cuida de guardá-la. Assim o componente que desenha não precisa saber
 * que existe um banco de dados embaixo.
 */
@Component({
  selector: 'app-drawings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, SectionHeading, EmptyState, DrawingBoard, DrawingShelf],
  templateUrl: './drawings-page.html',
  styleUrl: './drawings-page.scss',
})
export class DrawingsPage implements OnInit {
  private readonly library = inject(DrawingLibraryService);

  protected readonly drawings = this.library.drawings;
  protected readonly status = this.library.status;
  protected readonly errorMessage = this.library.errorMessage;
  protected readonly totalCount = this.library.totalCount;
  protected readonly isEmpty = this.library.isEmpty;
  protected readonly saveError = signal<string | null>(null);

  protected readonly countLabel = computed(() =>
    this.totalCount() === 1 ? '1 desenho guardado' : `${this.totalCount()} desenhos guardados`,
  );

  ngOnInit(): void {
    void this.library.load();
  }

  /** Guarda a imagem que a prancheta acabou de entregar. */
  protected async keep({ blob, title }: { readonly blob: Blob; readonly title: string }): Promise<void> {
    this.saveError.set(null);

    try {
      const name = title.trim() || pickRandom(DRAWING_FALLBACK_TITLES) || 'Meu desenho';

      await this.library.save(name, blob, DRAWING_WIDTH, DRAWING_HEIGHT);
    } catch {
      this.saveError.set('Não deu para guardar o desenho neste aparelho. Tente baixar o arquivo.');
    }
  }
}
