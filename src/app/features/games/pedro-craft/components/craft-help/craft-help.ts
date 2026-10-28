import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';

import { CalmModeService } from '../../../../../core/services/calm-mode.service';
import { CALM_SPEECH_RATE, DEFAULT_SPEECH_RATE, SpeechService } from '../../../../../core/services/speech.service';
import type { CraftCatalog } from '../../content/craft-catalog';
import { itemHelp, recipeHelp, smeltingHelp } from '../../presentation/help-catalog';
import { HELP_CONTROLS, HELP_TOPICS, type HelpControlLabel, type HelpTopic } from '../../presentation/help-topics';
import type { ItemIconCache } from '../../presentation/item-icon-cache';

/** As páginas da ajuda: o índice, um tópico escrito ou uma das listas montadas do conteúdo. */
type HelpPage =
  | { readonly kind: 'index' }
  | { readonly kind: 'topic'; readonly topic: HelpTopic }
  | { readonly kind: 'recipes' }
  | { readonly kind: 'smelting' }
  | { readonly kind: 'items' };

interface CatalogCard {
  readonly kind: 'recipes' | 'smelting' | 'items';
  readonly emoji: string;
  readonly title: string;
  readonly summary: string;
}

const CATALOG_CARDS: readonly CatalogCard[] = [
  { kind: 'recipes', emoji: '📖', title: 'Todas as receitas', summary: 'Tudo o que dá para fabricar, e com o quê.' },
  { kind: 'smelting', emoji: '🔥', title: 'O que a fornalha faz', summary: 'O que entra e o que sai assado.' },
  { kind: 'items', emoji: '🎒', title: 'Todos os itens', summary: 'Para que serve cada coisa e como conseguir.' },
];

const CATALOG_TITLES: Readonly<Record<CatalogCard['kind'], string>> = {
  recipes: '📖 Todas as receitas',
  smelting: '🔥 O que a fornalha faz',
  items: '🎒 Todos os itens',
};

/**
 * A ajuda do PedroCraft: tudo o que existe no jogo e como fazer, passo a
 * passo, com as figuras dos itens.
 *
 * Abre por cima do mundo pausado. Cada tópico pode ser ouvido em voz alta,
 * para quem ainda não lê. As receitas e os itens saem do conteúdo, então a
 * ajuda cresce sozinha junto com o jogo.
 */
@Component({
  selector: 'app-craft-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './craft-help.html',
  styleUrl: './craft-help.scss',
  host: { '(document:keydown.escape)': 'close()' },
})
export class CraftHelp {
  readonly catalog = input.required<CraftCatalog>();
  readonly icons = input.required<ItemIconCache>();

  readonly closed = output<void>();

  private readonly speech = inject(SpeechService);
  private readonly calmMode = inject(CalmModeService);

  protected readonly topics = HELP_TOPICS;
  protected readonly catalogCards = CATALOG_CARDS;
  protected readonly catalogTitles = CATALOG_TITLES;
  protected readonly canSpeak = this.speech.isSupported;
  protected readonly page = signal<HelpPage>({ kind: 'index' });

  protected readonly recipes = computed(() => recipeHelp(this.catalog()));
  protected readonly smelting = computed(() => smeltingHelp(this.catalog()));
  protected readonly items = computed(() => itemHelp(this.catalog()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.speech.stop());
  }

  protected control(id: keyof typeof HELP_CONTROLS): HelpControlLabel {
    return HELP_CONTROLS[id];
  }

  protected open(page: HelpPage): void {
    this.speech.stop();
    this.page.set(page);
  }

  protected back(): void {
    this.open({ kind: 'index' });
  }

  protected close(): void {
    this.speech.stop();
    this.closed.emit();
  }

  /** Lê o tópico inteiro: título, resumo, cada passo numerado e a dica. */
  protected listen(topic: HelpTopic): void {
    const steps = topic.steps.map((step, index) => `Passo ${index + 1}. ${step.text}`);
    const text = [topic.title, topic.summary, ...steps, topic.tip ? `Dica: ${topic.tip}` : ''].join(' ');

    this.speech.speak(text, { language: 'pt-BR', rate: this.calmMode.isEnabled() ? CALM_SPEECH_RATE : DEFAULT_SPEECH_RATE });
  }
}
