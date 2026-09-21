import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { GAME_CATALOG } from '../../core/data/game-progress.data';
import { PROFILE } from '../../core/data/profile.data';
import type { GameId } from '../../core/models/game-progress.model';
import { GameProgressService } from '../../core/services/game-progress.service';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { BeansGame } from './beans-game/beans-game';
import { EnglishGame } from './english-game/english-game';
import { IqGame } from './iq-game/iq-game';
import { MathGame } from './math-game/math-game';
import { MemoryGame } from './memory-game/memory-game';
import { PetCelebrations } from '../pet/pet-celebrations/pet-celebrations';
import { PetCompanion } from '../pet/pet-companion/pet-companion';
import { PetSummaryCard } from '../pet/pet-summary-card/pet-summary-card';
import { QuizGame } from './quiz-game/quiz-game';
import { AchievementToast } from './shared/achievement-toast/achievement-toast';
import { TicTacToe } from './tic-tac-toe/tic-tac-toe';

const SCORE_FORMAT = new Intl.NumberFormat('pt-BR');

/**
 * Página de jogos.
 *
 * Abre com o painel da jornada — pontos, nível geral e o que falta para o
 * próximo objetivo — antes da trilha de jogos. É o que permite à criança ver a
 * própria evolução sem precisar entrar em nenhum jogo.
 *
 * As abas vêm do catálogo, e não de uma lista própria: um jogo novo aparece
 * aqui só de entrar no catálogo.
 *
 * O mascote entra por três peças que não sabem nada sobre jogo nenhum: o
 * cartão ao lado do painel, o companheiro que comenta as jogadas e as
 * comemorações de nível e evolução.
 */
@Component({
  selector: 'app-games-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageIntro,
    AchievementToast,
    PetSummaryCard,
    PetCompanion,
    PetCelebrations,
    MemoryGame,
    TicTacToe,
    BeansGame,
    QuizGame,
    EnglishGame,
    MathGame,
    IqGame,
  ],
  templateUrl: './games-page.html',
  styleUrl: './games-page.scss',
})
export class GamesPage {
  private readonly progressService = inject(GameProgressService);

  protected readonly childName = PROFILE.firstName;
  protected readonly games = GAME_CATALOG;
  protected readonly activeGame = signal<GameId>(GAME_CATALOG[0].id);

  protected readonly summary = computed(() => this.progressService.summary());
  protected readonly nextGoal = computed(() => this.progressService.nextGoal());
  protected readonly formattedScore = computed(() =>
    SCORE_FORMAT.format(this.summary().totalScore),
  );

  protected selectGame(id: GameId): void {
    this.activeGame.set(id);
  }

  protected levelOf(id: GameId): number {
    return this.progressService.player().games[id].level;
  }

  /** Leva a criança direto ao jogo sugerido pelo próximo objetivo. */
  protected goToNextGoal(): void {
    const goal = this.nextGoal();

    if (goal) {
      this.activeGame.set(goal.game.id);
    }
  }
}
