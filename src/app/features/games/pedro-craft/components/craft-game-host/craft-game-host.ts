import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { GameProgressService } from '../../../../../core/services/game-progress.service';
import { MotionPreferenceService } from '../../../../../core/services/motion-preference.service';
import { MakerAudioService } from '../../../pedro-maker/services/maker-audio.service';
import type { CraftCatalog } from '../../content/craft-catalog';
import { createVirtualCraftInput } from '../../engine/input/craft-input';
import type {
  CraftEngineSettings,
  CraftGameSession,
  CraftHudState,
  CraftSessionEvent,
  ScreenView,
} from '../../models/craft-session.model';
import type { WorldSave } from '../../models/world-save.model';
import { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftSettingsService } from '../../services/craft-settings.service';
import { CraftWorldsService } from '../../services/craft-worlds.service';
import { CraftHelp } from '../craft-help/craft-help';
import { CraftHud, type PickupNotice } from '../craft-hud/craft-hud';
import { CraftScreenPanel, type SlotRequest } from '../craft-screen-panel/craft-screen-panel';
import { CraftTouchControls } from '../craft-touch-controls/craft-touch-controls';

type HostPhase = 'loading' | 'playing' | 'screen' | 'help' | 'paused' | 'error';

const TOAST_VISIBLE_MS = 2600;
const HURT_VISIBLE_MS = 350;

/** De quanto em quanto tempo o mundo se salva sozinho enquanto se joga. */
const AUTOSAVE_EVERY_MS = 20_000;

const SAVE_FAILED_MESSAGE = 'Não foi possível salvar o mundo agora. Vamos tentar de novo daqui a pouco.';
const PICKUP_VISIBLE_MS = 1800;
const MAX_PICKUPS = 3;

/**
 * Um mundo do PedroCraft em tela cheia.
 *
 * Carrega o motor só quando o mundo abre, cria o jogo fora da zona do
 * Angular (60 quadros por segundo não podem disparar detecção de mudanças) e
 * traduz os eventos do motor em signals: HUD, mochila, avisos e missões.
 *
 * O mundo se salva sozinho: ao abrir, a cada `AUTOSAVE_EVERY_MS`, ao pausar,
 * ao esconder a aba e ao sair. Ao sair da tela, o jogo é destruído junto com
 * o canvas.
 */
@Component({
  selector: 'app-craft-game-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftTouchControls, CraftHud, CraftScreenPanel, CraftHelp],
  templateUrl: './craft-game-host.html',
  styleUrl: './craft-game-host.scss',
  host: {
    '(document:visibilitychange)': 'pauseWhenHidden()',
    '(document:fullscreenchange)': 'syncFullscreen()',
    '(document:pointerlockchange)': 'syncPointerLock()',
    '(document:keydown)': 'handleKey($event)',
  },
})
export class CraftGameHost {
  readonly catalog = input.required<CraftCatalog>();
  readonly world = input.required<WorldSave>();

  readonly exited = output<void>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly settingsService = inject(CraftSettingsService);
  private readonly worlds = inject(CraftWorldsService);
  private readonly siteProgress = inject(GameProgressService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly root = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private session: CraftGameSession | null = null;
  private lookPointer: { readonly id: number; x: number; y: number } | null = null;
  private pickupKey = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private autosaveTimer: ReturnType<typeof setInterval> | null = null;
  private helpReturnsTo: 'playing' | 'paused' = 'playing';

  /** Estado dos controles de toque, lido pelo motor a cada passo. */
  protected readonly virtualInput = createVirtualCraftInput();

  protected readonly phase = signal<HostPhase>('loading');
  protected readonly loadingProgress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly hud = signal<CraftHudState | null>(null);
  protected readonly screen = signal<ScreenView | null>(null);
  protected readonly toast = signal<string | null>(null);
  protected readonly isHurt = signal(false);
  protected readonly pickups = signal<readonly PickupNotice[]>([]);
  protected readonly isFullscreen = signal(false);
  protected readonly isPointerLocked = signal(false);
  protected readonly canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  protected readonly buttonSize = computed(() => this.settingsService.settings().buttonSize);
  protected readonly isPeaceful = computed(() => this.settingsService.settings().peaceful);
  protected readonly icons = computed(() => new ItemIconCache(this.catalog()));

  protected readonly showsTouchControls = computed(() => {
    const mode = this.settingsService.settings().touchControls;

    return mode === 'sempre' || (mode === 'automatico' && isTouchDevice());
  });

  protected readonly showsMouseHint = computed(
    () => this.phase() === 'playing' && !this.showsTouchControls() && !this.isPointerLocked(),
  );

  private readonly engineSettings = computed<CraftEngineSettings>(() => {
    const settings = this.settingsService.settings();

    return {
      peaceful: settings.peaceful,
      lookSensitivity: settings.lookSensitivity,
      autoJump: settings.autoJump,
      // Modo calmo e movimento reduzido do sistema também apagam partículas e tremores.
      effectsEnabled: this.motion.isAllowed(),
    };
  });

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const settings = this.engineSettings();

      untracked(() => this.session?.updateSettings(settings));
    });

    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /* Comandos da tela ------------------------------------------------------------ */

  protected pause(): void {
    if (this.phase() !== 'playing') {
      return;
    }

    this.session?.pause();
    this.phase.set('paused');
    this.audio.play('button');
    this.saveNow();
  }

  protected resume(): void {
    if (this.phase() !== 'paused') {
      return;
    }

    this.audio.play('button');
    this.session?.resume();
    this.phase.set('playing');
  }

  /** Liga ou desliga os inimigos; ligado no meio da noite, eles vão embora na hora. */
  protected togglePeaceful(): void {
    this.audio.play('button');
    this.settingsService.update({ peaceful: !this.isPeaceful() });
  }

  protected exit(): void {
    this.audio.play('button');
    this.saveNow();
    this.exited.emit();
  }

  protected selectSlot(index: number): void {
    this.session?.selectSlot(index);
  }

  protected openInventory(): void {
    if (this.phase() === 'playing') {
      this.showScreen(this.session?.openInventory() ?? null);
    }
  }

  protected clickSlot(request: SlotRequest): void {
    this.updateScreen(this.session?.clickSlot(request.ref, request.mode) ?? null);
  }

  protected takeGridResult(): void {
    this.updateScreen(this.session?.takeGridResult() ?? null);
  }

  protected craftRecipe(recipeId: string): void {
    this.updateScreen(this.session?.craftRecipe(recipeId) ?? null);
  }

  protected closeScreen(): void {
    if (this.phase() !== 'screen') {
      return;
    }

    this.session?.closeScreen();
    this.screen.set(null);
    this.phase.set('playing');
    this.audio.play('button');
  }

  /** Atalhos que valem por cima do jogo: E fecha a mochila; H abre e fecha a ajuda. */
  protected handleKey(event: KeyboardEvent): void {
    if (this.phase() === 'screen' && (event.code === 'KeyE' || event.code === 'KeyI')) {
      this.closeScreen();
    } else if (event.code === 'KeyH') {
      if (this.phase() === 'help') {
        this.closeHelp();
      } else {
        this.openHelp();
      }
    }
  }

  /** A ajuda pausa o mundo; ao fechar, volta para onde estava (o jogo ou a pausa). */
  protected openHelp(): void {
    const phase = this.phase();

    if (phase !== 'playing' && phase !== 'paused') {
      return;
    }

    this.session?.pause();
    this.helpReturnsTo = phase;
    this.phase.set('help');
    this.audio.play('button');
  }

  protected closeHelp(): void {
    if (this.phase() !== 'help') {
      return;
    }

    this.audio.play('button');
    this.phase.set(this.helpReturnsTo);

    if (this.helpReturnsTo === 'playing') {
      this.session?.resume();
    }
  }

  protected async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await this.root.nativeElement.requestFullscreen({ navigationUI: 'hide' });
    } catch (error) {
      // Alguns navegadores (iPhone) não deixam: o jogo segue do mesmo tamanho.
      console.warn('PedroCraft: tela cheia indisponível neste navegador.', error);
    }
  }

  /** Aba escondida pode nunca mais voltar (o tablet fecha o navegador): pausa e salva. */
  protected pauseWhenHidden(): void {
    if (!document.hidden) {
      return;
    }

    if (this.phase() === 'playing') {
      this.pause();
    } else {
      this.saveNow();
    }
  }

  protected syncFullscreen(): void {
    this.isFullscreen.set(document.fullscreenElement !== null);
  }

  protected syncPointerLock(): void {
    this.isPointerLocked.set(document.pointerLockElement !== null);
  }

  /* Olhar arrastando o dedo -------------------------------------------------------- */

  protected startLook(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || this.lookPointer || this.phase() !== 'playing') {
      return;
    }

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  protected moveLook(event: PointerEvent): void {
    const pointer = this.lookPointer;

    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    this.virtualInput.lookDeltaX += event.clientX - pointer.x;
    this.virtualInput.lookDeltaY += event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  protected endLook(event: PointerEvent): void {
    if (this.lookPointer?.id === event.pointerId) {
      this.lookPointer = null;
    }
  }

  /* Motor ---------------------------------------------------------------------------- */

  private async start(): Promise<void> {
    try {
      const { launchCraftGame } = await import('../../engine/launch-craft');

      this.session = this.zone.runOutsideAngular(() =>
        launchCraftGame({
          parent: this.stage().nativeElement,
          catalog: this.catalog(),
          world: this.world(),
          settings: this.engineSettings(),
          input: this.virtualInput,
          listener: (event) => this.receive(event),
        }),
      );
    } catch (error) {
      console.error('PedroCraft: o motor do jogo não pôde ser carregado.', error);
      this.errorMessage.set('Não foi possível carregar o jogo. Verifique a internet e tente de novo.');
      this.phase.set('error');
    }
  }

  /** Som toca direto, fora da zona: é o evento mais frequente e não muda nada na tela. */
  private receive(event: CraftSessionEvent): void {
    if (event.type === 'sound') {
      this.audio.play(event.cue);
      return;
    }

    this.zone.run(() => this.handle(event));
  }

  private handle(event: Exclude<CraftSessionEvent, { readonly type: 'sound' }>): void {
    switch (event.type) {
      case 'loading':
        this.loadingProgress.set(Math.round(event.progress * 100));
        return;
      case 'ready':
        this.phase.set('playing');
        this.startAutosave();
        return;
      case 'hud':
        this.hud.set(event.hud);
        return;
      case 'hint':
        this.showToast(event.text);
        return;
      case 'pickup':
        this.notifyPickup(event.item, event.count);
        return;
      case 'tool-broke':
        this.showToast(`Ops! ${this.icons().name(event.item)} quebrou. Que tal fazer outra?`);
        return;
      case 'goal-completed':
        this.siteProgress.registerChallenge('pedro-craft', true);
        this.showToast(`${event.goal.emoji} Missão cumprida: ${event.goal.title}!`);
        return;
      case 'hero-hurt':
        this.isHurt.set(true);
        this.later(HURT_VISIBLE_MS, () => this.isHurt.set(false));
        return;
      case 'open-screen':
        if (this.phase() === 'playing') {
          this.showScreen(this.session?.showScreen() ?? null);
        }
        return;
      case 'screen':
        this.updateScreen(event.view);
        return;
      case 'pause-requested':
        this.pause();
        return;
      case 'error':
        this.errorMessage.set(event.message);
        this.phase.set('error');
        return;
    }
  }

  private showScreen(view: ScreenView | null): void {
    if (view) {
      this.screen.set(view);
      this.phase.set('screen');
      this.audio.play('button');
    }
  }

  private updateScreen(view: ScreenView | null): void {
    if (view && this.phase() === 'screen') {
      this.screen.set(view);
    }
  }

  private showToast(text: string): void {
    this.toast.set(text);
    this.later(TOAST_VISIBLE_MS, () => {
      if (this.toast() === text) {
        this.toast.set(null);
      }
    });
  }

  private notifyPickup(item: string, count: number): void {
    const notice: PickupNotice = { key: ++this.pickupKey, item, count };

    this.pickups.update((list) => [notice, ...list].slice(0, MAX_PICKUPS));
    this.later(PICKUP_VISIBLE_MS, () => this.pickups.update((list) => list.filter((entry) => entry.key !== notice.key)));
  }

  private later(delayMs: number, action: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      action();
    }, delayMs);

    this.timers.add(timer);
  }

  private startAutosave(): void {
    this.saveNow();
    this.autosaveTimer = setInterval(() => this.saveNow(), AUTOSAVE_EVERY_MS);
  }

  /** Fotografa o mundo e guarda no aparelho; uma falha avisa sem interromper o jogo. */
  private saveNow(): void {
    const save = this.session?.capture();

    if (!save) {
      return;
    }

    this.worlds.save(save).catch((error: unknown) => {
      console.error('PedroCraft: o mundo não pôde ser salvo.', error);
      this.zone.run(() => this.showToast(SAVE_FAILED_MESSAGE));
    });
  }

  private teardown(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }

    if (this.autosaveTimer !== null) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    this.timers.clear();
    this.saveNow();
    this.session?.destroy();
    this.session = null;

    if (document.fullscreenElement === this.root.nativeElement) {
      void document.exitFullscreen().catch((error: unknown) =>
        console.warn('PedroCraft: não foi possível sair da tela cheia.', error),
      );
    }
  }
}

function isTouchDevice(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}
