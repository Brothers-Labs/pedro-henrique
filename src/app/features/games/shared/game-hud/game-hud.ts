import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  NgZone,
  signal,
  untracked,
} from '@angular/core';

import { gameDefinition } from '../../../../core/data/game-progress.data';
import { levelPercentage } from '../../../../core/games/progression';
import type { GameId } from '../../../../core/models/game-progress.model';
import { GameProgressService } from '../../../../core/services/game-progress.service';
import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';

/** Tempo da contagem animada dos pontos. Curto: é um detalhe, não um espetáculo. */
const COUNT_DURATION_IN_MS = 520;

/** A sequência só aparece quando já significa alguma coisa. */
const STREAK_VISIBLE_FROM = 2;

/** Tempo que a barra fica cheia antes de recomeçar no nível seguinte. */
const FULL_BAR_HOLD_IN_MS = 750;

const SCORE_FORMAT = new Intl.NumberFormat('pt-BR');

/**
 * Painel de progresso que abre todos os jogos.
 *
 * Lê tudo do serviço a partir do `gameId`: nenhum jogo repassa nível, pontos ou
 * porcentagem por input, então nunca existe um número desatualizado na tela.
 *
 * A barra nunca informa sozinha pela cor — o mesmo dado aparece escrito ao
 * lado, em "7 de 10", e no texto do que falta para o próximo nível.
 */
@Component({
  selector: 'app-game-hud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-color]': 'definition().color' },
  templateUrl: './game-hud.html',
  styleUrl: './game-hud.scss',
})
export class GameHud {
  readonly gameId = input.required<GameId>();

  private readonly progressService = inject(GameProgressService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly zone = inject(NgZone);

  private animationHandle: number | null = null;
  private resetBarTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSeenLevel = 0;

  protected readonly definition = computed(() => gameDefinition(this.gameId()));
  protected readonly progress = computed(() => this.progressService.player().games[this.gameId()]);

  /**
   * Largura da barra.
   *
   * Não é o percentual cru: ao subir de nível o contador zera na hora, e a
   * barra sumindo de 90% para 0% roubaria justamente o momento que a criança
   * esperava. Aqui ela fecha em 100%, espera um instante e só então recomeça.
   */
  protected readonly percentage = signal(0);

  protected readonly remaining = computed(
    () => this.definition().challengesPerLevel - this.progress().completedInLevel,
  );

  protected readonly streak = computed(() => this.progress().currentStreak);
  protected readonly hasStreak = computed(() => this.streak() >= STREAK_VISIBLE_FROM);

  /** Pontos mostrados; sobe até o valor real em vez de saltar de uma vez. */
  protected readonly displayedScore = signal(0);
  protected readonly formattedScore = computed(() => SCORE_FORMAT.format(this.displayedScore()));

  protected readonly unitLabel = computed(() => {
    const { unit } = this.definition();
    const plural: Record<typeof unit, string> = {
      desafio: 'desafios',
      pergunta: 'perguntas',
      conta: 'contas',
      rodada: 'rodadas',
      partida: 'partidas',
    };

    return this.remaining() === 1 ? unit : plural[unit];
  });

  constructor() {
    effect(() => this.animateTo(this.progress().score));
    effect(() => this.syncBar(this.progress().level, levelPercentage(this.progress(), this.definition())));

    inject(DestroyRef).onDestroy(() => {
      this.cancelAnimation();
      this.clearBarTimeout();
    });
  }

  private syncBar(level: number, target: number): void {
    untracked(() => {
      this.clearBarTimeout();

      const isLevelUp = this.lastSeenLevel > 0 && level > this.lastSeenLevel;
      this.lastSeenLevel = level;

      if (!isLevelUp || !this.motion.isAllowed()) {
        this.percentage.set(target);
        return;
      }

      this.percentage.set(100);
      this.resetBarTimeout = setTimeout(() => this.percentage.set(target), FULL_BAR_HOLD_IN_MS);
    });
  }

  private clearBarTimeout(): void {
    if (this.resetBarTimeout !== null) {
      clearTimeout(this.resetBarTimeout);
      this.resetBarTimeout = null;
    }
  }

  /**
   * Leva o contador até a pontuação nova.
   *
   * Sem movimento permitido a troca é seca: o número certo importa mais do que
   * a animação, e o modo calmo existe justamente para tirar o excesso.
   */
  private animateTo(target: number): void {
    this.cancelAnimation();

    const from = this.displayedScore();
    if (from === target || !this.motion.isAllowed()) {
      this.displayedScore.set(target);
      return;
    }

    this.zone.runOutsideAngular(() => {
      const startedAt = performance.now();

      const step = (now: number): void => {
        const ratio = Math.min(1, (now - startedAt) / COUNT_DURATION_IN_MS);
        this.displayedScore.set(Math.round(from + (target - from) * easeOut(ratio)));

        if (ratio < 1) {
          this.animationHandle = requestAnimationFrame(step);
          return;
        }

        this.animationHandle = null;
      };

      this.animationHandle = requestAnimationFrame(step);
    });
  }

  private cancelAnimation(): void {
    if (this.animationHandle !== null) {
      cancelAnimationFrame(this.animationHandle);
      this.animationHandle = null;
    }
  }
}

function easeOut(ratio: number): number {
  return 1 - (1 - ratio) ** 3;
}
