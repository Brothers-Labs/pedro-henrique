import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { BeansGame } from './beans-game/beans-game';
import { EnglishGame } from './english-game/english-game';
import { MemoryGame } from './memory-game/memory-game';
import { QuizGame } from './quiz-game/quiz-game';
import { TicTacToe } from './tic-tac-toe/tic-tac-toe';

type GameId = 'memoria' | 'velha' | 'feijoes' | 'quiz' | 'ingles';

interface GameTab {
  readonly id: GameId;
  readonly label: string;
  readonly emoji: string;
}

const GAME_TABS: readonly GameTab[] = [
  { id: 'memoria', label: 'Memória', emoji: '🧠' },
  { id: 'velha', label: 'Jogo da velha', emoji: '❌' },
  { id: 'feijoes', label: 'Trilha dos feijões', emoji: '🫘' },
  { id: 'quiz', label: 'Quiz', emoji: '❓' },
  { id: 'ingles', label: 'Inglês', emoji: '🔤' },
];

@Component({
  selector: 'app-games-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, MemoryGame, TicTacToe, BeansGame, QuizGame, EnglishGame],
  templateUrl: './games-page.html',
  styleUrl: './games-page.scss',
})
export class GamesPage {
  protected readonly tabs = GAME_TABS;
  protected readonly activeGame = signal<GameId>('memoria');

  protected selectGame(id: GameId): void {
    this.activeGame.set(id);
  }
}
