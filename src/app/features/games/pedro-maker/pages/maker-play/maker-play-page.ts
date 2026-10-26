import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MakerGameHost } from '../../components/maker-game-host/maker-game-host';
import { MakerAchievementToast } from '../../components/maker-achievement-toast/maker-achievement-toast';
import { MakerHeroPicker } from '../../components/maker-hero-picker/maker-hero-picker';
import { MakerVictory, type VictoryAction } from '../../components/maker-victory/maker-victory';
import { campaignLevelById, nextCampaignLevel, SECRET_ENTRANCES } from '../../levels/campaign';
import type { CampaignLevel } from '../../models/campaign.model';
import type { LevelBlueprint } from '../../models/level.model';
import type { HeroId, LevelReward, LevelRunResult } from '../../models/progress.model';
import { CustomLevelService, customLevelBlueprint } from '../../services/custom-level.service';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';

export type PlaySource = 'campanha' | 'minha';

/** `choosing`: a fase já está montada e espera a criança escolher quem vai jogar. */
type PlayStatus = 'loading' | 'choosing' | 'ready' | 'not-found' | 'locked' | 'error';

interface Victory {
  readonly result: LevelRunResult;
  readonly reward: LevelReward;
  readonly actions: readonly VictoryAction[];
}

/**
 * Tela de jogo: carrega a planta da fase e cuida do antes e do depois.
 *
 * Serve a campanha (`jogar/1-3`) e as fases criadas no editor
 * (`minhas-fases/jogar/:id`). A partida em si é do `MakerGameHost`; aqui
 * ficam a busca da fase, a escolha do herói, a recompensa e para onde ir em
 * seguida.
 *
 * O herói é escolhido a cada fase aberta, com um toque, e a escolha fica
 * guardada como o herói atual. "Jogar novamente" não pergunta de novo.
 */
@Component({
  selector: 'app-maker-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MakerGameHost, MakerHeroPicker, MakerVictory, MakerAchievementToast],
  templateUrl: './maker-play-page.html',
  styleUrl: './maker-play-page.scss',
})
export class MakerPlayPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly progress = inject(MakerProgressService);
  private readonly customLevels = inject(CustomLevelService);
  private readonly audio = inject(MakerAudioService);

  private readonly source: PlaySource = this.route.snapshot.data['source'] === 'minha' ? 'minha' : 'campanha';
  private readonly levelId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('levelId') ?? params.get('customId') ?? '')),
    { initialValue: '' },
  );

  protected readonly status = signal<PlayStatus>('loading');
  protected readonly blueprint = signal<LevelBlueprint | null>(null);
  protected readonly victory = signal<Victory | null>(null);
  protected readonly hero = this.progress.hero;
  protected readonly look = this.progress.look;

  /** Muda a cada partida nova: é o que recria o jogo do zero em "jogar de novo". */
  protected readonly attempt = signal(0);
  protected readonly runKeys = computed(() => [`${this.levelId()}:${this.attempt()}`]);

  protected readonly campaignLevel = computed<CampaignLevel | null>(() =>
    this.source === 'campanha' ? (campaignLevelById(this.levelId()) ?? null) : null,
  );

  protected readonly label = computed(() => {
    const level = this.campaignLevel();

    if (!level) {
      return 'MINHA FASE';
    }

    return level.kind === 'secret' ? 'FASE SECRETA' : `MUNDO ${level.id}`;
  });

  protected readonly exitLabel = this.source === 'campanha' ? 'Voltar ao mapa' : 'Minhas fases';

  constructor() {
    effect(() => {
      const id = this.levelId();

      untracked(() => void this.load(id));
    });
  }

  protected playAs(hero: HeroId): void {
    this.progress.selectHero(hero);
    this.audio.play('powerup');
    this.status.set('ready');
  }

  protected onCompleted(result: LevelRunResult): void {
    const level = this.campaignLevel();
    const blueprint = this.blueprint();

    if (level && blueprint) {
      const reward = this.progress.completeLevel(
        { source: 'campanha', levelId: level.id, isBoss: level.kind === 'boss', targetTimeSeconds: blueprint.targetTimeSeconds },
        result,
      );
      const next = nextCampaignLevel(level.id);
      const hasNext = next !== undefined && this.progress.isUnlocked(next);

      this.victory.set({
        result,
        reward,
        actions: [
          ...(hasNext ? [{ id: 'proxima', label: 'Próxima fase', emoji: '▶', tone: 'green' } as const] : []),
          { id: 'de-novo', label: 'Jogar novamente', emoji: '🔄', tone: 'blue' },
          { id: 'sair', label: 'Voltar ao mapa', emoji: '🗺', tone: 'orange' },
        ],
      });

      return;
    }

    const reward = this.progress.completeLevel({ source: 'minha' }, result);

    void this.customLevels.recordCompletion(this.levelId(), reward.stars).catch((error: unknown) =>
      console.error('Pedro Maker: não foi possível marcar a fase como vencida.', error),
    );

    this.victory.set({
      result,
      reward,
      actions: [
        { id: 'de-novo', label: 'Jogar novamente', emoji: '🔄', tone: 'green' },
        { id: 'editar', label: 'Editar fase', emoji: '✏️', tone: 'orange' },
        { id: 'sair', label: 'Minhas fases', emoji: '📂', tone: 'blue' },
      ],
    });
  }

  protected onVictoryChoice(choice: string): void {
    this.victory.set(null);

    switch (choice) {
      case 'proxima': {
        const next = nextCampaignLevel(this.levelId());

        if (next) {
          void this.router.navigate(['../', next.id], { relativeTo: this.route });
        }

        return;
      }
      case 'de-novo':
        this.attempt.update((attempt) => attempt + 1);
        return;
      case 'editar':
        void this.router.navigate(['/jogos/pedro-maker/criar', this.levelId()]);
        return;
      default:
        this.exit();
    }
  }

  protected onSecretFound(): void {
    const level = this.campaignLevel();

    if (level && SECRET_ENTRANCES[level.worldId] === level.id) {
      this.progress.registerSecret(`${level.worldId}-S`);
    }
  }

  protected exit(): void {
    const level = this.campaignLevel();

    if (level) {
      void this.router.navigate(['/jogos/pedro-maker/mapa'], { queryParams: { mundo: level.worldId } });
    } else {
      void this.router.navigate(['/jogos/pedro-maker/minhas-fases']);
    }
  }

  private async load(id: string): Promise<void> {
    this.status.set('loading');
    this.victory.set(null);
    this.blueprint.set(null);

    try {
      const blueprint = this.source === 'campanha' ? this.loadCampaign(id) : await this.loadCustom(id);

      if (blueprint) {
        this.blueprint.set(blueprint);
        this.status.set('choosing');
      }
    } catch (error) {
      console.error(`Pedro Maker: a fase "${id}" não pôde ser montada.`, error);
      this.status.set('error');
    }
  }

  private loadCampaign(id: string): LevelBlueprint | null {
    const level = campaignLevelById(id);

    if (!level) {
      this.status.set('not-found');
      return null;
    }

    if (!this.progress.isUnlocked(level)) {
      this.status.set('locked');
      return null;
    }

    return level.build();
  }

  private async loadCustom(id: string): Promise<LevelBlueprint | null> {
    const level = await this.customLevels.find(id);

    if (!level) {
      this.status.set('not-found');
      return null;
    }

    return customLevelBlueprint(level);
  }
}
