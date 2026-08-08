import { ChangeDetectionStrategy, Component } from '@angular/core';

import { STORY_CHAPTERS } from '../../core/data/story.data';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-story-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, RevealDirective],
  templateUrl: './story-page.html',
  styleUrl: './story-page.scss',
})
export class StoryPage {
  protected readonly chapters = STORY_CHAPTERS;
}
