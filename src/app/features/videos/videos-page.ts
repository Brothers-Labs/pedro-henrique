import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import type { VideoCardData, VideoSortOption, VideoSortOrder } from '../../core/models/video.model';
import { VideoLibraryService } from '../../core/services/video-library.service';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { VideoCard } from './video-card/video-card';
import { VideoUploadForm } from './video-upload-form/video-upload-form';

const SORT_OPTIONS: readonly VideoSortOption[] = [
  { value: 'recorded-desc', label: 'Gravados mais recentes' },
  { value: 'recorded-asc', label: 'Gravados mais antigos' },
  { value: 'uploaded-desc', label: 'Adicionados por último' },
  { value: 'title-asc', label: 'Título (A a Z)' },
];

@Component({
  selector: 'app-videos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, EmptyState, VideoCard, VideoUploadForm],
  templateUrl: './videos-page.html',
  styleUrl: './videos-page.scss',
})
export class VideosPage implements OnInit {
  private readonly library = inject(VideoLibraryService);

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly status = this.library.status;
  protected readonly errorMessage = this.library.errorMessage;
  protected readonly totalCount = this.library.totalCount;

  protected readonly sortOrder = signal<VideoSortOrder>('recorded-desc');
  protected readonly searchTerm = signal('');
  protected readonly feedback = signal<string | null>(null);

  protected readonly visibleVideos = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    const filtered = term
      ? this.library.videos().filter((video) => matchesTerm(video, term))
      : this.library.videos();

    return [...filtered].sort(compareBy(this.sortOrder()));
  });

  ngOnInit(): void {
    void this.library.load();
  }

  protected changeSortOrder(value: string): void {
    this.sortOrder.set(value as VideoSortOrder);
  }

  protected changeSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected onUploaded(video: VideoCardData): void {
    this.feedback.set(`"${video.title}" foi adicionado à sua coleção.`);
  }

  protected async onRemove(id: string): Promise<void> {
    try {
      await this.library.remove(id);
      this.feedback.set('Vídeo apagado.');
    } catch {
      this.feedback.set('Não foi possível apagar o vídeo. Tente novamente.');
    }
  }
}

function matchesTerm(video: VideoCardData, term: string): boolean {
  return (
    video.title.toLocaleLowerCase('pt-BR').includes(term) ||
    video.description.toLocaleLowerCase('pt-BR').includes(term)
  );
}

function compareBy(order: VideoSortOrder): (first: VideoCardData, second: VideoCardData) => number {
  switch (order) {
    case 'recorded-asc':
      return (first, second) => first.recordedAt.localeCompare(second.recordedAt);
    case 'uploaded-desc':
      return (first, second) => second.uploadedAt.localeCompare(first.uploadedAt);
    case 'title-asc':
      return (first, second) => first.title.localeCompare(second.title, 'pt-BR');
    case 'recorded-desc':
      return (first, second) => second.recordedAt.localeCompare(first.recordedAt);
  }
}
