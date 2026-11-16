import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { PEDRO_CHANNEL_ID } from '../data/tube-seed.data';
import { PEDRO_TUBE_ROUTES } from '../pedro-tube.routes';
import { PEDRO_TUBE_STORAGE_KEY, PedroTubeStore } from '../services/pedro-tube-store.service';
import { TubeMediaService } from '../services/tube-media.service';

/** As páginas do PedroTube rodando com as rotas de verdade, sem banco de arquivos. */
describe('Páginas do PedroTube', () => {
  let harness: RouterTestingHarness;

  const page = (): HTMLElement => harness.routeNativeElement!;
  const text = (): string => page().textContent?.replace(/\s+/g, ' ') ?? '';

  function button(name: string | RegExp): HTMLButtonElement {
    const found = [...page().querySelectorAll<HTMLButtonElement>('button')].find((candidate) => {
      const label = (candidate.getAttribute('aria-label') ?? candidate.textContent ?? '').replace(/\s+/g, ' ').trim();

      return typeof name === 'string' ? label.endsWith(name) : name.test(label);
    });

    if (!found) {
      throw new Error(`Botão "${name}" não encontrado.`);
    }

    return found;
  }

  /** O botão de enviar do formulário (a aba do estúdio tem o mesmo nome). */
  function submit(): void {
    page().querySelector<HTMLButtonElement>('form.studio button[type="submit"]')!.click();
  }

  /**
   * Deixa promessas e navegações terminarem. Não dá para usar `whenStable`:
   * o player de animação tem um relógio ligado o tempo todo.
   */
  async function settle(): Promise<void> {
    for (let round = 0; round < 4; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      harness.detectChanges();
    }
  }

  async function open(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    await settle();
  }

  beforeEach(async () => {
    localStorage.removeItem(PEDRO_TUBE_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'pedro-tube', children: PEDRO_TUBE_ROUTES }]),
        { provide: TubeMediaService, useValue: { save: async () => 'midia-1', remove: async () => undefined, urlFor: async () => null } },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => localStorage.removeItem(PEDRO_TUBE_STORAGE_KEY));

  it('o início mostra a marca, os filtros e os vídeos prontos', async () => {
    await open('/pedro-tube');

    expect(page().querySelector('h1')?.textContent).toContain('PedroTube');
    expect(text()).toContain('Vídeos para você');
    expect(page().querySelectorAll('app-tube-video-card').length).toBe(4);
    expect(text()).toContain('Inscrições');
  });

  it('filtra por canal, por inscrições e pela busca', async () => {
    await open('/pedro-tube?canal=canal-pedro-games');
    expect(page().querySelectorAll('app-tube-video-card').length).toBe(2);

    await open('/pedro-tube?canal=inscricoes');
    expect(text()).toContain('Você ainda não se inscreveu');

    await open('/pedro-tube?busca=kart');
    expect(text()).toContain('Resultados para “kart”');
    expect(page().querySelectorAll('app-tube-video-card').length).toBe(1);

    await open('/pedro-tube?busca=zzz');
    expect(text()).toContain('Nenhum vídeo encontrado');
  });

  it('na página do vídeo dá para se inscrever, marcar AMO e experimentar efeitos', async () => {
    await open('/pedro-tube/assistir/video-como-fazer-videos');
    const store = TestBed.inject(PedroTubeStore);

    expect(page().querySelector('h1')?.textContent).toContain('Como fazer vídeos');
    expect(store.viewsOf('video-como-fazer-videos')).toBe(1);
    expect(page().querySelectorAll('.watch__next-list app-tube-video-card').length).toBe(3);

    button('Inscreva-se').click();
    button('AMO').click();
    harness.detectChanges();
    expect(store.isSubscribed(PEDRO_CHANNEL_ID)).toBeTrue();
    expect(store.isLiked('video-como-fazer-videos')).toBeTrue();
    expect(button('Inscrito').getAttribute('aria-pressed')).toBe('true');

    button('Gelo').click();
    harness.detectChanges();
    expect(page().querySelector('app-tube-player app-effect-stage')?.getAttribute('data-effect')).toBe('gelo');
    expect(text()).not.toContain('neste vídeo');
  });

  it('o vídeo criado aqui pode trocar de efeito e ser apagado', async () => {
    const store = TestBed.inject(PedroTubeStore);
    const video = await store.publishVideo({
      channelId: PEDRO_CHANNEL_ID,
      title: 'Teste',
      description: '',
      source: 'animacao',
      scenes: [{ emoji: '🦖', text: 'Oi', background: '#12b886', motion: 'pular', seconds: 1 }],
      effectId: 'normal',
    });

    await open(`/pedro-tube/assistir/${video.id}`);
    button('Festa').click();
    harness.detectChanges();
    button('Usar Festa neste vídeo').click();
    harness.detectChanges();
    expect(store.video(video.id)?.effectId).toBe('festa');
    expect(text()).toContain('O vídeo agora usa o efeito Festa');

    button('Apagar vídeo').click();
    harness.detectChanges();
    button('Sim, apagar').click();
    await settle();
    expect(store.video(video.id)).toBeUndefined();
    expect(TestBed.inject(Router).url).toBe(`/pedro-tube/canal/${PEDRO_CHANNEL_ID}`);
  });

  it('vídeo ou canal que não existe mostra um aviso amigável', async () => {
    await open('/pedro-tube/assistir/nao-existe');
    expect(text()).toContain('Vídeo não encontrado');

    await open('/pedro-tube/canal/nao-existe');
    expect(text()).toContain('Canal não encontrado');
  });

  it('a página do canal mostra o @, os vídeos e apaga só canal criado aqui', async () => {
    await open(`/pedro-tube/canal/${PEDRO_CHANNEL_ID}`);
    expect(text()).toContain('@pedrohenrique • 2 vídeos');
    expect(text()).not.toContain('Apagar canal');

    const store = TestBed.inject(PedroTubeStore);
    const channel = store.createChannel({ name: 'Dino', avatar: '🦖', color: '#12b886', description: 'Rawr' })!;

    await open(`/pedro-tube/canal/${channel.id}`);
    expect(text()).toContain('Nenhum vídeo ainda');
    button('Apagar canal').click();
    harness.detectChanges();
    button('Sim, apagar canal').click();
    await settle();
    expect(store.channel(channel.id)).toBeUndefined();
  });

  it('o estúdio cria um canal pelo formulário', async () => {
    await open('/pedro-tube/estudio?aba=canal');
    const input = page().querySelector<HTMLInputElement>('app-channel-creator input[type="text"]')!;

    submit();
    harness.detectChanges();
    expect(text()).toContain('Dê um nome para o canal.');

    input.value = 'Canal Novo';
    input.dispatchEvent(new Event('input'));
    button('Roxo').click();
    harness.detectChanges();
    expect(page().querySelector<HTMLElement>('.studio__banner')?.style.background).toContain('rgb(123, 82, 211)');

    submit();
    await settle();
    const created = TestBed.inject(PedroTubeStore).ownChannels()[0];

    expect(created.name).toBe('Canal Novo');
    expect(created.color).toBe('#7b52d3');
    expect(TestBed.inject(Router).url).toBe(`/pedro-tube/canal/${created.id}`);
  });

  it('o estúdio cria um efeito e publica uma animação com ele', async () => {
    await open('/pedro-tube/estudio?aba=efeito');
    const store = TestBed.inject(PedroTubeStore);
    const name = page().querySelector<HTMLInputElement>('app-effect-creator input[type="text"]')!;

    name.value = 'Turbo';
    name.dispatchEvent(new Event('input'));
    button('Fogo').click();

    const brightness = page().querySelector<HTMLInputElement>('app-effect-creator input[type="range"]')!;
    const previewMedia = (): HTMLElement => page().querySelector<HTMLElement>('.studio__preview .stage__media')!;

    brightness.value = '150';
    brightness.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(previewMedia().style.filter).toBe('brightness(150%)');

    button('Cores normais').click();
    harness.detectChanges();
    expect(previewMedia().style.filter).toBe('none');

    brightness.value = '120';
    brightness.dispatchEvent(new Event('input'));
    button('Salvar efeito').click();
    harness.detectChanges();

    const effect = store.customEffects()[0];

    expect(effect.overlay).toBe('fogo');
    expect(effect.filter.brightness).toBe(120);
    expect(text()).toContain('Efeito Turbo salvo!');

    await open(`/pedro-tube/estudio?aba=video&efeito=${effect.id}&canal=${PEDRO_CHANNEL_ID}`);
    expect(button('Turbo').getAttribute('aria-pressed')).toBe('true');

    button('Publicar vídeo').click();
    await settle();
    harness.detectChanges();
    expect(text()).toContain('Dê um título para o vídeo.');

    const title = page().querySelector<HTMLInputElement>('app-video-creator input[type="text"]')!;

    title.value = 'Animação de teste';
    title.dispatchEvent(new Event('input'));
    button('Adicionar cena').click();
    harness.detectChanges();
    expect(page().querySelectorAll('app-scene-editor fieldset').length).toBe(2);
    button('Tirar cena 2').click();
    harness.detectChanges();

    button('Publicar vídeo').click();
    await settle();
    const video = store.videos().find((candidate) => candidate.title === 'Animação de teste');

    expect(video?.effectId).toBe(effect.id);
    expect(video?.scenes.length).toBe(1);
    expect(TestBed.inject(Router).url).toBe(`/pedro-tube/assistir/${video?.id}`);
  });

  it('apaga um efeito criado na lista de Meus efeitos', async () => {
    const store = TestBed.inject(PedroTubeStore);

    store.createEffect({ name: 'Sumir', emoji: '👻', filter: store.effect('normal').filter, overlay: 'bolhas', frame: 'nenhuma', sticker: '' });
    await open('/pedro-tube/estudio?aba=efeito');

    button('Apagar efeito Sumir').click();
    harness.detectChanges();

    expect(store.customEffects()).toEqual([]);
    expect(text()).toContain('Efeito Sumir apagado.');
  });
});
