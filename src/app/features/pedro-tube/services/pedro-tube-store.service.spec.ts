import { TestBed } from '@angular/core/testing';

import { NEUTRAL_FILTER, PRESET_EFFECTS } from '../data/tube-effects.data';
import { PEDRO_CHANNEL_ID, SEED_CHANNELS, SEED_VIDEOS } from '../data/tube-seed.data';
import type { TubeScene, TubeVideoDraft } from '../models/tube.model';
import { PEDRO_TUBE_STORAGE_KEY, PedroTubeStore } from './pedro-tube-store.service';
import { TubeMediaService } from './tube-media.service';

const SCENE: TubeScene = { emoji: '🦖', text: 'Rawr!', background: '#12b886', motion: 'pular', seconds: 2 };

const ANIMATION: TubeVideoDraft = {
  channelId: PEDRO_CHANNEL_ID,
  title: 'Meu dinossauro',
  description: 'Um vídeo de teste',
  source: 'animacao',
  scenes: [SCENE, { ...SCENE, emoji: '🚀', seconds: 3 }],
  effectId: 'festa',
};

/** Banco de arquivos de mentira: guarda os blobs num mapa. */
class FakeMediaService {
  readonly saved = new Map<string, Blob>();
  private next = 1;

  async save(blob: Blob): Promise<string> {
    const id = `midia-${this.next++}`;

    this.saved.set(id, blob);

    return id;
  }

  async remove(id: string): Promise<void> {
    this.saved.delete(id);
  }
}

describe('PedroTubeStore', () => {
  let media: FakeMediaService;

  function createStore(): PedroTubeStore {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: TubeMediaService, useValue: media }] });

    return TestBed.inject(PedroTubeStore);
  }

  beforeEach(() => {
    localStorage.removeItem(PEDRO_TUBE_STORAGE_KEY);
    media = new FakeMediaService();
  });

  afterEach(() => localStorage.removeItem(PEDRO_TUBE_STORAGE_KEY));

  it('já começa com os canais, os vídeos e os efeitos prontos', () => {
    const store = createStore();

    expect(store.channels().map((channel) => channel.id)).toEqual(SEED_CHANNELS.map((channel) => channel.id));
    expect(store.videos().length).toBe(SEED_VIDEOS.length);
    expect(store.videos()[0].id).withContext('o mais novo primeiro').toBe('video-como-fazer-videos');
    expect(store.effects().length).toBe(PRESET_EFFECTS.length);
    expect(store.effect('nao-existe').id).withContext('efeito sumido vira o normal').toBe('normal');
    expect(store.isOwnChannel(PEDRO_CHANNEL_ID)).toBeFalse();
  });

  it('cria um canal com @ próprio, e ele continua lá depois de abrir de novo', () => {
    const store = createStore();
    const channel = store.createChannel({ name: 'Pedro Henrique', avatar: '🦖', color: '#12b886', description: '  Rawr  ' });

    expect(channel?.handle).withContext('o @pedrohenrique já é do canal oficial').toBe('pedrohenrique2');
    expect(channel?.description).toBe('Rawr');
    expect(store.isOwnChannel(channel!.id)).toBeTrue();
    expect(store.createChannel({ name: '', avatar: '🦖', color: '#12b886', description: '' })).toBeNull();

    expect(createStore().channel(channel!.id)?.name).toBe('Pedro Henrique');
  });

  it('publica uma animação com o tempo somado das cenas e o efeito escolhido', async () => {
    const store = createStore();
    const video = await store.publishVideo(ANIMATION);

    expect(video.durationSeconds).toBe(5);
    expect(video.effectId).toBe('festa');
    expect(video.mediaId).toBeNull();
    expect(store.videos()[0].id).withContext('o vídeo novo aparece em primeiro').toBe(video.id);
    expect(store.videosOf(PEDRO_CHANNEL_ID).some((candidate) => candidate.id === video.id)).toBeTrue();
  });

  it('recusa vídeo sem título, sem cena, sem canal ou sem arquivo, com mensagem para a criança', async () => {
    const store = createStore();

    await expectAsync(store.publishVideo({ ...ANIMATION, title: '  ' })).toBeRejectedWithError('Dê um título para o vídeo.');
    await expectAsync(store.publishVideo({ ...ANIMATION, scenes: [] })).toBeRejectedWithError(/pelo menos uma cena/);
    await expectAsync(store.publishVideo({ ...ANIMATION, channelId: 'sumiu' })).toBeRejectedWithError(/Escolha um canal/);
    await expectAsync(store.publishVideo({ ...ANIMATION, source: 'arquivo' })).toBeRejectedWithError(/Escolha ou grave/);
    expect(store.videos().length).toBe(SEED_VIDEOS.length);
  });

  it('vídeo enviado guarda o arquivo no banco e apaga junto com o vídeo', async () => {
    const store = createStore();
    const blob = new Blob(['video'], { type: 'video/webm' });
    const video = await store.publishVideo(
      { ...ANIMATION, source: 'arquivo', effectId: 'efeito-que-nao-existe' },
      { blob, durationSeconds: 7, posterDataUrl: null },
    );

    expect(video.mediaId).not.toBeNull();
    expect(video.scenes).toEqual([]);
    expect(video.durationSeconds).toBe(7);
    expect(video.effectId).toBe('normal');
    expect(media.saved.get(video.mediaId!)).toBe(blob);

    expect(await store.deleteVideo(video.id)).toBeTrue();
    expect(media.saved.size).toBe(0);
    expect(store.video(video.id)).toBeUndefined();
  });

  it('inscrição, AMO e visualizações vão e voltam, e ficam guardados', () => {
    const store = createStore();

    expect(store.toggleSubscription(PEDRO_CHANNEL_ID)).toBeTrue();
    expect(store.toggleLike('video-como-fazer-videos')).toBeTrue();
    store.countView('video-como-fazer-videos');
    store.countView('video-como-fazer-videos');
    store.countView('video-que-nao-existe');

    const reopened = createStore();

    expect(reopened.isSubscribed(PEDRO_CHANNEL_ID)).toBeTrue();
    expect(reopened.isLiked('video-como-fazer-videos')).toBeTrue();
    expect(reopened.viewsOf('video-como-fazer-videos')).toBe(2);
    expect(reopened.viewsOf('video-que-nao-existe')).toBe(0);

    expect(reopened.toggleSubscription(PEDRO_CHANNEL_ID)).toBeFalse();
    expect(reopened.toggleLike('video-como-fazer-videos')).toBeFalse();
  });

  it('apagar o canal leva junto os vídeos e os arquivos dele; os canais prontos não saem', async () => {
    const store = createStore();
    const channel = store.createChannel({ name: 'Dino', avatar: '🦖', color: '#12b886', description: '' })!;
    const video = await store.publishVideo({ ...ANIMATION, channelId: channel.id, source: 'camera' }, {
      blob: new Blob(['x'], { type: 'video/webm' }),
      durationSeconds: 3,
      posterDataUrl: null,
    });

    store.toggleSubscription(channel.id);
    store.toggleLike(video.id);

    expect(await store.deleteChannel(PEDRO_CHANNEL_ID)).toBeFalse();
    expect(await store.deleteChannel(channel.id)).toBeTrue();
    expect(store.channel(channel.id)).toBeUndefined();
    expect(store.video(video.id)).toBeUndefined();
    expect(store.isSubscribed(channel.id)).toBeFalse();
    expect(store.isLiked(video.id)).toBeFalse();
    expect(media.saved.size).toBe(0);
  });

  it('cria e apaga efeitos; o vídeo que usava o efeito apagado volta para o normal', async () => {
    const store = createStore();
    const effect = store.createEffect({
      name: 'Turbo',
      emoji: '🔥',
      filter: { ...NEUTRAL_FILTER, brightness: 500 },
      overlay: 'fogo',
      frame: 'ouro',
      sticker: '⭐',
    })!;

    expect(effect.filter.brightness).toBe(180);
    expect(store.effects().at(-1)?.id).toBe(effect.id);

    const video = await store.publishVideo({ ...ANIMATION, effectId: effect.id });

    expect(store.effect(video.effectId).name).toBe('Turbo');
    expect(store.deleteEffect(effect.id)).toBeTrue();
    expect(store.deleteEffect('neon')).withContext('efeito pronto não sai').toBeFalse();
    expect(store.effect(video.effectId).id).toBe('normal');
  });

  it('troca o efeito só dos vídeos criados aqui', async () => {
    const store = createStore();
    const video = await store.publishVideo(ANIMATION);

    expect(store.setVideoEffect(video.id, 'gelo')).toBeTrue();
    expect(store.video(video.id)?.effectId).toBe('gelo');
    expect(store.setVideoEffect(video.id, 'nao-existe')).toBeFalse();
    expect(store.setVideoEffect('video-como-fazer-videos', 'gelo')).withContext('vídeo pronto não muda').toBeFalse();
  });

  it('quando o aparelho está cheio, avisa e não finge que guardou', () => {
    const store = createStore();

    spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('cheio', 'QuotaExceededError'));

    expect(store.createChannel({ name: 'Dino', avatar: '🦖', color: '#12b886', description: '' })).toBeNull();
    expect(store.saveError()).toContain('memória do navegador está cheia');
    expect(store.ownChannels()).toEqual([]);
  });

  it('se não der para guardar o vídeo, o arquivo também não fica no banco', async () => {
    const store = createStore();

    spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('cheio', 'QuotaExceededError'));

    await expectAsync(
      store.publishVideo({ ...ANIMATION, source: 'arquivo' }, { blob: new Blob(['x'], { type: 'video/mp4' }), durationSeconds: 1, posterDataUrl: null }),
    ).toBeRejectedWithError(/memória do navegador está cheia/);
    expect(media.saved.size).withContext('o arquivo que já tinha ido para o banco sai de lá').toBe(0);
  });
});
