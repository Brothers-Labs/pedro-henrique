import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ChoiceChips } from '../../components/choice-chips/choice-chips';
import { TubeAvatar } from '../../components/tube-avatar/tube-avatar';
import { COLOR_CHIPS, EMOJI_CHIPS } from '../../data/tube-choices.data';
import { MAX_CHANNEL_NAME_LENGTH, MAX_CHANNELS, MAX_DESCRIPTION_LENGTH } from '../../engine/tube-storage';
import { PedroTubeStore } from '../../services/pedro-tube-store.service';

/** Formulário de canal novo, com a prévia do banner mudando enquanto a criança escolhe. */
@Component({
  selector: 'app-channel-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChoiceChips, TubeAvatar],
  templateUrl: './channel-creator.html',
  styleUrl: '../studio-form.scss',
})
export class ChannelCreator {
  private readonly store = inject(PedroTubeStore);
  private readonly router = inject(Router);

  protected readonly emojiChips = EMOJI_CHIPS;
  protected readonly colorChips = COLOR_CHIPS;
  protected readonly maxNameLength = MAX_CHANNEL_NAME_LENGTH;
  protected readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

  protected readonly name = signal('');
  protected readonly avatar = signal(EMOJI_CHIPS[0].value);
  protected readonly color = signal(COLOR_CHIPS[0].value);
  protected readonly description = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly previewName = computed(() => this.name().trim() || 'Meu canal');
  protected readonly isFull = computed(() => !this.store.canCreateChannel());

  protected create(): void {
    if (!this.name().trim()) {
      this.error.set('Dê um nome para o canal.');
      return;
    }

    const channel = this.store.createChannel({
      name: this.name(),
      avatar: this.avatar(),
      color: this.color(),
      description: this.description(),
    });

    if (!channel) {
      this.error.set(this.store.saveError() ?? `Você já tem ${MAX_CHANNELS} canais. Apague um para criar outro.`);
      return;
    }

    void this.router.navigate(['/pedro-tube/canal', channel.id]);
  }
}
