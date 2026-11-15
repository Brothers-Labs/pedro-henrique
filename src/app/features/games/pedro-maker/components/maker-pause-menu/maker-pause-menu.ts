import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { SCREEN_LOOKS, SCREEN_MODES, type ScreenMode } from '../../config/screen.config';
import { MakerSettingsService } from '../../services/maker-settings.service';

export type PauseChoice = 'continuar' | 'recomecar' | 'sair';

/**
 * Menu de pausa, com as configurações rápidas ao alcance.
 *
 * Som, música, vibração, tela cheia e a tela (NES, SNES, Nintendo 64, 3D,
 * HD ou 4K) mudam na hora, sem sair da fase; os
 * efeitos visuais valem a partir da próxima vez que a fase começar.
 */
@Component({
  selector: 'app-maker-pause-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maker-pause-menu.html',
  styleUrl: './maker-pause-menu.scss',
})
export class MakerPauseMenu {
  readonly exitLabel = input('Sair da fase');
  readonly isFullscreen = input(false);
  /** Tela da partida agora: pode ser a da fase, diferente da dos ajustes. */
  readonly screen = input<ScreenMode | null>(null);

  readonly chosen = output<PauseChoice>();
  readonly screenChosen = output<ScreenMode>();
  readonly fullscreenToggled = output<void>();

  private readonly settingsService = inject(MakerSettingsService);

  private readonly firstAction = viewChild.required<ElementRef<HTMLButtonElement>>('firstAction');

  protected readonly settings = this.settingsService.settings;
  protected readonly isShowingSettings = signal(false);
  protected readonly screens = SCREEN_MODES.map((id) => ({ id, ...SCREEN_LOOKS[id] }));

  constructor() {
    // O foco vai para "Continuar": Enter ou espaço retomam a fase na hora.
    afterNextRender(() => this.firstAction().nativeElement.focus());
  }

  protected toggle(key: 'sounds' | 'music' | 'vibration' | 'effects'): void {
    this.settingsService.toggle(key);
  }

  /** A partida troca a tela na hora e guarda a escolha nos ajustes. */
  protected chooseScreen(screen: ScreenMode): void {
    this.screenChosen.emit(screen);
  }

  protected toggleSettings(): void {
    this.isShowingSettings.update((isShowing) => !isShowing);
  }
}
