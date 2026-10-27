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
  InventoryView,
} from '../../models/craft-session.model';
import { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftSettingsService } from '../../services/craft-settings.service';
import { CraftHud, type PickupNotice } from '../craft-hud/craft-hud';
import { CraftInventory, type SlotClickRequest } from '../craft-inventory/craft-inventory';
import { CraftTouchControls } from '../craft-touch-controls/craft-touch-controls';

type HostPhase = 'loading' | 'playing' | 'inventory' | 'paused' | 'error';

const TOAST_VISIBLE_MS = 2600;
const PICKUP_VISIBLE_MS = 1800;
const MAX_PICKUPS = 3;

/**
 * Um mundo do PedroCraft em tela cheia.
 *
 * Carrega o motor só quando o mundo abre, cria o jogo fora da zona do
 * Angular (60 quadros por segundo não podem disparar detecção de mudanças) e
 * traduz os eventos do motor em signals: HUD, mochila, avisos e missões. Ao
 * sair da tela, o jogo é destruído junto com o canvas.
 */
@Component({
  selector: 'app-craft-game-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftTouchControls, CraftHud, CraftInventory],
  templateUrl: './craft-game-host.html',
  styleUrl: './craft-game-host.scss',
  host: {
    '(document:visibilitychange)': 'pauseWhenHidden()',
    '(document:fullscreenchange)': 'syncFullscreen()',
    '(document:pointerlockchange)': 'syncPointerLock()',
    '(document:keydown)': 'closeInventoryWithKey($event)',
  },
})
export class CraftGameHost {
  readonly catalog = input.required<CraftCatalog>();
  readonly seed = input.required<number>();
  readonly worldName = input.required<string>();

  readonly exited = output<void>();

  private readonly zone = inject(NgZone);
  private readonly audio = inject(MakerAudioService);
  private readonly settingsService = inject(CraftSettingsService);
  private readonly siteProgress = inject(GameProgressService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly root = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private session: CraftGameSession | null = null;
  private lookPointer: { readonly id: number; x: number; y: number } | null = null;
  private pickupKey = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** Estado dos controles de toque, lido pelo motor a cada passo. */
  protected readonly virtualInput = createVirtualCraftInput();

  protected readonly phase = signal<HostPhase>('loading');
  protected readonly loadingProgress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly hud = signal<CraftHudState | null>(null);
  protected readonly inventory = signal<InventoryView | null>(null);
  protected readonly toast = signal<string | null>(null);
  protected readonly pickups = signal<readonly PickupNotice[]>([]);
  protected readonly isFullscreen = signal(false);
  protected readonly isPointerLocked = signal(false);
  protected readonly canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  protected readonly buttonSize = computed(() => this.settingsService.settings().buttonSize);
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
  }

  protected resume(): void {
    if (this.phase() !== 'paused') {
      return;
    }

    this.audio.play('button');
    this.session?.resume();
    this.phase.set('playing');
  }

  protected exit(): void {
    this.audio.play('button');
    this.exited.emit();
  }

  protected selectSlot(index: number): void {
    this.session?.selectSlot(index);
  }

  protected openInventory(): void {
    if (this.phase() !== 'playing') {
      return;
    }

    const view = this.session?.openScreen() ?? null;

    if (view) {
      this.inventory.set(view);
      this.phase.set('inventory');
      this.audio.play('button');
    }
  }

  protected clickSlot(request: SlotClickRequest): void {
    const view = this.session?.clickSlot(request.index, request.mode) ?? null;

    if (view) {
      this.inventory.set(view);
    }
  }

  protected closeInventory(): void {
    if (this.phase() !== 'inventory') {
      return;
    }

    this.session?.closeScreen();
    this.inventory.set(null);
    this.phase.set('playing');
    this.audio.play('button');
  }

  protected closeInventoryWithKey(event: KeyboardEvent): void {
    if (this.phase() === 'inventory' && (event.code === 'KeyE' || event.code === 'KeyI')) {
      this.closeInventory();
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

  protected pauseWhenHidden(): void {
    if (document.hidden) {
      this.pause();
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
          seed: this.seed(),
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
      case 'open-screen':
        this.openInventory();
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

  private teardown(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }

    this.timers.clear();
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
