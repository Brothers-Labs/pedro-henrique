import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import type { VideoCardData } from '../../../core/models/video.model';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';

@Component({
  selector: 'app-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DurationPipe, FileSizePipe],
  templateUrl: './video-card.html',
  styleUrl: './video-card.scss',
})
export class VideoCard {
  readonly video = input.required<VideoCardData>();
  readonly remove = output<string>();

  /** Exclusão em dois passos, para ninguém apagar um vídeo sem querer. */
  protected readonly isConfirmingRemoval = signal(false);

  protected askForConfirmation(): void {
    this.isConfirmingRemoval.set(true);
  }

  protected cancelRemoval(): void {
    this.isConfirmingRemoval.set(false);
  }

  protected confirmRemoval(): void {
    this.isConfirmingRemoval.set(false);
    this.remove.emit(this.video().id);
  }
}
