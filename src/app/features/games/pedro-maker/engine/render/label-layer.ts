import { type PerspectiveCamera, Vector3 } from 'three';

export type LabelStyle = 'bubble' | 'hint' | 'prompt' | 'pet' | 'floating';

/** Texto preso a um ponto do mundo 3D. A tela move e mostra; quem cria decide o resto. */
export interface WorldLabel {
  readonly position: Vector3;
  visible: boolean;
  opacity: number;
  text: string;
}

interface LabelEntry {
  readonly label: WorldLabel;
  readonly element: HTMLDivElement;
  /** A etiqueta fica em cima do ponto (balão de placa) ou centrada nele. */
  readonly anchorBottom: boolean;
  renderedText: string;
}

interface FloatingText {
  readonly entry: LabelEntry;
  readonly startedAt: number;
}

const FLOATING_MS = 900;
const FLOATING_RISE = 1.25;
const FONT = '"Baloo 2", "Trebuchet MS", sans-serif';

const STYLES: Readonly<Record<LabelStyle, string>> = {
  bubble:
    'max-width:min(16rem,60vw);padding:0.35rem 0.75rem;border:3px solid #2a2350;border-radius:0.9rem;' +
    'background:#fffaf3;color:#2a2350;font-size:clamp(0.85rem,1.9vw,1.2rem);text-align:center;',
  hint: 'color:#ffffff;font-size:clamp(1rem,2.8vw,1.9rem);-webkit-text-stroke:0.4rem #2a2350;paint-order:stroke fill;text-align:center;max-width:80vw;',
  prompt:
    'padding:0.2rem 0.6rem;border:3px solid #2a2350;border-radius:0.7rem;background:#9a6cf0;color:#ffffff;' +
    'font-size:clamp(0.85rem,1.8vw,1.15rem);',
  pet: 'font-size:clamp(1.4rem,3.6vw,2.2rem);',
  floating: 'font-size:clamp(1rem,2.4vw,1.75rem);-webkit-text-stroke:0.35rem #2a2350;paint-order:stroke fill;',
};

/**
 * Textos por cima do jogo, em HTML de verdade.
 *
 * Letra desenhada dentro do 3D fica borrada no celular; aqui cada etiqueta é
 * um elemento da página, nítido em qualquer tela e lido por leitores de tela
 * quando importa. A cada quadro, a posição 3D vira posição na tela.
 */
export class LabelLayer {
  readonly element: HTMLDivElement;

  private readonly labels: LabelEntry[] = [];
  private readonly floating: FloatingText[] = [];
  private readonly projected = new Vector3();

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;';
    parent.appendChild(this.element);
  }

  create(style: LabelStyle, text: string, anchorBottom = false): WorldLabel {
    const label: WorldLabel = { position: new Vector3(), visible: false, opacity: 1, text };

    this.labels.push(this.entryFor(label, style, anchorBottom));

    return label;
  }

  /** Texto que sobe e some: "+5", "CHECKPOINT!", "ESCUDO!". */
  float(x: number, y: number, text: string, color: string, now: number): void {
    const label: WorldLabel = { position: new Vector3(x, y, 0.8), visible: true, opacity: 1, text };
    const entry = this.entryFor(label, 'floating', false);

    entry.element.style.color = color;
    this.floating.push({ entry, startedAt: now });
  }

  update(camera: PerspectiveCamera, now: number): void {
    // Mede antes de escrever: ler tamanho depois de mexer no estilo força o navegador a recalcular tudo.
    const width = this.element.clientWidth;
    const height = this.element.clientHeight;

    for (const entry of this.labels) {
      this.place(entry, camera, width, height, 0);
    }

    for (let index = this.floating.length - 1; index >= 0; index -= 1) {
      const floating = this.floating[index];
      const progress = (now - floating.startedAt) / FLOATING_MS;

      if (progress >= 1) {
        floating.entry.element.remove();
        this.floating.splice(index, 1);
        continue;
      }

      floating.entry.label.opacity = 1 - progress * progress;
      this.place(floating.entry, camera, width, height, progress * FLOATING_RISE);
    }
  }

  dispose(): void {
    this.element.remove();
  }

  private entryFor(label: WorldLabel, style: LabelStyle, anchorBottom: boolean): LabelEntry {
    const element = document.createElement('div');

    element.style.cssText =
      `position:absolute;left:0;top:0;font-family:${FONT};font-weight:800;line-height:1.15;` +
      `white-space:pre-line;will-change:transform,opacity;display:none;${STYLES[style]}`;
    element.textContent = label.text;
    this.element.appendChild(element);

    return { label, element, anchorBottom, renderedText: label.text };
  }

  private place(entry: LabelEntry, camera: PerspectiveCamera, width: number, height: number, rise: number): void {
    const { label, element } = entry;

    if (!label.visible || label.opacity <= 0.01) {
      element.style.display = 'none';
      return;
    }

    if (entry.renderedText !== label.text) {
      element.textContent = label.text;
      entry.renderedText = label.text;
    }

    this.projected.copy(label.position);
    this.projected.y += rise;
    this.projected.project(camera);

    if (this.projected.z > 1) {
      element.style.display = 'none';
      return;
    }

    const x = ((this.projected.x + 1) / 2) * width;
    const y = ((1 - this.projected.y) / 2) * height;
    const shift = entry.anchorBottom ? '-50%,-100%' : '-50%,-50%';

    element.style.display = 'block';
    element.style.opacity = label.opacity.toFixed(2);
    element.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(${shift})`;
  }
}
