import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MakerAudioService } from '../../../pedro-maker/services/maker-audio.service';
import { CraftPageFrame } from '../../components/craft-page-frame/craft-page-frame';
import {
  type CraftButtonSize,
  type CraftSettings,
  type CraftTouchMode,
  LOOK_SENSITIVITY_RANGE,
} from '../../models/craft-settings.model';
import { CraftSettingsService } from '../../services/craft-settings.service';

type Toggle = keyof Pick<CraftSettings, 'peaceful' | 'autoJump'>;

const TOGGLES: readonly { readonly id: Toggle; readonly label: string; readonly emoji: string }[] = [
  { id: 'peaceful', label: 'Modo Paz (sem inimigos)', emoji: '🕊️' },
  { id: 'autoJump', label: 'Pulo automático', emoji: '🦘' },
];

const TOUCH_MODES: readonly { readonly id: CraftTouchMode; readonly label: string }[] = [
  { id: 'automatico', label: 'Automático' },
  { id: 'sempre', label: 'Sempre' },
  { id: 'nunca', label: 'Nunca' },
];

const BUTTON_SIZES: readonly { readonly id: CraftButtonSize; readonly label: string }[] = [
  { id: 'normal', label: 'Normais' },
  { id: 'grande', label: 'Grandes' },
];

const SENSITIVITY_LABEL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

const KEYBOARD: readonly { readonly keys: string; readonly action: string }[] = [
  { keys: 'W A S D', action: 'Andar' },
  { keys: 'Espaço', action: 'Pular e nadar para cima' },
  { keys: 'Mouse', action: 'Olhar (clique no mundo primeiro)' },
  { keys: 'Clique', action: 'Quebrar bloco e golpear' },
  { keys: 'Botão direito', action: 'Colocar bloco, usar e comer' },
  { keys: '1 a 9', action: 'Escolher o item da barra' },
  { keys: 'E', action: 'Abrir a mochila' },
  { keys: 'Esc', action: 'Pausar' },
];

/**
 * Configurações do PedroCraft, guardadas no aparelho.
 *
 * Valem para todos os mundos: apagar um mundo não desliga o Modo Paz que
 * alguém escolheu. As mudanças chegam ao jogo aberto na hora.
 */
@Component({
  selector: 'app-craft-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftPageFrame],
  templateUrl: './craft-settings-page.html',
  styleUrl: '../../../pedro-maker/pages/maker-settings/maker-settings-page.scss',
})
export class CraftSettingsPage {
  private readonly settingsService = inject(CraftSettingsService);
  private readonly audio = inject(MakerAudioService);

  protected readonly settings = this.settingsService.settings;
  protected readonly toggles = TOGGLES;
  protected readonly touchModes = TOUCH_MODES;
  protected readonly buttonSizes = BUTTON_SIZES;
  protected readonly keyboard = KEYBOARD;
  protected readonly sensitivities = sensitivitySteps();

  protected toggle(id: Toggle): void {
    this.change({ [id]: !this.settings()[id] });
  }

  protected chooseSensitivity(value: number): void {
    this.change({ lookSensitivity: value });
  }

  protected chooseTouchMode(mode: CraftTouchMode): void {
    this.change({ touchControls: mode });
  }

  protected chooseButtonSize(size: CraftButtonSize): void {
    this.change({ buttonSize: size });
  }

  private change(changes: Partial<CraftSettings>): void {
    this.audio.play('button');
    this.settingsService.update(changes);
  }
}

/** Os passos do giro do olhar, de 0,5× a 2×, como a criança escolhe: em botões, sem arrastar nada. */
function sensitivitySteps(): readonly { readonly value: number; readonly label: string }[] {
  const { min, max, step } = LOOK_SENSITIVITY_RANGE;
  const count = Math.round((max - min) / step) + 1;

  return Array.from({ length: count }, (_, index) => {
    const value = min + index * step;

    return { value, label: `${SENSITIVITY_LABEL.format(value)}×` };
  });
}
