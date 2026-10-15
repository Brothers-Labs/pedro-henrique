import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CalmModeService } from '../../../../core/services/calm-mode.service';
import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { DifficultyPicker } from '../../components/difficulty-picker';
import type { QualityPreference, TouchControlsPreference } from '../../models/aventura-state.model';
import { AventuraAudio } from '../../services/aventura-audio.service';
import { AventuraStore } from '../../services/aventura-store.service';

const QUALITY_OPTIONS: readonly { readonly id: QualityPreference; readonly label: string; readonly hint: string }[] = [
  { id: 'auto', label: 'Automática', hint: 'Começa pelo aparelho e diminui sozinha se o jogo engasgar.' },
  { id: 'alta', label: 'Alta', hint: 'Sombras e bordas suaves. Para computador e tablet forte.' },
  { id: 'media', label: 'Média', hint: 'Equilíbrio entre beleza e fluidez.' },
  { id: 'baixa', label: 'Baixa', hint: 'Sem sombras: o mais leve, para aparelhos simples.' },
];

const TOUCH_OPTIONS: readonly { readonly id: TouchControlsPreference; readonly label: string }[] = [
  { id: 'auto', label: 'Automático' },
  { id: 'sempre', label: 'Sempre mostrar' },
  { id: 'nunca', label: 'Nunca mostrar' },
];

/** Configurações do Pedro Aventura: qualidade 3D, volumes, controles de toque e progresso. */
@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialog, DifficultyPicker],
  templateUrl: './settings-page.html',
  styleUrls: ['../page.scss', './settings-page.scss'],
})
export class SettingsPage {
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);
  private readonly motion = inject(MotionPreferenceService);

  protected readonly settings = this.store.settings;
  protected readonly qualityOptions = QUALITY_OPTIONS;
  protected readonly touchOptions = TOUCH_OPTIONS;
  protected readonly isCalm = inject(CalmModeService).isEnabled;
  protected readonly isMotionReduced = computed(() => !this.motion.isAllowed());
  protected readonly isResetting = signal(false);
  protected readonly musicPercent = computed(() => Math.round(this.settings().musicVolume * 100));
  protected readonly effectsPercent = computed(() => Math.round(this.settings().effectsVolume * 100));

  protected setQuality(quality: QualityPreference): void {
    this.store.updateSettings({ quality });
  }

  protected setTouch(touchControls: TouchControlsPreference): void {
    this.store.updateSettings({ touchControls });
  }

  protected setMusic(event: Event): void {
    this.store.updateSettings({ musicVolume: sliderValue(event) });
  }

  protected setEffects(event: Event): void {
    this.store.updateSettings({ effectsVolume: sliderValue(event) });
    this.audio.play('coin');
  }

  protected reset(): void {
    this.isResetting.set(false);
    this.store.resetProgress();
  }
}

function sliderValue(event: Event): number {
  const target = event.target;

  return target instanceof HTMLInputElement ? Number(target.value) / 100 : 0;
}
