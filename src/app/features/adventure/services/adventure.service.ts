import { computed, inject, Injectable } from '@angular/core';

import { AnalyticsService } from '../../../core/services/analytics.service';
import { GameProgressService } from '../../../core/services/game-progress.service';
import { PetService } from '../../../core/services/pet.service';
import { curiosityById } from '../config/adventure-curiosities.config';
import { ADVENTURE_WORLDS } from '../config/adventure-worlds.config';
import {
  buildWorldViews,
  currentWorldOf,
  levelViewOf,
  settleLevel,
} from '../engine/adventure-progression';
import type {
  AdventureCuriosity,
  AdventureWorld,
  LevelCompletion,
  LevelRunResult,
  LevelView,
  WorldMedal,
} from '../models/adventure.model';
import { AdventureProgressService } from './adventure-progress.service';

export interface AdventureSummary {
  readonly stars: number;
  readonly maxStars: number;
  readonly completedWorlds: number;
  readonly totalWorlds: number;
}

export interface UnlockedCuriosity {
  readonly curiosity: AdventureCuriosity;
  readonly unlockedAt: string;
}

/**
 * Porta de entrada da Aventura para as telas.
 *
 * Liga a jornada aos sistemas que já existem, sem recriá-los: cada resposta
 * vira um desafio do jogo do mundo (pontos, nível, conquistas e o XP que o
 * mascote já ganha pelos eventos), e os bônus da Aventura entram pelos mesmos
 * caminhos — pontos no progresso dos jogos, XP e acessório no mascote.
 */
@Injectable({ providedIn: 'root' })
export class AdventureService {
  private readonly store = inject(AdventureProgressService);
  private readonly games = inject(GameProgressService);
  private readonly pets = inject(PetService);
  private readonly analytics = inject(AnalyticsService);

  readonly worldViews = computed(() => buildWorldViews(this.store.progress(), ADVENTURE_WORLDS));
  readonly currentWorld = computed(() => currentWorldOf(this.worldViews()));

  readonly summary = computed<AdventureSummary>(() => {
    const views = this.worldViews();

    return {
      stars: views.reduce((total, view) => total + view.stars, 0),
      maxStars: views.reduce((total, view) => total + view.maxStars, 0),
      completedWorlds: views.filter((view) => view.status === 'completed').length,
      totalWorlds: views.length,
    };
  });

  readonly medals = computed<readonly WorldMedal[]>(() =>
    this.worldViews()
      .filter((view) => view.status === 'completed')
      .map((view) => view.world.medal),
  );

  readonly curiosities = computed<readonly UnlockedCuriosity[]>(() =>
    this.store.progress().curiosities.flatMap((record) => {
      const curiosity = curiosityById(record.id);

      return curiosity ? [{ curiosity, unlockedAt: record.unlockedAt }] : [];
    }),
  );

  world(worldId: string): AdventureWorld | null {
    return ADVENTURE_WORLDS.find((world) => world.id === worldId) ?? null;
  }

  levelView(worldId: string, levelId: string): LevelView | null {
    return levelViewOf(this.worldViews(), worldId, levelId);
  }

  /**
   * Registra uma resposta como um desafio do jogo do mundo.
   *
   * A tela trava a pergunta no primeiro toque, então cada pergunta chega aqui
   * uma vez só — a mesma regra de todos os jogos.
   */
  recordAnswer(worldId: string, wasCorrect: boolean): void {
    const world = this.requireWorld(worldId);

    this.games.registerChallenge(world.skillGameId, wasCorrect);
  }

  /**
   * Fecha uma partida e paga o que for devido.
   *
   * O progresso é gravado antes de qualquer prêmio: se a página fechar no
   * meio, o que já foi pago está marcado e não se repete na próxima vez.
   */
  completeLevel(worldId: string, levelId: string, result: LevelRunResult): LevelCompletion {
    const world = this.requireWorld(worldId);
    const completion = settleLevel(this.store.progress(), ADVENTURE_WORLDS, worldId, levelId, result, new Date());

    this.store.save(completion.progress);
    this.games.awardBonusPoints(world.skillGameId, completion.bonusPoints);

    if (completion.bonusPetXp > 0) {
      this.pets.addXp(completion.bonusPetXp, 'aventura');
    }

    this.deliverAccessories();

    this.analytics.track({
      name: 'adventure_level_completed',
      properties: { worldId, levelId, stars: completion.stars, isFirstCompletion: completion.isFirstCompletion },
    });

    return completion;
  }

  /**
   * Entrega ao mascote os acessórios dos mundos já concluídos.
   *
   * Idempotente: também cobre a criança que terminou um mundo antes de adotar
   * o mascote — o presente espera por ele e chega na próxima visita ao mapa.
   */
  deliverAccessories(): void {
    for (const view of this.worldViews()) {
      const accessoryId = view.world.rewardAccessoryId;

      if (view.status === 'completed' && accessoryId) {
        this.pets.grantAccessory(accessoryId);
      }
    }
  }

  private requireWorld(worldId: string): AdventureWorld {
    const world = this.world(worldId);

    if (!world) {
      throw new Error(`Mundo "${worldId}" não existe na Aventura.`);
    }

    return world;
  }
}
