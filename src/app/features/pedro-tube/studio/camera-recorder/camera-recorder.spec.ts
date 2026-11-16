import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PRESET_EFFECTS } from '../../data/tube-effects.data';
import { CameraRecorder, type CameraRecording } from './camera-recorder';

/** Gravador de mentira: cada `stop` entrega um pedaço de vídeo e avisa que parou. */
class FakeRecorder {
  static isTypeSupported(type: string): boolean {
    return type === 'video/webm';
  }

  state: 'inactive' | 'recording' = 'inactive';
  readonly mimeType = 'video/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['quadros'], { type: 'video/webm' }) });
    this.onstop?.();
  }
}

describe('CameraRecorder', () => {
  let fixture: ComponentFixture<CameraRecorder>;
  let element: HTMLElement;
  let originalRecorder: typeof MediaRecorder;
  const recordings: CameraRecording[] = [];

  function button(text: string): HTMLButtonElement | undefined {
    return [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => candidate.textContent?.includes(text));
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  beforeEach(() => {
    originalRecorder = window.MediaRecorder;
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
    recordings.length = 0;

    fixture = TestBed.createComponent(CameraRecorder);
    fixture.componentRef.setInput('effect', PRESET_EFFECTS.find((effect) => effect.id === 'amor'));
    fixture.componentInstance.recorded.subscribe((recording) => recordings.push(recording));
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = originalRecorder;
  });

  it('abre a câmera, grava com o efeito na prévia e entrega o vídeo ao parar', async () => {
    const stream = new MediaStream();
    const stopTrack = jasmine.createSpy('stop');

    spyOn(stream, 'getTracks').and.returnValue([{ stop: stopTrack } as unknown as MediaStreamTrack]);
    spyOn(navigator.mediaDevices, 'getUserMedia').and.resolveTo(stream);
    spyOn(HTMLMediaElement.prototype, 'play').and.resolveTo();

    expect(element.textContent).toContain('Abrir câmera');
    button('Abrir câmera')!.click();
    await settle();

    const video = element.querySelector<HTMLVideoElement>('video')!;

    expect(video.srcObject).toBe(stream);
    expect(element.querySelector('app-effect-stage')?.getAttribute('data-effect')).toBe('amor');

    button('Gravar')!.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('0:00 / 1:00');

    button('Parar')!.click();
    fixture.detectChanges();

    expect(recordings.length).toBe(1);
    expect(recordings[0].blob.type).toBe('video/webm');
    expect(recordings[0].blob.size).toBeGreaterThan(0);
    expect(button('Gravar')).withContext('dá para gravar de novo').toBeDefined();

    fixture.destroy();
    expect(stopTrack).withContext('a câmera desliga ao sair').toHaveBeenCalled();
  });

  it('sem câmera liberada, explica o que fazer', async () => {
    spyOn(navigator.mediaDevices, 'getUserMedia').and.rejectWith(new DOMException('negado', 'NotAllowedError'));

    button('Abrir câmera')!.click();
    await settle();
    await settle();

    expect(element.textContent).toContain('Peça para um adulto liberar a câmera');
    expect(button('Abrir câmera')).withContext('pode tentar de novo').toBeDefined();
  });
});
