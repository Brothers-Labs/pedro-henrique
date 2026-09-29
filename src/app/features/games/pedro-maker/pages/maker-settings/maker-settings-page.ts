import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { MakerSyncPanel } from '../../components/maker-sync-panel/maker-sync-panel';
import { DIFFICULTY_ORDER, DIFFICULTY_RULES } from '../../config/rules.config';
import type { MakerDifficulty, TouchControlsMode } from '../../models/settings.model';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';
import { MakerSettingsService } from '../../services/maker-settings.service';

type Toggle = 'sounds' | 'music' | 'vibration' | 'effects';

const TOGGLES: readonly { readonly id: Toggle; readonly label: string; readonly emoji: string }[] = [
  { id: 'sounds', label: 'Sons', emoji: '🔊' },
  { id: 'music', label: 'Música', emoji: '🎵' },
  { id: 'vibration', label: 'Vibração', emoji: '📱' },
  { id: 'effects', label: 'Efeitos', emoji: '✨' },
];

const TOUCH_MODES: readonly { readonly id: TouchControlsMode; readonly label: string }[] = [
  { id: 'automatico', label: 'Automático' },
  { id: 'sempre', label: 'Sempre mostrar' },
  { id: 'nunca', label: 'Nunca mostrar' },
];

const KEYBOARD: readonly { readonly keys: string; readonly action: string }[] = [
  { keys: 'A ou ←', action: 'Andar para a esquerda' },
  { keys: 'D ou →', action: 'Andar para a direita' },
  { keys: 'Espaço, W ou ↑', action: 'Pular' },
  { keys: 'Shift', action: 'Correr' },
  { keys: 'E', action: 'Entrar em portas' },
  { keys: 'Esc', action: 'Pausar' },
];

/**
 * Configurações do Pedro Maker, guardadas no aparelho.
 *
 * Tudo muda na hora. "Recomeçar a aventura" apaga só o progresso do jogo —
 * as fases criadas no editor continuam em "Minhas fases".
 */
@Component({
  selector: 'app-maker-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MakerPageFrame, MakerSyncPanel],
  templateUrl: './maker-settings-page.html',
  styleUrl: './maker-settings-page.scss',
})
export class MakerSettingsPage {
  private readonly settingsService = inject(MakerSettingsService);
  private readonly progress = inject(MakerProgressService);
  private readonly audio = inject(MakerAudioService);

  protected readonly settings = this.settingsService.settings;
  protected readonly toggles = TOGGLES;
  protected readonly touchModes = TOUCH_MODES;
  protected readonly keyboard = KEYBOARD;
  protected readonly difficulties = DIFFICULTY_ORDER.map((id) => ({ id, ...DIFFICULTY_RULES[id] }));

  protected toggle(id: Toggle): void {
    this.settingsService.toggle(id);
    this.audio.play('button');
  }

  protected chooseTouchMode(mode: TouchControlsMode): void {
    this.settingsService.update({ touchControls: mode });
    this.audio.play('button');
  }

  protected chooseDifficulty(difficulty: MakerDifficulty): void {
    this.settingsService.update({ difficulty });
    this.audio.play('button');
  }

  protected resetAdventure(): void {
    if (confirm('Recomeçar a aventura do zero? Fases, estrelas, moedas e conquistas do Pedro Maker vão zerar.')) {
      this.progress.resetAll();
    }
  }
}
