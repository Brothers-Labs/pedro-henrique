import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROFILE } from '../../../../../core/data/profile.data';
import { PetService } from '../../../../../core/services/pet.service';
import { PedroFigure } from '../../components/pedro-figure/pedro-figure';
import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { COIN_RULES, DAILY_MISSION, XP_RULES } from '../../config/rules.config';
import { CAMPAIGN_LEVELS } from '../../levels/campaign';
import { MakerProgressService } from '../../services/maker-progress.service';

interface MenuEntry {
  readonly label: string;
  readonly emoji: string;
  readonly route: string;
  readonly tone: string;
  readonly queryParams?: Readonly<Record<string, string>>;
}

/**
 * Tela de abertura do Pedro Maker.
 *
 * O botão JOGAR leva direto ao mundo onde a aventura parou; os demais abrem
 * mapa, editor, fases salvas, conquistas, personagem e configurações. O
 * cenário se mexe devagar — e fica parado no modo calmo.
 */
@Component({
  selector: 'app-maker-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MakerPageFrame, PedroFigure],
  templateUrl: './maker-home-page.html',
  styleUrl: './maker-home-page.scss',
})
export class MakerHomePage {
  private readonly progress = inject(MakerProgressService);
  private readonly pets = inject(PetService);

  protected readonly look = this.progress.look;
  protected readonly nextLevel = this.progress.nextLevel;
  protected readonly completedCount = this.progress.levelsCompleted;
  protected readonly totalLevels = CAMPAIGN_LEVELS.length;
  protected readonly mission = this.progress.mission;
  protected readonly missionGoal = DAILY_MISSION.levelsToComplete;
  protected readonly missionTitle = DAILY_MISSION.title;
  protected readonly missionReward = `+${XP_RULES.dailyMission} XP e +${COIN_RULES.dailyMission} moedas`;

  protected readonly companion = computed(() => {
    const pet = this.pets.pet();
    const type = this.pets.type();

    return pet && type ? { emoji: type.emoji, name: pet.name } : { emoji: PROFILE.avatarEmoji, name: 'Dino' };
  });

  protected readonly menu = computed<readonly MenuEntry[]>(() => [
    {
      label: 'Jogar',
      emoji: '▶',
      route: 'mapa',
      tone: 'green',
      queryParams: { mundo: String(this.nextLevel().worldId) },
    },
    { label: 'Mapa da aventura', emoji: '🗺️', route: 'mapa', tone: 'blue' },
    { label: 'Criar fase', emoji: '🛠️', route: 'criar', tone: 'orange' },
    { label: 'Minhas fases', emoji: '📂', route: 'minhas-fases', tone: 'yellow' },
    { label: 'Conquistas', emoji: '🏆', route: 'conquistas', tone: 'purple' },
    { label: 'Meu personagem', emoji: '👤', route: 'personagem', tone: 'pink' },
    { label: 'Configurações', emoji: '⚙️', route: 'configuracoes', tone: 'gray' },
  ]);
}
