import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import type { VideoCardData } from '../../../core/models/video.model';
import {
  MAX_VIDEO_SIZE_IN_BYTES,
  VideoLibraryService,
} from '../../../core/services/video-library.service';
import { formatFileSize } from '../../../core/utils/format';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';

const MAX_TITLE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 400;

@Component({
  selector: 'app-video-upload-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FileSizePipe],
  templateUrl: './video-upload-form.html',
  styleUrl: './video-upload-form.scss',
})
export class VideoUploadForm {
  readonly uploaded = output<VideoCardData>();

  private readonly library = inject(VideoLibraryService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly maxSizeLabel = formatFileSize(MAX_VIDEO_SIZE_IN_BYTES);
  protected readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly isDraggingOver = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(MAX_TITLE_LENGTH)]],
    description: ['', [Validators.required, Validators.maxLength(MAX_DESCRIPTION_LENGTH)]],
    recordedAt: [this.today, Validators.required],
  });

  protected readonly canSubmit = computed(() => this.selectedFile() !== null && !this.isSubmitting());

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.acceptFile(input.files?.[0] ?? null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  protected onDragLeave(): void {
    this.isDraggingOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
    this.acceptFile(event.dataTransfer?.files?.[0] ?? null);
  }

  protected async submit(): Promise<void> {
    const file = this.selectedFile();

    if (this.form.invalid || !file) {
      this.form.markAllAsTouched();
      this.errorMessage.set(file ? null : 'Escolha um arquivo de vídeo.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const { title, description, recordedAt } = this.form.getRawValue();
      const video = await this.library.add({ title, description, recordedAt, file });

      this.uploaded.emit(video);
      this.resetForm();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível salvar o vídeo.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected clearFile(): void {
    this.selectedFile.set(null);
  }

  protected hasError(controlName: 'title' | 'description' | 'recordedAt'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private acceptFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('video/')) {
      this.errorMessage.set('Esse arquivo não é um vídeo. Escolha outro.');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_IN_BYTES) {
      this.errorMessage.set(`O vídeo passa de ${this.maxSizeLabel}. Escolha um menor.`);
      return;
    }

    this.errorMessage.set(null);
    this.selectedFile.set(file);
  }

  private resetForm(): void {
    this.form.reset({ title: '', description: '', recordedAt: this.today });
    this.selectedFile.set(null);
  }
}
